"""Who may do what, in whose store."""

from __future__ import annotations

from harness import Api, new_store, operator_query, scalar, signup


def test_a_merchant_cannot_reach_another_merchants_store(make_shop):
    one, two = make_shop(), make_shop()
    product = one.add_product("Private", 1000, 1)
    # Same routes, other tenant's slug: indistinguishable from a store that does not exist.
    for path in ("/orders", "/products", "/customers", "/settings", "/payments", f"/products/{product['id']}"):
        assert two.merchant.get(one.dash(path)).status_code == 404, path
    assert two.merchant.post(one.dash("/products"), {"title": "Injected", "price": 1}).status_code == 404
    # And an id from one store used inside one's own slug finds nothing.
    assert two.merchant.get(two.dash(f"/products/{product['id']}")).status_code == 404
    assert two.merchant.patch(two.dash(f"/products/{product['id']}"), {"vendor": "x"}).status_code == 404


def test_unauthenticated_callers_get_nothing_from_the_dashboard(shop, anon):
    assert anon.get(shop.dash("/orders")).status_code == 401
    assert anon.get("/account/me").status_code == 401


def test_a_new_account_has_no_stores_and_is_asked_to_onboard():
    merchant, _ = signup()
    me = merchant.ok(merchant.get("/account/me"))
    assert me["stores"] == [] and me["needs_onboarding"] is True


def test_invite_a_support_agent_and_what_they_can_and_cannot_do(shop):
    owner = shop.merchant
    agent, who = signup()
    owner.ok(owner.post(shop.dash("/team/invitations"), {"email": who["email"], "role": "support"}))
    token = scalar(f"SELECT token FROM invitations WHERE email = '{who['email']}' AND store_id = (SELECT id FROM stores WHERE slug = '{shop.slug}')")
    assert token
    accepted = agent.ok(agent.post("/account/invitations/accept", {"token": token}))
    assert accepted
    # A support agent can read the inbox ...
    assert agent.get(shop.dash("/support")).status_code == 200
    assert agent.get(shop.dash("/orders")).status_code in (200, 403)
    # ... and cannot do what the role does not carry.
    assert agent.post(shop.dash("/products"), {"title": "Nope", "price": 1}).status_code == 403
    assert agent.post(shop.dash("/settings/launch")).status_code == 403
    assert agent.get(shop.dash("/settings")).status_code == 403  # support holds no settings permission
    assert agent.get(shop.dash("/team")).status_code in (200, 403)
    # An invitation is single use, and not for someone else.
    other, _ = signup()
    assert other.post("/account/invitations/accept", {"token": token}).status_code in (400, 404, 409, 422)


def test_extra_and_denied_permissions_override_the_role(shop):
    owner = shop.merchant
    agent, who = signup()
    owner.ok(owner.post(shop.dash("/team/invitations"), {"email": who["email"], "role": "support"}))
    token = scalar(f"SELECT token FROM invitations WHERE email = '{who['email']}'")
    agent.ok(agent.post("/account/invitations/accept", {"token": token}))
    members = owner.ok(owner.get(shop.dash("/team")))
    member = next(m for m in members["members"] if m.get("email") == who["email"])
    assert agent.post(shop.dash("/products"), {"title": "No", "price": 1}).status_code == 403
    owner.ok(owner.patch(shop.dash(f"/team/{member['id']}"), {"extra_permissions": ["products.create"]}))
    assert agent.post(shop.dash("/products"), {"title": "Yes", "price": 1, "status": "draft"}).status_code in (200, 201)
    owner.ok(owner.patch(shop.dash(f"/team/{member['id']}"), {"denied_permissions": ["support.read"]}))
    assert agent.get(shop.dash("/support")).status_code == 403


def test_a_removed_member_loses_access_at_once(shop):
    owner = shop.merchant
    agent, who = signup()
    owner.ok(owner.post(shop.dash("/team/invitations"), {"email": who["email"], "role": "admin"}))
    token = scalar(f"SELECT token FROM invitations WHERE email = '{who['email']}'")
    agent.ok(agent.post("/account/invitations/accept", {"token": token}))
    assert agent.get(shop.dash("/orders")).status_code == 200
    member = next(m for m in owner.ok(owner.get(shop.dash("/team")))["members"] if m.get("email") == who["email"])
    owner.ok(owner.delete(shop.dash(f"/team/{member['id']}")))
    assert agent.get(shop.dash("/orders")).status_code == 404


def test_the_owner_cannot_be_removed_or_demoted_into_a_ghost_store(shop):
    owner = shop.merchant
    me = next(m for m in owner.ok(owner.get(shop.dash("/team")))["members"] if m.get("role") == "owner")
    assert owner.delete(shop.dash(f"/team/{me['id']}")).status_code in (403, 409, 422)


def test_the_audit_trail_records_who_did_what(shop):
    owner = shop.merchant
    shop.add_product("Audited", 1000, 1)
    trail = owner.ok(owner.get(shop.dash("/audit")))
    assert any("product" in (row.get("action") or "") for row in trail["data"])


# ── the store's own API keys ─────────────────────────────────────────────

def make_key(shop, scopes):
    out = shop.merchant.ok(shop.merchant.post(shop.dash("/developers/keys"), {"name": "ci", "scopes": scopes}))
    return out["key"] if "key" in out else out["plaintext"], out


def test_a_store_api_key_can_do_only_what_its_scopes_say(shop):
    secret, _ = make_key(shop, ["products.read", "orders.read"])
    api = Api(store_key=secret)
    me = api.ok(api.get("/api/v1/me"))
    assert me["store"]["slug"] == shop.slug and "products.read" in me["key"]["scopes"]
    assert api.ok(api.get("/api/v1/products"))["object"] == "list"
    assert api.post("/api/v1/products", {"title": "Nope"}).status_code == 403
    assert api.post("/api/v1/discounts", {"code": "X"}).status_code == 403


def test_a_store_api_key_is_confined_to_its_own_store(make_shop):
    one, two = make_shop(), make_shop()
    one.add_product("Mine", 1000, 1)
    secret, _ = make_key(two, ["products.read", "products.create", "orders.read"])
    api = Api(store_key=secret)
    titles = [p["title"] for p in api.ok(api.get("/api/v1/products"))["data"]]
    assert "Mine" not in titles
    foreign = operator_query(f"SELECT id FROM products WHERE store_id = (SELECT id FROM stores WHERE slug = '{one.slug}') LIMIT 1")[0]["id"]
    assert api.get(f"/api/v1/products/{foreign}").status_code == 404


def test_bad_revoked_and_missing_keys_get_the_same_answer(shop):
    secret, created = make_key(shop, ["products.read"])
    good = Api(store_key=secret)
    assert good.get("/api/v1/products").status_code == 200
    shop.merchant.ok(shop.merchant.post(shop.dash(f"/developers/keys/{created['id']}/revoke")))
    answers = {Api(store_key=k).get("/api/v1/products").json().get("message") for k in (secret, "sk_live_nonsense", "")}
    assert answers == {"A valid API key is required."}


def test_the_store_api_creates_updates_and_archives_products_and_orders_flow(shop):
    secret, _ = make_key(shop, ["products.read", "products.create", "products.update", "products.delete", "orders.read", "orders.fulfil", "orders.cancel", "discounts.read", "discounts.manage"])
    api = Api(store_key=secret)
    made = api.ok(api.post("/api/v1/products", {"title": "Via API", "price": 1500, "stock": 4, "status": "active"}))
    assert made["variants"][0]["price_minor"] == 150_000 and made["variants"][0]["stock"] == 4
    updated = api.ok(api.patch(f"/api/v1/products/{made['id']}", {"price": 1750, "stock": 9}))
    assert updated["variants"][0]["price_minor"] == 175_000 and updated["variants"][0]["stock"] == 9 and updated["status"] == "active"
    discount = api.ok(api.post("/api/v1/discounts", {"code": "api10", "kind": "percentage", "value": 10}))
    assert discount["code"] == "API10"
    bought = shop.buy(made["variants"][0]["id"], 1)
    orders = api.ok(api.get("/api/v1/orders", params={"limit": 1}))
    assert orders["data"][0]["number"] == bought["order"]["number"]
    oid = orders["data"][0]["id"]
    shipped = api.ok(api.post(f"/api/v1/orders/{oid}/fulfil", {"tracking_number": "TRK1", "carrier": "DHL"}))
    assert shipped["fulfilment_status"] == "fulfilled" and shipped["tracking_number"] == "TRK1"
    delivered = api.ok(api.post(f"/api/v1/orders/{oid}/deliver"))
    assert delivered["status"] == "delivered"
    assert api.post(f"/api/v1/orders/{oid}/cancel", {"reason": "late"}).status_code == 409  # a paid order is refunded, not cancelled
    archived = api.ok(api.delete(f"/api/v1/products/{made['id']}"))
    assert archived["status"] == "archived"


def test_a_store_api_key_is_shown_once_and_stored_hashed(shop):
    secret, created = make_key(shop, ["orders.read"])
    stored = operator_query(f"SELECT key_hash, prefix FROM api_keys WHERE id = {created['id']}")[0]
    assert secret not in stored["key_hash"] and len(stored["key_hash"]) == 64
    listing = shop.merchant.ok(shop.merchant.get(shop.dash("/developers")))
    assert secret not in str(listing)
