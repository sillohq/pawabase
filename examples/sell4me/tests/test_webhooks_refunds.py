"""Provider webhooks (exactly once), refunds, the ledger, and the marketplace payout."""

from __future__ import annotations

import httpx
from harness import config, operator_query, scalar, wait_for


def post_hook(fake, event: str, data: dict, secret: str | None = None, *, signed: bool = True):
    cfg = config()
    body, headers = fake.webhook(event, data, secret or cfg["hook_secret"])
    if not signed:
        headers["x-paystack-signature"] = "0" * 128
    return httpx.post(f"{cfg['url']}/hooks/v1/{cfg['project']}/{cfg['environment']}/paystack", content=body, headers={**headers, "apikey": cfg["publishable"]}, timeout=30)


def order_id(shop, number):
    return scalar(f"SELECT id FROM orders WHERE number = {number} AND store_id = (SELECT id FROM stores WHERE slug = '{shop.slug}')")


def test_a_webhook_with_a_bad_signature_is_refused(shop, fake):
    variant = shop.add_product("W1", 1000, 5)["variants"][0]["id"]
    out = shop.shopper.ok(shop.shopper.post(shop.front("/cart/add"), {"variant_id": variant, "quantity": 1}))
    co = shop.shopper.ok(shop.shopper.post(shop.front("/checkout"), {"email": "w@example.com", "first_name": "W", "line1": "x", "city": "Lagos", "country": "NG", "cart_token": out["cart_token"]}))
    fake.pay(co["reference"])
    assert post_hook(fake, "charge.success", fake.charge_success_event(co["reference"]), signed=False).status_code == 401
    # Nothing was settled by the forged delivery.
    assert int(scalar(f"SELECT COUNT(*) FROM payments WHERE reference = '{co['reference']}' AND status = 'succeeded'")) == 0


def test_a_signed_webhook_settles_the_order_without_the_shopper_returning(shop, fake):
    variant = shop.add_product("W2", 1000, 5)["variants"][0]["id"]
    cart = shop.shopper.ok(shop.shopper.post(shop.front("/cart/add"), {"variant_id": variant, "quantity": 1}))
    co = shop.shopper.ok(shop.shopper.post(shop.front("/checkout"), {"email": "w2@example.com", "first_name": "W", "line1": "x", "city": "Lagos", "country": "NG", "cart_token": cart["cart_token"]}))
    fake.pay(co["reference"])
    assert post_hook(fake, "charge.success", fake.charge_success_event(co["reference"])).status_code in (200, 202)
    wait_for(lambda: scalar(f"SELECT payment_status FROM orders WHERE cart_token = '{cart['cart_token']}'") == "paid", message="order paid by webhook")


def test_the_same_delivery_twice_changes_nothing(shop, fake):
    variant = shop.add_product("W3", 1000, 5)["variants"][0]["id"]
    cart = shop.shopper.ok(shop.shopper.post(shop.front("/cart/add"), {"variant_id": variant, "quantity": 2}))
    co = shop.shopper.ok(shop.shopper.post(shop.front("/checkout"), {"email": "w3@example.com", "first_name": "W", "line1": "x", "city": "Lagos", "country": "NG", "cart_token": cart["cart_token"]}))
    fake.pay(co["reference"])
    event = fake.charge_success_event(co["reference"])
    for _ in range(3):
        assert post_hook(fake, "charge.success", event).status_code in (200, 202)
    wait_for(lambda: scalar(f"SELECT payment_status FROM orders WHERE cart_token = '{cart['cart_token']}'") == "paid", message="paid")
    import time

    time.sleep(3)  # let the duplicates drain through the queue
    assert int(scalar(f"SELECT COUNT(*) FROM payments WHERE reference = '{co['reference']}' AND status = 'succeeded'")) == 1
    assert int(scalar(f"SELECT COUNT(*) FROM webhook_events WHERE event_id LIKE 'charge.success:%' AND store_id = (SELECT id FROM stores WHERE slug = '{shop.slug}')")) == 1
    assert scalar(f"SELECT stock FROM product_variants WHERE id = {variant}") == 3  # 5 - 2, once
    # One charge in the ledger, however often it was delivered.
    assert int(scalar(f"SELECT COUNT(*) FROM ledger_entries WHERE store_id = (SELECT id FROM stores WHERE slug = '{shop.slug}') AND kind = 'charge'")) == 1


def test_a_delivery_for_no_known_store_is_acknowledged_and_ignored(fake):
    response = post_hook(fake, "charge.success", {"id": 99, "reference": "someone-elses-ref", "amount": 100, "currency": "NGN", "status": "success", "metadata": {}})
    assert response.status_code in (200, 202)


def test_a_full_refund_reverses_the_sale_and_restocks(shop, fake):
    variant = shop.add_product("R1", 4000, 6)["variants"][0]["id"]
    bought = shop.buy(variant, 2)
    number = bought["order"]["number"]
    oid = order_id(shop, number)
    detail = shop.merchant.ok(shop.merchant.get(shop.dash(f"/orders/{oid}")))
    assert detail["order"]["payment_status"] == "paid"
    # Restocking follows the *lines* refunded: an amount-only refund returns money, not goods.
    line = operator_query(f"SELECT id, quantity FROM order_items WHERE order_id = {oid}")[0]
    refund = shop.merchant.ok(shop.merchant.post(shop.dash(f"/orders/{oid}/refund"), {"lines": [{"order_item_id": line["id"], "quantity": line["quantity"]}], "reason": "Customer asked", "restock": True}))
    assert refund
    assert fake.refunds and fake.refunds[-1]["amount"] == detail["order"]["total"]["minor"]
    # Paystack refunds are asynchronous: it answers `pending` and confirms by webhook.
    ref = fake.refunds[-1]
    ok = post_hook(fake, "refund.processed", {"id": ref["id"], "status": "processed", "amount": ref["amount"], "currency": "NGN", "transaction_reference": ref["transaction_reference"],
                                                "metadata": {"store": shop.slug}})
    assert ok.status_code in (200, 202)
    wait_for(lambda: scalar(f"SELECT payment_status FROM orders WHERE id = {oid}") in ("refunded", "partially_refunded"), message="order refunded")
    assert scalar(f"SELECT stock FROM product_variants WHERE id = {variant}") == 6  # restocked


def test_refunding_more_than_was_paid_is_refused(shop):
    variant = shop.add_product("R2", 1000, 3)["variants"][0]["id"]
    bought = shop.buy(variant, 1)
    oid = order_id(shop, bought["order"]["number"])
    total = shop.merchant.ok(shop.merchant.get(shop.dash(f"/orders/{oid}")))["order"]["total"]["minor"]
    too_much = shop.merchant.post(shop.dash(f"/orders/{oid}/refund"), {"amount_minor": total + 1, "reason": "x"})
    assert too_much.status_code in (409, 422)


def test_a_paid_order_triggers_a_marketplace_payout(shop, fake):
    variant = shop.add_product("P1", 10000, 3)["variants"][0]["id"]
    shop.buy(variant, 1)
    transfer = wait_for(lambda: next((t for t in fake.transfers if t["reference"].startswith("payout_")), None), message="payout transfer")
    # 95% of what settled (net of the provider's fee) goes to the merchant, the platform keeps its split.
    assert transfer["amount"] > 0
    payouts = shop.merchant.ok(shop.merchant.get(shop.dash("/payments/payouts")))
    assert payouts
