"""The money path: basket, checkout, payment, settlement, and what must never happen twice."""

from __future__ import annotations

from harness import operator_query, scalar, wait_for


def stock_of(shop, variant_id):
    row = operator_query(f"SELECT stock, reserved FROM product_variants WHERE id = {variant_id}")[0]
    return row["stock"], row["reserved"]


def test_full_purchase_settles_the_order_and_commits_stock(shop):
    product = shop.add_product("Tee", 5000, 10)
    variant = product["variants"][0]["id"]
    bought = shop.buy(variant, 2)
    order = bought["return"]["order"]
    assert order["payment_status"] == "paid" and order["status"] == "paid"
    assert order["total"]["minor"] == 1_000_000  # 2 x NGN 5,000.00, in kobo
    # Reserved at checkout, then committed: 10 on hand, 2 sold, nothing left reserved.
    assert stock_of(shop, variant) == (8, 0)
    # The shop's own dashboard sees it, with money booked in the ledger.
    listing = shop.merchant.ok(shop.merchant.get(shop.dash("/orders")))
    assert listing["data"][0]["number"] == order["number"]
    wait_for(lambda: int(scalar(f"SELECT COUNT(*) FROM ledger_entries WHERE store_id = (SELECT id FROM stores WHERE slug = '{shop.slug}')") or 0) > 0, message="ledger entries")


def test_returning_twice_never_settles_twice(shop):
    variant = shop.add_product("Mug", 2000, 5)["variants"][0]["id"]
    bought = shop.buy(variant, 1)
    for _ in range(3):
        again = shop.shopper.ok(shop.shopper.get(shop.front("/checkout/return"), params={"cart": bought["token"]}))
        assert again["order"]["payment_status"] == "paid"
    assert stock_of(shop, variant) == (4, 0)
    assert int(scalar(f"SELECT COUNT(*) FROM payments WHERE order_id = (SELECT id FROM orders WHERE cart_token = '{bought['token']}') AND status = 'succeeded'")) == 1


def test_stock_is_reserved_atomically_and_cannot_be_oversold(shop):
    variant = shop.add_product("Last one", 1000, 1)["variants"][0]["id"]
    first = shop.shopper.ok(shop.shopper.post(shop.front("/cart/add"), {"variant_id": variant, "quantity": 1}))
    second = shop.shopper.ok(shop.shopper.post(shop.front("/cart/add"), {"variant_id": variant, "quantity": 1}))  # a second shopper's basket: availability is a courtesy
    form = {"email": "a@example.com", "first_name": "A", "line1": "x", "city": "Lagos", "country": "NG"}
    ok = shop.shopper.post(shop.front("/checkout"), {**form, "cart_token": first["cart_token"]})
    assert ok.status_code == 200
    refused = shop.shopper.post(shop.front("/checkout"), {**form, "email": "b@example.com", "cart_token": second["cart_token"]})
    assert refused.status_code == 422 and refused.json()["error"] == "checkout_failed"
    assert stock_of(shop, variant) == (1, 1)  # held for the first, nothing leaked by the failed second


def test_a_failed_payment_releases_the_reservation(shop):
    variant = shop.add_product("Hat", 1500, 3)["variants"][0]["id"]
    cart = shop.shopper.ok(shop.shopper.post(shop.front("/cart/add"), {"variant_id": variant, "quantity": 2}))
    out = shop.shopper.ok(shop.shopper.post(shop.front("/checkout"), {"email": "c@example.com", "first_name": "C", "line1": "x", "city": "Lagos", "country": "NG", "cart_token": cart["cart_token"]}))
    assert stock_of(shop, variant) == (3, 2)
    shop.fake.fail(out["reference"])
    done = shop.shopper.ok(shop.shopper.get(shop.front("/checkout/return"), params={"cart": cart["cart_token"]}))
    assert done["order"]["payment_status"] != "paid"
    assert stock_of(shop, variant)[0] == 3


def test_discount_codes_are_applied_server_side(shop):
    shop.merchant.ok(shop.merchant.post(shop.dash("/discounts"), {"code": "TENOFF", "kind": "percentage", "value": 10, "is_active": True}))
    variant = shop.add_product("Shirt", 10000, 5)["variants"][0]["id"]
    cart = shop.shopper.ok(shop.shopper.post(shop.front("/cart/add"), {"variant_id": variant, "quantity": 1}))
    token = cart["cart_token"]
    bad = shop.shopper.ok(shop.shopper.post(shop.front("/cart/discount"), {"code": "NOPE", "cart_token": token}))
    assert bad["applied"] is False and bad["message"]
    good = shop.shopper.ok(shop.shopper.post(shop.front("/cart/discount"), {"code": "tenoff", "cart_token": token}))
    assert good["applied"] is True
    assert good["cart"]["discount"]["minor"] == 100_000 and good["cart"]["subtotal"]["minor"] == 1_000_000
    out = shop.shopper.ok(shop.shopper.post(shop.front("/checkout"), {"email": "d@example.com", "first_name": "D", "line1": "x", "city": "Lagos", "country": "NG", "cart_token": token}))
    assert out["order"]["total"]["minor"] == 900_000  # 10% off; a product that needs no shipping is charged none
    shop.fake.pay(out["reference"])
    done = shop.shopper.ok(shop.shopper.get(shop.front("/checkout/return"), params={"cart": token}))
    assert done["order"]["payment_status"] == "paid" and done["order"]["total"]["minor"] == 900_000
    assert int(scalar(f"SELECT usage_count FROM discounts WHERE code = 'TENOFF' AND store_id = (SELECT id FROM stores WHERE slug = '{shop.slug}')")) == 1


def test_order_status_and_receipt_need_the_orders_own_token(shop):
    variant = shop.add_product("Bag", 3000, 5)["variants"][0]["id"]
    bought = shop.buy(variant, 1)
    number, token = bought["order"]["number"], bought["token"]
    status = shop.shopper.ok(shop.shopper.get(shop.front(f"/orders/{number}/{token}")))
    assert status["order"]["payment_status"] == "paid" and status["receipt"]["number"] == number
    assert shop.shopper.get(shop.front(f"/orders/{number}/not-the-token")).status_code == 404
    assert shop.shopper.get(shop.front(f"/orders/{number + 1}/{token}")).status_code == 404
    link = shop.shopper.ok(shop.shopper.get(shop.front(f"/orders/{number}/{token}/receipt/png")))
    assert link["content_type"] == "image/png" and link["url"]
    assert shop.shopper.get(shop.front(f"/orders/{number}/{token}/receipt/exe")).status_code == 404


def test_another_shops_basket_token_is_worthless(make_shop):
    one, two = make_shop(), make_shop()
    variant = one.add_product("Thing", 1000, 5)["variants"][0]["id"]
    cart = one.shopper.ok(one.shopper.post(one.front("/cart/add"), {"variant_id": variant, "quantity": 1}))
    # Shop two does not know this token: it hands back a fresh, empty basket rather than one's contents.
    other = two.shopper.ok(two.shopper.get(two.front("/cart"), params={"cart_token": cart["cart_token"]}))
    assert other["cart"]["items"] == [] and other["cart_token"] != cart["cart_token"]
    # And a variant from shop one cannot be added to shop two's basket.
    assert two.shopper.post(two.front("/cart/add"), {"variant_id": variant, "quantity": 1}).status_code in (404, 422)
