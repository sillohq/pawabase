"""Every dashboard page renders, with every prop its component needs, through the real web app and the real Pawabase stack."""

from __future__ import annotations

import sys

import pytest
from browser import Redirected
from conftest import destructured_props

sys.path.insert(0, str(__import__("pathlib").Path(__file__).resolve().parents[1]))
from server.pages import PAGES  # noqa: E402

SHARED = {"auth", "notifications", "app", "errors", "flash", "theme"}
#: Pages that need a record of their own to exist (made by the test below); the rest render from the seeded store.
NEEDS = {"order_id", "product_id", "customer_id", "campaign_id", "design_id", "page_id", "session_id", "ticket_id"}


@pytest.fixture(scope="module")
def ids(merchant):
    """One of each record the parameterised pages need."""
    api, d = merchant.api, merchant.dash
    shopper = merchant.shopper()
    variant = api.ok(api.get(d + "/products"))["data"][0]
    detail = api.ok(api.get(f"{d}/products/{variant['id']}"))["product"]
    cart = shopper.http.post  # noqa: F841 - the shopper helper builds its own session below
    from harness import Api

    public = Api()
    token = public.ok(public.post(f"/shop/{merchant.slug}/cart/add", {"variant_id": detail["variants"][0]["id"], "quantity": 1}))["cart_token"]
    out = public.ok(public.post(f"/shop/{merchant.slug}/checkout", {"email": "page@example.com", "first_name": "P", "line1": "1", "city": "Lagos", "country": "NG", "cart_token": token}))
    merchant.fake.pay(out["reference"])
    public.ok(public.get(f"/shop/{merchant.slug}/checkout/return", params={"cart": token}))
    public.ok(public.post(f"/shop/{merchant.slug}/help/tickets", {"email": "q@example.com", "name": "Q", "message": "Hello?"}))
    design = api.ok(api.post(d + "/designs", {"kind": "poster", "title": "T"}))
    page = api.ok(api.get(d + "/pages"))["data"][0]
    campaign = api.ok(api.post(d + "/campaigns", {"name": "C", "kind": "promotion"}))
    session = api.ok(api.post(d + "/pos/sessions/open", {"opening_float": 0}))
    customers = api.ok(api.get(d + "/customers"))["data"]
    orders = api.ok(api.get(d + "/orders"))["data"]
    tickets = api.ok(api.get(d + "/support"))["data"]
    return {"order_id": orders[0]["id"], "product_id": detail["id"], "customer_id": customers[0]["id"], "campaign_id": campaign.get("id") or api.ok(api.get(d + "/campaigns"))["data"][0]["id"],
            "design_id": design["id"], "page_id": page["id"], "session_id": session["id"], "ticket_id": tickets[0]["id"]}


@pytest.mark.parametrize("page", PAGES, ids=lambda p: p.path)
def test_page_renders_with_every_prop_its_component_needs(merchant, ids, page):
    path = page.path.format(**ids)
    component, props = merchant.browser.props(path)
    assert component == page.component
    wanted = set(destructured_props().get(page.component) or []) - SHARED
    missing = sorted(wanted - set(props))
    assert not missing, f"{page.component} is missing {missing}"
    assert props["auth"]["store"]["slug"] == merchant.slug and props["auth"]["permissions"]


def test_signed_out_visitors_are_sent_to_login(web):
    from browser import Browser

    visitor = Browser(web)
    with pytest.raises(Redirected) as redirected:
        visitor.props("/orders")
    assert redirected.value.location == "/login"
    assert visitor.post("/orders/1/fulfil", {}).status_code in (409, 302, 303)


def test_another_stores_records_are_not_reachable_through_the_web_app(merchant, ids, web, fake):
    from conftest import Merchant
    from harness import new_store, signup

    api, who = signup(password="correct horse battery 9")
    new_store(api, f"Other {__import__('secrets').token_hex(3)}", currency="NGN", country="NG")
    other = Merchant(web, api, who["email"], api.ok(api.get("/account/me"))["stores"][0]["slug"], fake)
    response = other.browser.page(f"/orders/{ids['order_id']}")
    assert response.status_code == 404
