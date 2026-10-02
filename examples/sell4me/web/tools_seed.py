"""Seed a throwaway store with enough of everything to render every page (dev/test only). Prints the merchant's email, password and store slug."""
import sys, secrets
sys.path.insert(0, "../tests")
from harness import Api, new_store, signup
from fake_paystack import FakePaystack

fake = FakePaystack().start()
m, who = signup(password="correct horse battery 9")
slug = new_store(m, f"Demo {secrets.token_hex(2)}", currency="NGN", country="NG")["store"]["slug"]
d = f"/dash/{slug}"
m.ok(m.post(d + "/payments/payouts/connect", {"business_name": "Demo", "bank_code": "058", "bank_name": "Test Bank", "account_number": "0123456789"}))
v = []
for t, p in (("Linen shirt", 12000), ("Canvas tote", 4500), ("Ceramic mug", 2500)):
    v.append(m.ok(m.post(d + "/products", {"title": t, "price": p, "stock": 20, "status": "active", "track_inventory": True, "requires_shipping": True}))["variants"][0]["id"])
m.ok(m.post(d + "/settings/launch"))
m.ok(m.post(d + "/discounts", {"code": "WELCOME10", "kind": "percentage", "value": 10, "is_active": True}))
m.ok(m.post(d + "/collections", {"title": "Summer", "is_published": True}))
m.ok(m.post(d + "/settings/help-desk", {"help_desk_enabled": True}))
shop = Api()
for vid, email in ((v[0], "ada@example.com"), (v[1], "grace@example.com")):
    c = shop.ok(shop.post(f"/shop/{slug}/cart/add", {"variant_id": vid, "quantity": 1}))["cart_token"]
    out = shop.ok(shop.post(f"/shop/{slug}/checkout", {"email": email, "first_name": "Cus", "last_name": "Tomer", "line1": "1 Rd", "city": "Lagos", "country": "NG", "cart_token": c}))
    fake.pay(out["reference"])
    shop.ok(shop.get(f"/shop/{slug}/checkout/return", params={"cart": c}))
shop.ok(shop.post(f"/shop/{slug}/help/tickets", {"email": "q@example.com", "name": "Q", "message": "Do you ship abroad?"}))
print(who["email"], "correct horse battery 9", slug)
fake.stop()
