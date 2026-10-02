"""The public shop through the web app: a shopper with no account, a session for the basket, the store from the hostname."""

from __future__ import annotations

import pytest
from browser import Redirected


@pytest.fixture()
def shopper(merchant):
    return merchant.shopper()


def inertia_json(response):
    return response.json()["props"]


def test_the_hostname_decides_the_surface(merchant, web):
    from browser import Browser

    dashboard_host = Browser(web)
    with pytest.raises(Redirected):
        dashboard_host.props("/")  # the dashboard, signed out
    component, props = merchant.shopper().props("/")
    assert component == "shop/Built" and props["tree"] and props["theme"]["name"]
    assert Browser(web, host="nonexistent.shop.localhost:3000").page("/").status_code == 404


def test_catalogue_pages(merchant, shopper):
    component, props = shopper.props("/products")
    assert component == "shop/Products" and {p["title"] for p in props["products"]} >= {"Linen shirt", "Canvas tote"} and props["pagination"]["total"] >= 2
    slug = props["products"][0]["slug"]
    component, product = shopper.props(f"/products/{slug}")
    assert component == "shop/Product" and product["product"]["variants"] and product["related"] is not None
    assert shopper.props("/collections")[0] == "shop/Collections"
    assert shopper.props("/collections/summer")[0] == "shop/Collection"
    component, found = shopper.props("/search", q="linen")
    assert component == "shop/Search" and [p["title"] for p in found["products"]] == ["Linen shirt"]
    assert shopper.page("/products/no-such-product").status_code == 404
    assert "sitemap" in shopper.http.get("/robots.txt").text.lower() and "<urlset" in shopper.http.get("/sitemap.xml").text


def test_a_basket_lives_in_the_session_and_a_whole_purchase_works(merchant, shopper):
    _, listing = shopper.props("/products")
    slug = next(p["slug"] for p in listing["products"] if p["title"] == "Canvas tote")
    variant = shopper.props(f"/products/{slug}")[1]["product"]["variants"][0]["id"]
    added = shopper.post("/cart/add", {"variant_id": variant, "quantity": 2})
    assert added.status_code in (302, 303)
    component, cart = shopper.props("/cart")
    assert component == "shop/Cart" and cart["cart"]["item_count"] == 2 and cart["cart_count"] == 2
    # A different browser has a different basket.
    assert merchant.shopper().props("/cart")[1]["cart"]["item_count"] == 0
    # A bad code is an error on the field, a good one prices the basket.
    shopper.post("/cart/discount", {"code": "NOPE"})
    assert shopper.props("/cart")[1]["cart"]["discount"]["minor"] == 0
    shopper.post("/cart/discount", {"code": "WELCOME10"})
    assert shopper.props("/cart")[1]["cart"]["discount"]["minor"] == 90000  # 10% of 2 x 4,500.00, in kobo
    component, checkout = shopper.props("/checkout")
    assert component == "shop/Checkout" and checkout["shipping_options"] and checkout["providers"][0]["key"] == "paystack"
    started = shopper.post("/checkout", {"email": "buyer@example.com", "first_name": "B", "last_name": "Uyer", "line1": "1 Road", "city": "Lagos", "country": "NG"})
    assert started.status_code == 409 and started.headers["x-inertia-location"].startswith("https://checkout.paystack.test/")
    reference = list(merchant.fake.charges)[-1]
    merchant.fake.pay(reference)
    component, done = shopper.props("/checkout/return", cart=_cart_token(shopper))
    assert component == "shop/Confirmation" and done["order"]["payment_status"] == "paid" and done["receipt"]
    assert shopper.props("/cart")[1]["cart"]["item_count"] == 0  # the basket became an order
    status_url = done["order"]["status_url"]
    assert shopper.props(status_url)[0] == "shop/OrderStatus"
    receipt = shopper.http.get(status_url + "/receipt/png")
    assert receipt.status_code == 200 and receipt.headers["content-type"] == "image/png" and receipt.content[:4] == b"\x89PNG"
    assert shopper.page(status_url.rsplit("/", 1)[0] + "/wrong-token").status_code == 404


def _cart_token(shopper) -> str:
    """The basket token the web app kept for this shopper: it is what the provider's return URL carries."""
    return shopper.props("/cart")[1]["cart"]["token"]


def test_the_help_widget_round_trip(merchant, shopper):
    created = shopper.post("/help/tickets", {"email": "who@example.com", "name": "Who", "message": "Do you restock?"}, inertia=False)
    assert created.status_code == 201
    token = created.json()["ticket"]["token"]
    assert created.json()["channel"] == f"help:ticket:{token}"
    assert shopper.http.get(f"/help/tickets/{token}").json()["messages"][0]["body"] == "Do you restock?"
    replied = shopper.post(f"/help/tickets/{token}/reply", {"message": "Hello?"}, inertia=False)
    assert replied.status_code == 200 and len(replied.json()["messages"]) == 2
    component, props = shopper.props(f"/help/{token}")
    assert component == "shop/HelpTicket" and props["realtime"]["channel"] == f"help:ticket:{token}"
    assert shopper.page("/help/not-a-token").status_code == 404


def test_the_sandbox_pay_screen_settles_an_order(merchant, shopper):
    _, listing = shopper.props("/products")
    variant = shopper.props(f"/products/{listing['products'][0]['slug']}")[1]["product"]["variants"][0]["id"]
    shopper.post("/cart/add", {"variant_id": variant, "quantity": 1})
    started = shopper.post("/checkout", {"email": "sb@example.com", "first_name": "S", "line1": "1", "city": "Lagos", "country": "NG", "provider": "sandbox"})
    assert started.status_code == 409 and started.headers["x-inertia-location"].startswith("/sandbox/pay/"), shopper.props("/checkout")[1]["flash"]
    ref = started.headers["x-inertia-location"].rsplit("/", 1)[1]
    assert "Sandbox payment" in shopper.http.get(f"/sandbox/pay/{ref}").text
    settled = shopper.http.post(f"/sandbox/pay/{ref}", data={"outcome": "succeeded"}, headers={"X-XSRF-TOKEN": shopper.xsrf()})
    assert settled.status_code in (302, 303) and "/checkout/return" in settled.headers["location"]
