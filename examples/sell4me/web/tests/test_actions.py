"""Form posts and JSON fetches: forwarded to Pawabase as the signed-in merchant, answered the way Inertia expects (flash and redirect, or JSON)."""

from __future__ import annotations

import io

import pytest
from browser import Browser, Redirected


def flash_of(browser: Browser, path: str = "/") -> dict:
    return browser.props(path)[1]["flash"]


def test_creating_and_editing_a_product_redirects_with_a_flash(merchant):
    b = merchant.browser
    created = b.post("/products", {"title": "Wool hat", "price": "35.00", "stock": 12, "status": "active"})
    assert created.status_code == 409 and created.headers["x-inertia-location"].startswith("/products/")
    product_id = int(created.headers["x-inertia-location"].rsplit("/", 1)[1])
    assert "Product created." in str(flash_of(b, f"/products/{product_id}"))
    saved = b.post(f"/products/{product_id}", {"vendor": "Acme"})
    assert saved.status_code in (302, 303)
    assert b.props(f"/products/{product_id}")[1]["product"]["vendor"] == "Acme"
    archived = b.post(f"/products/{product_id}/archive", {})
    assert archived.status_code == 409 and archived.headers["x-inertia-location"] == "/products"


def test_a_rejected_form_comes_back_with_field_errors(merchant):
    b = merchant.browser
    refused = b.post("/products", {"title": ""})
    assert refused.status_code in (302, 303)
    errors = b.props("/products/new")[1]["errors"]
    assert errors.get("title") == "A product needs a title."


def test_order_actions(merchant):
    shopper = merchant.shopper()
    _, listing = shopper.props("/products")
    variant = shopper.props(f"/products/{listing['products'][0]['slug']}")[1]["product"]["variants"][0]["id"]
    shopper.post("/cart/add", {"variant_id": variant, "quantity": 1})
    shopper.post("/checkout", {"email": "act@example.com", "first_name": "A", "line1": "1", "city": "Lagos", "country": "NG"})
    merchant.fake.pay(list(merchant.fake.charges)[-1])
    shopper.props("/checkout/return", cart=shopper.props("/cart")[1]["cart"]["token"])
    order = merchant.browser.props("/orders", q="act@example.com")[1]["orders"][0]
    b = merchant.browser
    assert b.post(f"/orders/{order['id']}/note", {"note": "Gift wrap"}).status_code in (302, 303)
    assert b.props(f"/orders/{order['id']}")[1]["order"]["note"] == "Gift wrap"
    assert b.post(f"/orders/{order['id']}/fulfil", {"tracking_number": "TRK1", "carrier": "DHL"}).status_code in (302, 303)
    assert b.props(f"/orders/{order['id']}")[1]["order"]["fulfilment_status"] == "fulfilled"
    # Not allowed twice: an error flash, not a crash.
    again = b.post(f"/orders/{order['id']}/fulfil", {})
    assert again.status_code in (302, 303)


def test_settings_and_validation(merchant):
    b = merchant.browser
    assert b.post("/settings", {"legal_name": "Acme Ltd", "city": "Lagos"}).status_code in (302, 303)
    assert b.props("/settings")[1]["store"]["legal_name"] == "Acme Ltd"
    b.post("/settings", {"email": "not-an-email"})
    assert b.props("/settings")[1]["errors"].get("email")


def test_json_fetches_pass_through(merchant):
    b = merchant.browser
    found = b.http.get("/pos/search", params={"q": "linen"}, headers={"Accept": "application/json"}).json()
    assert any(r["product_title"] == "Linen shirt" for r in found["results"])
    page = b.post("/storefront/pages", {"title": "About", "kind": "page"})
    page_id = int(page.headers["x-inertia-location"].rsplit("/", 1)[1])
    block = b.post("/storefront/blocks", {"type": "heading"}, inertia=False).json()["block"]
    saved = b.post(f"/storefront/pages/{page_id}/save", {"tree": [block]}, inertia=False)
    assert saved.status_code == 200 and saved.json()["saved"] is True and saved.json()["blocks"] >= 1
    published = b.post(f"/storefront/pages/{page_id}/publish", {})
    assert published.status_code in (302, 303)
    assert merchant.shopper().props("/pages/about")[0] == "shop/Built"


def test_an_image_upload_is_converted_for_the_platform(merchant):
    from PIL import Image

    b = merchant.browser
    product_id = int(b.post("/products", {"title": "Pictured", "price": "1.00", "stock": 1, "status": "active"}).headers["x-inertia-location"].rsplit("/", 1)[1])
    buffer = io.BytesIO()
    Image.new("RGB", (40, 30), (200, 80, 40)).save(buffer, "PNG")
    if not b.xsrf():
        b.http.get("/login")
    response = b.http.post(f"/products/{product_id}/images", files={"file": ("tee.png", buffer.getvalue(), "image/png")}, headers={"X-XSRF-TOKEN": b.xsrf(), "Accept": "application/json"})
    assert response.status_code == 200, response.text
    image = response.json()
    url = image.get("url") or image["image"]["url"]
    assert url.startswith("/storage/v1/object/media/")
    served = b.http.get(url)  # the storage proxy: the browser never talks to the platform for this
    assert served.status_code == 200 and served.content[:4] == b"\x89PNG"
    assert b.http.get("/storage/v1/buckets").status_code == 404  # only object reads are proxied


def test_team_invitations_and_roles(merchant, web, fake):
    from harness import signup

    b = merchant.browser
    agent, who = signup(password="correct horse battery 9")
    assert b.post("/settings/team/invite", {"email": who["email"], "role": "support"}).status_code in (302, 303)
    assert any(i["email"] == who["email"] for i in b.props("/settings/team")[1]["invitations"])


def test_sign_up_sign_in_onboarding_and_sign_out(web):
    import secrets

    browser = Browser(web)
    browser.http.get("/register")
    email = f"new{secrets.token_hex(3)}@example.com"
    assert browser.post("/register", {"name": "Ada", "email": email, "password": "short"}).status_code == 409
    assert browser.props("/register")[1]["errors"].get("password")
    done = browser.post("/register", {"name": "Ada Lovelace", "email": email, "password": "correct horse battery 9", "heard_from": "friend", "signup_goal": "physical"})
    assert done.status_code == 409 and done.headers["x-inertia-location"] == "/onboarding"
    component, props = browser.props("/onboarding")
    assert component == "auth/CreateStore" and props["templates"]
    with pytest.raises(Redirected) as redirected:
        browser.props("/orders")
    assert redirected.value.location == "/onboarding"  # signed in, but no store yet
    created = browser.post("/onboarding/store", {"name": f"Fresh {secrets.token_hex(3)}", "currency": "NGN", "country": "NG"})
    assert created.status_code == 409 and created.headers["x-inertia-location"] == "/"
    assert browser.props("/")[0] == "Dashboard"
    assert browser.post("/logout", {}).headers["x-inertia-location"] == "/login"
    with pytest.raises(Redirected):
        browser.props("/orders")
    wrong = browser.post("/login", {"email": email, "password": "not the password at all"})
    assert wrong.status_code == 409 and browser.props("/login")[1]["errors"].get("email")
    assert browser.post("/login", {"email": email, "password": "correct horse battery 9"}).headers["x-inertia-location"] == "/"


def test_switching_to_a_store_you_do_not_belong_to_is_refused(merchant, web, fake):
    from harness import new_store, signup

    api, who = signup(password="correct horse battery 9")
    new_store(api, "Someone Elses " + __import__("secrets").token_hex(3), currency="NGN", country="NG")
    other_id = api.ok(api.get("/account/me"))["stores"][0]["id"]
    refused = merchant.browser.post("/switch-store", {"store_id": other_id})
    assert refused.status_code in (302, 303, 409)
    assert merchant.browser.props("/")[1]["auth"]["store"]["slug"] == merchant.slug
