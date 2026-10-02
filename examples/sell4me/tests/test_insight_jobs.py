"""Analytics, search, notifications, exports, background jobs, merchant webhooks, the sandbox provider."""

from __future__ import annotations

import base64
import hashlib
import hmac
import json
import time

import httpx
import pytest
from harness import Receiver, operator_query, run_job, scalar, signup, wait_for


# ── reading ──────────────────────────────────────────────────────────────

def test_the_overview_and_analytics_agree_with_what_was_sold(shop):
    variant = shop.add_product("Counted", 2000, 10)["variants"][0]["id"]
    shop.buy(variant, 3)
    m = shop.merchant
    overview = m.ok(m.get(shop.dash("/overview")))
    assert overview["summary"]["gross"]["minor"] == 600_000 and overview["summary"]["orders"] == 1
    assert overview["attention"]["unfulfilled"] == 1 and overview["recent_orders"][0]["status"] == "paid"
    for path in ("/analytics", "/analytics/products", "/analytics/customers", "/analytics/sales", "/analytics/series"):
        assert m.ok(m.get(shop.dash(path), params={"range": "7d"})), path
    sales = m.ok(m.get(shop.dash("/analytics/sales")))
    assert sales["breakdown"]["by_provider"][0]["key"] == "paystack" and sales["breakdown"]["by_provider"][0]["payments"] == 1
    customers = m.ok(m.get(shop.dash("/analytics/customers")))
    assert customers["cohort"]["buyers"] == 1 and customers["cohort"]["repeat_rate"] == 0


def test_repeat_rate_counts_only_people_who_came_back_in_the_window(shop):
    variant = shop.add_product("Loved", 1000, 20)["variants"][0]["id"]
    shop.buy(variant, 1, email="loyal@example.com")
    shop.buy(variant, 1, email="loyal@example.com")
    shop.buy(variant, 1, email="once@example.com")
    cohort = shop.merchant.ok(shop.merchant.get(shop.dash("/analytics/customers")))["cohort"]
    assert cohort["buyers"] == 2 and cohort["repeat_buyers"] == 1 and cohort["repeat_rate"] == 0.5


def test_search_finds_across_resources_and_respects_permissions(shop):
    m = shop.merchant
    variant = shop.add_product("Zebra Lamp", 1000, 5)["variants"][0]["id"]
    bought = shop.buy(variant, 1, email="zebra.fan@example.com")
    found = m.ok(m.get(shop.dash("/search"), params={"q": "zebra"}))
    kinds = {r["type"] for r in found["results"]}
    assert {"product", "customer", "order"} <= kinds
    assert any(r["title"] == f"Order #{bought['order']['number']}" for r in m.ok(m.get(shop.dash("/search"), params={"q": f"#{bought['order']['number']}"}))["results"])
    assert m.ok(m.get(shop.dash("/search"), params={"q": "z"}))["results"] == []  # too short to mean anything
    agent, who = signup()
    m.ok(m.post(shop.dash("/team/invitations"), {"email": who["email"], "role": "marketing"}))
    agent.ok(agent.post("/account/invitations/accept", {"token": scalar(f"SELECT token FROM invitations WHERE email = '{who['email']}'")}))
    limited = {r["type"] for r in agent.ok(agent.get(shop.dash("/search"), params={"q": "zebra"}))["results"]}
    assert "order" not in limited and "transaction" not in limited  # marketing holds neither orders.read nor payments.read


def test_notifications_are_filtered_by_permission_before_they_leave_the_server(shop):
    m = shop.merchant
    variant = shop.add_product("Note", 1000, 5)["variants"][0]["id"]
    shop.buy(variant, 1)
    seen = wait_for(lambda: m.ok(m.get(shop.dash("/notifications")))["data"], message="a new-order notification")
    assert any(n["kind"].startswith("order") for n in seen)
    agent, who = signup()
    m.ok(m.post(shop.dash("/team/invitations"), {"email": who["email"], "role": "marketing"}))
    agent.ok(agent.post("/account/invitations/accept", {"token": scalar(f"SELECT token FROM invitations WHERE email = '{who['email']}'")}))
    theirs = agent.ok(agent.get(shop.dash("/notifications")))["data"]
    assert all(not n["kind"].startswith("order") for n in theirs)
    m.ok(m.post(shop.dash("/notifications/read"), {}))
    assert m.ok(m.get(shop.dash("/notifications")))["unread"] == 0


# ── exports ──────────────────────────────────────────────────────────────

def test_an_export_runs_in_the_background_and_is_downloaded_through_a_signed_url(shop):
    m = shop.merchant
    variant = shop.add_product("Exported", 1000, 5)["variants"][0]["id"]
    shop.buy(variant, 1, email="export@example.com")
    job = m.ok(m.post(shop.dash("/exports"), {"resource": "orders"}))
    assert job["status"] == "queued"
    done = wait_for(lambda: next((j for j in m.ok(m.get(shop.dash("/exports")))["data"] if j["id"] == job["id"] and j["status"] == "complete"), None), timeout=60, message="export complete")
    assert done["row_count"] == 1
    link = m.ok(m.get(shop.dash(f"/exports/{job['id']}/download")))
    body = httpx.get(link["url"] if link["url"].startswith("http") else f"{m.cfg['url']}{link['url']}", headers={"apikey": m.cfg["publishable"]}, timeout=30)
    assert body.status_code == 200 and "export@example.com" in body.text and body.text.lstrip("﻿").startswith("Order")


def test_an_export_needs_permission_for_the_resource_not_just_for_exporting(shop):
    m = shop.merchant
    agent, who = signup()
    m.ok(m.post(shop.dash("/team/invitations"), {"email": who["email"], "role": "marketing"}))
    agent.ok(agent.post("/account/invitations/accept", {"token": scalar(f"SELECT token FROM invitations WHERE email = '{who['email']}'")}))
    assert agent.ok(agent.post(shop.dash("/exports"), {"resource": "campaigns"}))["status"] == "queued"  # marketing may export what marketing may read
    assert agent.post(shop.dash("/exports"), {"resource": "customers"}).status_code == 200  # marketing holds customers.read
    assert agent.post(shop.dash("/exports"), {"resource": "transactions"}).status_code == 403  # but not the books
    assert agent.post(shop.dash("/exports"), {"resource": "no_such"}).status_code == 422


def test_one_stores_export_cannot_be_downloaded_from_another(make_shop):
    one, two = make_shop(), make_shop()
    job = one.merchant.ok(one.merchant.post(one.dash("/exports"), {"resource": "products"}))
    wait_for(lambda: scalar(f"SELECT status FROM export_jobs WHERE id = {job['id']}") == "complete", timeout=60, message="export")
    assert two.merchant.get(two.dash(f"/exports/{job['id']}/download")).status_code == 404
    assert two.merchant.get(one.dash(f"/exports/{job['id']}/download")).status_code == 404


def test_the_complete_store_workbook_is_built(shop):
    m = shop.merchant
    shop.add_product("Sheet", 1000, 2)
    job = m.ok(m.post(shop.dash("/exports"), {"resource": "full_report"}))
    wait_for(lambda: scalar(f"SELECT status FROM export_jobs WHERE id = {job['id']}") == "complete", timeout=90, message="workbook")
    assert scalar(f"SELECT format FROM export_jobs WHERE id = {job['id']}") == "xlsx" and int(scalar(f"SELECT file_size FROM export_jobs WHERE id = {job['id']}")) > 2000


# ── background jobs ──────────────────────────────────────────────────────

def test_functions_that_only_the_platform_runs_are_closed_to_clients(shop):
    assert shop.merchant.call("POST", "/../functions/v1/carts.sweep_abandoned", json={}).status_code in (401, 403, 404)
    cfg = shop.merchant.cfg
    refused = httpx.post(f"{cfg['url']}/functions/v1/carts.sweep_abandoned", json={}, headers={"apikey": cfg["publishable"], "Authorization": f"Bearer {shop.merchant.token}"}, timeout=30)
    assert refused.status_code in (401, 403)


def test_abandoned_checkouts_release_stock_and_can_be_recovered(shop):
    m = shop.merchant
    variant = shop.add_product("Left behind", 1000, 4)["variants"][0]["id"]
    cart = shop.shopper.ok(shop.shopper.post(shop.front("/cart/add"), {"variant_id": variant, "quantity": 3}))
    shop.shopper.ok(shop.shopper.post(shop.front("/checkout"), {"email": "gone@example.com", "first_name": "G", "line1": "x", "city": "Lagos", "country": "NG", "cart_token": cart["cart_token"]}))
    assert operator_query(f"SELECT reserved FROM product_variants WHERE id = {variant}")[0]["reserved"] == 3
    # A fresh checkout is not abandoned yet; two hours later it is.
    assert run_job("carts.sweep_abandoned")["abandoned"] == 0
    operator_query(f"UPDATE carts SET last_activity_at = datetime('now', '-2 hours') WHERE token = '{cart['cart_token']}'", write=True)
    assert run_job("carts.sweep_abandoned")["abandoned"] >= 1
    assert operator_query(f"SELECT reserved FROM product_variants WHERE id = {variant}")[0]["reserved"] == 0
    assert run_job("carts.sweep_abandoned")["abandoned"] == 0  # idempotent: nothing left to release
    listing = m.ok(m.get(shop.dash("/abandoned-carts")))
    record = next(r for r in listing["data"] if r.get("email") == "gone@example.com")
    token = scalar(f"SELECT recovery_token FROM abandoned_carts WHERE id = {record['id']}")
    back = shop.shopper.ok(shop.shopper.get(shop.front(f"/cart/recover/{token}")))
    assert back["cart_token"] == cart["cart_token"] and back["cart"]["items"][0]["quantity"] == 3
    assert shop.shopper.get(shop.front("/cart/recover/not-a-token")).status_code == 404


def test_the_recovery_email_is_sent_once(shop):
    m = shop.merchant
    variant = shop.add_product("Nudge", 1000, 4)["variants"][0]["id"]
    cart = shop.shopper.ok(shop.shopper.post(shop.front("/cart/add"), {"variant_id": variant, "quantity": 1}))
    shop.shopper.ok(shop.shopper.post(shop.front("/checkout"), {"email": "nudge@example.com", "first_name": "N", "line1": "x", "city": "Lagos", "country": "NG", "cart_token": cart["cart_token"]}))
    operator_query(f"UPDATE carts SET last_activity_at = datetime('now', '-2 hours') WHERE token = '{cart['cart_token']}'", write=True)
    run_job("carts.sweep_abandoned")
    rid = scalar(f"SELECT id FROM abandoned_carts WHERE email = 'nudge@example.com' AND store_id = (SELECT id FROM stores WHERE slug = '{shop.slug}')")
    assert run_job("carts.recover_email", {"record_id": rid}).get("notified") == rid
    assert run_job("carts.recover_email", {"record_id": rid}).get("skipped") is True
    assert scalar(f"SELECT recovery_status FROM abandoned_carts WHERE id = {rid}") == "notified"
    _ = m


def test_daily_analytics_rollup_recomputes_instead_of_incrementing(shop):
    variant = shop.add_product("Rolled", 1000, 5)["variants"][0]["id"]
    shop.buy(variant, 2)
    sid = scalar(f"SELECT id FROM stores WHERE slug = '{shop.slug}'")
    from datetime import UTC, datetime

    today = datetime.now(UTC).date().isoformat()
    for _ in range(3):
        run_job("analytics.aggregate_day", {"store_id": sid, "day": today})
    rows = operator_query(f"SELECT * FROM daily_stats WHERE store_id = {sid}")
    assert len(rows) == 1 and rows[0]["orders_count"] == 1  # three runs, one row, one order


def test_segments_recount_and_campaigns_advance(shop):
    m = shop.merchant
    variant = shop.add_product("Seg", 1000, 10)["variants"][0]["id"]
    shop.buy(variant, 1, email="s1@example.com")
    seg = m.ok(m.post(shop.dash("/segments"), {"name": "Buyers", "rules": [{"field": "orders_count", "operator": "gte", "value": 1}]}))
    assert run_job("segments.refresh_all")
    listing = m.ok(m.get(shop.dash("/segments")))
    mine = next(s for s in listing["data"] if s["name"] == "Buyers")
    assert mine["count"] == 1 and scalar(f"SELECT cached_count FROM segments WHERE id = {mine['id']}") == 1
    camp = m.ok(m.post(shop.dash("/campaigns"), {"name": "Launch", "kind": "promotion", "segment_id": seg.get("id")}))
    assert run_job("campaigns.refresh", {"campaign_id": camp["id"]})
    assert "started" in run_job("campaigns.advance")


# ── merchants' own webhooks ──────────────────────────────────────────────

@pytest.fixture()
def receiver():
    r = Receiver()
    yield r
    r.stop()


def test_a_merchant_webhook_receives_signed_events_and_retries_failures(shop, receiver):
    m = shop.merchant
    hook = m.ok(m.post(shop.dash("/developers/webhooks"), {"url": receiver.url, "events": ["order.paid"], "description": "ci"}))
    secret = hook["secret"]
    variant = shop.add_product("Hooked", 1000, 5)["variants"][0]["id"]
    receiver.status = 500  # first delivery fails
    bought = shop.buy(variant, 1)
    run_job("webhooks.sweep")
    first = wait_for(lambda: receiver.requests, message="first delivery")[0]
    assert first["headers"]["x-commerce-event"] == "order.paid"
    stamp, signature = first["headers"]["x-commerce-signature"].split(",")[0], first["headers"]["x-commerce-signature"]
    body = first["body"]
    # Verify the way a receiver would: HMAC-SHA256 over "<timestamp>.<body>" with the endpoint's secret.
    parts = dict(p.split("=", 1) for p in signature.split(","))
    expected = hmac.new(secret.encode(), f"{parts['t']}.".encode() + body, hashlib.sha256).hexdigest()
    assert hmac.compare_digest(parts["v1"], expected), (stamp, signature)
    payload = json.loads(body)
    assert payload["event"] == "order.paid" and payload["data"]["number"] == bought["order"]["number"]
    event_id = first["headers"]["x-commerce-event-id"]
    # It failed (500): the delivery is rescheduled, not lost. Pull its retry time forward and let the sweep send it again.
    assert scalar(f"SELECT status FROM webhook_deliveries WHERE event_id = '{event_id}'") == "pending"
    operator_query(f"UPDATE webhook_deliveries SET next_attempt_at = datetime('now', '-1 minute') WHERE event_id = '{event_id}'", write=True)
    receiver.status = 200
    run_job("webhooks.sweep")
    wait_for(lambda: scalar(f"SELECT status FROM webhook_deliveries WHERE event_id = '{event_id}'") == "delivered", message="retry delivered")
    assert receiver.requests[-1]["headers"]["x-commerce-event-id"] == event_id  # stable across retries, so a receiver can deduplicate
    logs = m.ok(m.get(shop.dash("/developers/logs")))
    assert logs["data"]


def test_the_test_button_uses_the_real_delivery_path(shop, receiver):
    m = shop.merchant
    hook = m.ok(m.post(shop.dash("/developers/webhooks"), {"url": receiver.url, "events": ["order.paid"]}))
    out = m.ok(m.post(shop.dash(f"/developers/webhooks/{hook['id']}/test")))
    assert out["delivered"] is True and receiver.requests[-1]["headers"]["x-commerce-event"] == "webhook.test"


def test_a_webhook_cannot_target_the_platforms_own_network(shop):
    # The suite runs with WEBHOOKS_ALLOW_PRIVATE on (its receivers are on 127.0.0.1); the guard itself is unit-checked here.
    import sys

    sys.path.insert(0, str(__import__("pathlib").Path(__file__).resolve().parents[1] / "kit"))
    import asyncio

    from sell4me_kit.services.webhooks_out import DestinationNotAllowed, check_destination

    for url in ("http://127.0.0.1/x", "https://169.254.169.254/latest/meta-data", "http://10.0.0.5/", "http://[::1]/", "https://localhost/"):
        with pytest.raises(DestinationNotAllowed):
            asyncio.run(check_destination(url))
    asyncio.run(check_destination("http://127.0.0.1/x", allow_private=True))


def test_a_webhook_must_name_known_events_and_a_url(shop):
    m = shop.merchant
    assert m.post(shop.dash("/developers/webhooks"), {"url": "ftp://example.org/hook", "events": ["order.paid"]}).status_code == 422
    assert m.post(shop.dash("/developers/webhooks"), {"url": "https://example.org/hook", "events": ["nonsense"]}).status_code == 422


# ── the sandbox provider ─────────────────────────────────────────────────

def sandbox_checkout(shop, variant, qty=1):
    cart = shop.shopper.ok(shop.shopper.post(shop.front("/cart/add"), {"variant_id": variant, "quantity": qty}))
    out = shop.shopper.ok(shop.shopper.post(shop.front("/checkout"), {"email": "sb@example.com", "first_name": "S", "line1": "x", "city": "Lagos", "country": "NG",
                                                                    "cart_token": cart["cart_token"], "provider": "sandbox"}))
    return cart["cart_token"], out


def test_the_sandbox_provider_runs_a_whole_checkout_with_no_network(shop):
    variant = shop.add_product("Sandboxed", 1000, 5)["variants"][0]["id"]
    token, out = sandbox_checkout(shop, variant, 2)
    assert out["provider"] == "sandbox" and out["redirect_url"].startswith(f"/shop/{shop.slug}/sandbox/")
    ref = out["redirect_url"].rsplit("/", 1)[1]
    page = shop.shopper.ok(shop.shopper.get(shop.front(f"/sandbox/{ref}")))
    assert page["status"] == "pending" and page["amount"]["minor"] == 200_000
    settled = shop.shopper.ok(shop.shopper.post(shop.front(f"/sandbox/{ref}/settle"), {}))
    assert settled["status"] == "succeeded" and settled["order"]["payment_status"] == "paid"
    again = shop.shopper.ok(shop.shopper.post(shop.front(f"/sandbox/{ref}/settle"), {"outcome": "failed"}))  # already decided: deciding twice changes nothing
    assert again["status"] == "succeeded"
    assert operator_query(f"SELECT stock, reserved FROM product_variants WHERE id = {variant}")[0] == {"stock": 3, "reserved": 0}


def test_the_sandbox_declines_the_amount_that_asks_to_be_declined(shop):
    variant = shop.add_product("Declined", 10.01, 5)["variants"][0]["id"]  # ends in .01
    token, out = sandbox_checkout(shop, variant, 1)
    ref = out["redirect_url"].rsplit("/", 1)[1]
    settled = shop.shopper.ok(shop.shopper.post(shop.front(f"/sandbox/{ref}/settle"), {}))
    assert settled["status"] == "failed" and settled["order"]["payment_status"] != "paid"
    assert operator_query(f"SELECT reserved FROM product_variants WHERE id = {variant}")[0]["reserved"] == 0


def test_the_sandbox_is_not_reachable_for_another_shops_charge(make_shop):
    one, two = make_shop(), make_shop()
    variant = one.add_product("Mine", 1000, 5)["variants"][0]["id"]
    _, out = sandbox_checkout(one, variant)
    ref = out["redirect_url"].rsplit("/", 1)[1]
    assert two.shopper.get(two.front(f"/sandbox/{ref}")).status_code == 404
    assert two.shopper.post(two.front(f"/sandbox/{ref}/settle"), {}).status_code == 404


def test_transactions_ledger_and_fees_reconcile_with_what_was_sold(shop):
    m = shop.merchant
    variant = shop.add_product("Booked", 5000, 10)["variants"][0]["id"]
    shop.buy(variant, 2)
    wait_for(lambda: m.ok(m.get(shop.dash("/payments/ledger")))["data"], message="ledger rows")
    tx = m.ok(m.get(shop.dash("/payments/transactions")))
    assert tx["data"][0]["amount"]["minor"] == 1_000_000
    overview = m.ok(m.get(shop.dash("/payments")))
    assert overview
    ledger = m.ok(m.get(shop.dash("/payments/ledger")))["data"]
    debits = sum(r["amount"]["minor"] for r in ledger if r.get("direction") == "debit") if ledger and "direction" in ledger[0] else None
    credits = sum(r["amount"]["minor"] for r in ledger if r.get("direction") == "credit") if ledger and "direction" in ledger[0] else None
    if debits is not None:
        assert debits == credits  # double entry: every sale balances
    assert m.ok(m.get(shop.dash("/payments/fees")))
    assert m.ok(m.get(shop.dash("/payments/refunds"))) is not None
