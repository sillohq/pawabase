"""Point of sale and the help desk."""

from __future__ import annotations

import secrets

from harness import operator_query, scalar, wait_for


# ── POS ──────────────────────────────────────────────────────────────────

def test_a_cash_sale_gives_change_decrements_stock_and_books_the_ledger(shop):
    m = shop.merchant
    variant = shop.add_product("Counter item", 2500, 8)["variants"][0]["id"]
    device = m.ok(m.post(shop.dash("/pos/config/device"), {"label": "Till 1"}))
    session = m.ok(m.post(shop.dash("/pos/sessions/open"), {"device_id": device["id"], "opening_float": 100_000}))
    sale = m.ok(m.post(shop.dash("/pos/sale"), {"items": [{"variant_id": variant, "quantity": 2}], "payment_method": "cash", "amount_tendered": 600_000, "session_id": session["id"]}))
    assert sale["total_minor"] == 500_000 and sale["change_minor"] == 100_000
    assert scalar(f"SELECT stock FROM product_variants WHERE id = {variant}") == 6
    order = operator_query(f"SELECT source, payment_status, pos_session_id FROM orders WHERE id = {sale['order_id']}")[0]
    assert order["source"] == "pos" and order["payment_status"] == "paid" and order["pos_session_id"] == session["id"]
    wait_for(lambda: int(scalar(f"SELECT COUNT(*) FROM ledger_entries WHERE order_id = {sale['order_id']}") or 0) > 0, message="pos ledger entry")


def test_the_terminal_never_trusts_a_price_from_the_client(shop):
    m = shop.merchant
    variant = shop.add_product("Priced", 2500, 3)["variants"][0]["id"]
    sale = m.ok(m.post(shop.dash("/pos/sale"), {"items": [{"variant_id": variant, "quantity": 1, "price_minor": 1, "unit_price_minor": 1}], "payment_method": "cash", "amount_tendered": 250_000}))
    assert sale["total_minor"] == 250_000


def test_cash_short_of_the_total_is_refused_and_leaves_no_paid_order(shop):
    m = shop.merchant
    variant = shop.add_product("Short", 2500, 3)["variants"][0]["id"]
    refused = m.post(shop.dash("/pos/sale"), {"items": [{"variant_id": variant, "quantity": 1}], "payment_method": "cash", "amount_tendered": 100})
    assert refused.status_code == 422
    assert int(scalar(f"SELECT COUNT(*) FROM orders WHERE source = 'pos' AND payment_status = 'paid' AND store_id = (SELECT id FROM stores WHERE slug = '{shop.slug}')")) == 0


def test_closing_a_session_reports_expected_cash_and_variance(shop):
    m = shop.merchant
    variant = shop.add_product("EOD", 1000, 10)["variants"][0]["id"]
    session = m.ok(m.post(shop.dash("/pos/sessions/open"), {"opening_float": 50_000}))
    m.ok(m.post(shop.dash("/pos/sale"), {"items": [{"variant_id": variant, "quantity": 3}], "payment_method": "cash", "amount_tendered": 300_000, "session_id": session["id"]}))
    closed = m.ok(m.post(shop.dash(f"/pos/sessions/{session['id']}/close"), {"closing_count": 340_000, "note": "short a note"}))
    assert closed["expected_cash"]["minor"] == 350_000 and closed["variance_minor"] == -10_000 and closed["order_count"] == 1
    report = m.ok(m.get(shop.dash(f"/pos/sessions/{session['id']}")))
    assert report["items"][0]["quantity_sold"] == 3
    assert m.post(shop.dash(f"/pos/sessions/{session['id']}/close"), {"closing_count": 0}).status_code == 422  # already closed


def test_a_device_cannot_run_two_sessions_at_once(shop):
    m = shop.merchant
    device = m.ok(m.post(shop.dash("/pos/config/device"), {"label": "Till 2"}))
    m.ok(m.post(shop.dash("/pos/sessions/open"), {"device_id": device["id"]}))
    assert m.post(shop.dash("/pos/sessions/open"), {"device_id": device["id"]}).status_code == 422


def test_pos_search_and_terminal_payload(shop):
    m = shop.merchant
    shop.add_product("Searchable Widget", 1000, 3, sku="WID-1")
    found = m.ok(m.get(shop.dash("/pos/search"), params={"q": "widget"}))
    assert any(r["product_title"] == "Searchable Widget" for r in found["results"])
    assert m.ok(m.get(shop.dash("/pos/search"), params={"q": "WID-1"}))["results"]
    terminal = m.ok(m.get(shop.dash("/pos/terminal")))
    assert terminal["store"]["slug"] == shop.slug and terminal["products"]


def test_a_pos_device_domain_cannot_collide_with_a_storefront_subdomain(shop):
    m = shop.merchant
    refused = m.post(shop.dash("/pos/config/device"), {"label": "Bad", "pos_domain": f"x.{'shop.localhost:3000'}"})
    assert refused.status_code == 422
    host = f"till-{secrets.token_hex(4)}.example.com"
    ok = m.ok(m.post(shop.dash("/pos/config/device"), {"label": "Counter", "pos_domain": f"https://{host}/"}))
    assert ok["pos_domain"] == host and ok["pos_domain_status"] == "pending"
    again = m.post(shop.dash("/pos/config/device"), {"label": "Counter 2", "pos_domain": host})
    assert again.status_code == 422


def test_pos_permissions_are_enforced(shop):
    from harness import signup

    owner = shop.merchant
    agent, who = signup()
    owner.ok(owner.post(shop.dash("/team/invitations"), {"email": who["email"], "role": "marketing"}))
    agent.ok(agent.post("/account/invitations/accept", {"token": scalar(f"SELECT token FROM invitations WHERE email = '{who['email']}'")}))
    assert agent.get(shop.dash("/pos")).status_code == 403
    assert agent.post(shop.dash("/pos/sale"), {"items": []}).status_code == 403


# ── help desk ────────────────────────────────────────────────────────────

def test_the_help_desk_is_closed_until_the_merchant_opens_it(shop):
    refused = shop.shopper.post(shop.front("/help/tickets"), {"email": "a@example.com", "message": "hi"})
    assert refused.status_code == 404
    shop.merchant.ok(shop.merchant.post(shop.dash("/settings/help-desk"), {"help_desk_enabled": True, "help_desk_greeting": "Ask us"}))
    assert shop.shopper.post(shop.front("/help/tickets"), {"email": "a@example.com", "message": "hi"}).status_code == 200


def test_a_ticket_from_open_to_answered_to_reopened_to_closed(shop):
    m = shop.merchant
    m.ok(m.post(shop.dash("/settings/help-desk"), {"help_desk_enabled": True}))
    opened = shop.shopper.ok(shop.shopper.post(shop.front("/help/tickets"), {"name": "Ada", "email": "ada@example.com", "message": "Where is my order?\nIt was due Monday.", "opt_in_email": True}))
    token, tid = opened["ticket"]["token"], opened["ticket"]["id"]
    assert opened["ticket"]["status"] == "open" and opened["ticket"]["subject"] == "Where is my order?" and opened["channel"] == f"help:ticket:{token}"
    inbox = m.ok(m.get(shop.dash("/support")))
    assert inbox["counts"]["open"] == 1 and inbox["data"][0]["id"] == tid
    reply = m.ok(m.post(shop.dash(f"/support/{tid}/reply"), {"message": "On its way."}))
    assert reply["message"]["from_staff"] is True
    thread = shop.shopper.ok(shop.shopper.get(shop.front(f"/help/tickets/{token}")))
    assert thread["ticket"]["status"] == "answered" and [x["from_staff"] for x in thread["messages"]] == [False, True]
    wait_for(lambda: scalar(f"SELECT COUNT(*) FROM notifications WHERE kind = 'help.ticket' AND store_id = (SELECT id FROM stores WHERE slug = '{shop.slug}')"), message="staff notification")
    again = shop.shopper.ok(shop.shopper.post(shop.front(f"/help/tickets/{token}/reply"), {"message": "Thanks, but still nothing."}))
    assert again["ticket"]["status"] == "open"  # a follow-up always reopens
    m.ok(m.post(shop.dash(f"/support/{tid}/close")))
    assert m.ok(m.get(shop.dash(f"/support/{tid}")))["ticket"]["status"] == "closed"


def test_a_ticket_token_opens_only_its_own_ticket_in_its_own_shop(make_shop):
    one, two = make_shop(), make_shop()
    one.merchant.ok(one.merchant.post(one.dash("/settings/help-desk"), {"help_desk_enabled": True}))
    opened = one.shopper.ok(one.shopper.post(one.front("/help/tickets"), {"email": "a@example.com", "message": "private question"}))
    token = opened["ticket"]["token"]
    assert two.shopper.get(two.front(f"/help/tickets/{token}")).status_code == 404
    assert one.shopper.get(one.front("/help/tickets/not-a-token")).status_code == 404


def test_the_staff_channel_secret_goes_only_to_members_who_may_read_the_inbox(shop):
    from harness import signup

    m = shop.merchant
    channel = m.ok(m.get(shop.dash("/support/channel")))
    assert channel["channel"].startswith("help:staff:") and "message" in channel["events"]
    agent, who = signup()
    m.ok(m.post(shop.dash("/team/invitations"), {"email": who["email"], "role": "marketing"}))
    agent.ok(agent.post("/account/invitations/accept", {"token": scalar(f"SELECT token FROM invitations WHERE email = '{who['email']}'")}))
    assert agent.get(shop.dash("/support/channel")).status_code == 403
    assert agent.get(shop.dash("/support")).status_code == 403


def test_replying_needs_the_manage_permission_not_just_read(shop):
    from harness import signup

    m = shop.merchant
    m.ok(m.post(shop.dash("/settings/help-desk"), {"help_desk_enabled": True}))
    opened = shop.shopper.ok(shop.shopper.post(shop.front("/help/tickets"), {"email": "b@example.com", "message": "question"}))
    agent, who = signup()
    m.ok(m.post(shop.dash("/team/invitations"), {"email": who["email"], "role": "support"}))
    agent.ok(agent.post("/account/invitations/accept", {"token": scalar(f"SELECT token FROM invitations WHERE email = '{who['email']}'")}))
    member = next(x for x in m.ok(m.get(shop.dash("/team")))["members"] if x.get("email") == who["email"])
    m.ok(m.patch(shop.dash(f"/team/{member['id']}"), {"denied_permissions": ["support.manage"]}))
    tid = opened["ticket"]["id"]
    assert agent.get(shop.dash(f"/support/{tid}")).status_code == 200
    assert agent.post(shop.dash(f"/support/{tid}/reply"), {"message": "x"}).status_code == 403
    assert agent.post(shop.dash(f"/support/{tid}/close")).status_code == 403
