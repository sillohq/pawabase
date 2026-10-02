"""The shop's content: the page builder, templates, themes, SEO, domains, designs."""

from __future__ import annotations

import json
import secrets

from harness import scalar


def preview_token(shop) -> str:
    url = shop.merchant.ok(shop.merchant.get(shop.dash("/pages")))["storefront_url"]
    return url.split("preview=")[1]


def test_a_new_store_serves_the_starter_homepage_until_the_merchant_builds_one(shop):
    home = shop.shopper.ok(shop.shopper.get(shop.front("/home")))
    assert home["starter"] is True and home["tree"]
    info = shop.shopper.ok(shop.shopper.get(shop.front()))
    assert info["theme"]["colors"]["primary"] and info["store"]["slug"] == shop.slug


def test_a_draft_is_invisible_to_shoppers_until_it_is_published(shop):
    m = shop.merchant
    page = m.ok(m.post(shop.dash("/pages"), {"title": "About us", "kind": "page"}))
    block = m.ok(m.post(shop.dash("/pages/blocks/new"), {"type": "heading"}))["block"]
    saved = m.ok(m.patch(shop.dash(f"/pages/{page['id']}"), {"tree": [block]}))
    assert saved["blocks"] >= 1 and saved["has_changes"] is False  # nothing published yet to differ from
    assert shop.shopper.get(shop.front("/pages/about-us")).status_code == 404
    token = preview_token(shop)
    assert shop.shopper.get(shop.front("/pages/about-us"), params={"preview": token}).status_code == 200  # a signed preview shows the draft
    assert shop.shopper.get(shop.front("/pages/about-us"), params={"preview": "forged.token"}).status_code == 404
    m.ok(m.post(shop.dash(f"/pages/{page['id']}/publish")))
    live = shop.shopper.ok(shop.shopper.get(shop.front("/pages/about-us")))
    assert live["tree"] and live["preview"] is False
    # Editing after publishing creates unpublished changes the shopper does not see.
    other = m.ok(m.post(shop.dash("/pages/blocks/new"), {"type": "heading"}))["block"]
    after = m.ok(m.patch(shop.dash(f"/pages/{page['id']}"), {"tree": [block, other]}))
    assert after["has_changes"] is True
    assert len(shop.shopper.ok(shop.shopper.get(shop.front("/pages/about-us")))["tree"]) == len(live["tree"])
    m.ok(m.post(shop.dash(f"/pages/{page['id']}/unpublish")))
    assert shop.shopper.get(shop.front("/pages/about-us")).status_code == 404


def test_the_server_rebuilds_every_tree_so_nothing_the_browser_invents_is_stored(shop):
    m = shop.merchant
    page = m.ok(m.post(shop.dash("/pages"), {"title": "Hostile", "kind": "page"}))
    block = m.ok(m.post(shop.dash("/pages/blocks/new"), {"type": "heading"}))["block"]
    evil = json.loads(json.dumps(block))
    for key in list(evil.get("props", {})):
        if isinstance(evil["props"][key], str):
            evil["props"][key] = '<script>alert(1)</script><img src=x onerror=alert(2)>'
            break
    unknown = {"id": "zzz", "type": "totally_made_up", "props": {"x": 1}, "children": []}
    saved = m.ok(m.patch(shop.dash(f"/pages/{page['id']}"), {"tree": [evil, unknown]}))
    dumped = json.dumps(saved["tree"]).lower()
    assert "<script" not in dumped and "onerror" not in dumped
    assert all(b["type"] != "totally_made_up" for b in saved["tree"])


def test_restoring_a_revision_goes_to_the_draft_and_is_itself_undoable(shop):
    m = shop.merchant
    page = m.ok(m.post(shop.dash("/pages"), {"title": "Versions", "kind": "page"}))
    first = m.ok(m.post(shop.dash("/pages/blocks/new"), {"type": "heading"}))["block"]
    second = m.ok(m.post(shop.dash("/pages/blocks/new"), {"type": "heading"}))["block"]
    m.ok(m.patch(shop.dash(f"/pages/{page['id']}"), {"tree": [first]}))
    m.ok(m.patch(shop.dash(f"/pages/{page['id']}"), {"tree": [first, second]}))
    detail = m.ok(m.get(shop.dash(f"/pages/{page['id']}")))
    assert detail["revisions"] and detail["catalogue"] and detail["sections"] and detail["page"]["tree"]
    rev = detail["revisions"][-1]
    restored = m.ok(m.post(shop.dash(f"/pages/{page['id']}/restore/{rev['id']}")))
    assert len(restored["tree"]) <= 2
    after = m.ok(m.get(shop.dash(f"/pages/{page['id']}")))
    assert any(r["reason"] == "restore" for r in after["revisions"])


def test_singleton_pages_cannot_be_duplicated_or_deleted(shop):
    m = shop.merchant
    pages = m.ok(m.get(shop.dash("/pages")))["data"]
    home = next(p for p in pages if p["kind"] == "home")
    assert m.post(shop.dash("/pages"), {"title": "Second home", "kind": "home"}).status_code == 422
    assert m.delete(shop.dash(f"/pages/{home['id']}")).status_code == 422


def test_publish_all_publishes_only_what_would_change(shop):
    m = shop.merchant
    for title in ("One", "Two"):
        page = m.ok(m.post(shop.dash("/pages"), {"title": title, "kind": "page"}))
        block = m.ok(m.post(shop.dash("/pages/blocks/new"), {"type": "heading"}))["block"]
        m.ok(m.patch(shop.dash(f"/pages/{page['id']}"), {"tree": [block]}))
    first = m.ok(m.post(shop.dash("/pages/publish-all")))
    assert first["published"] >= 2
    assert m.ok(m.post(shop.dash("/pages/publish-all")))["published"] == 0


def test_a_template_restyles_the_shop_and_only_replaces_pages_when_asked(shop):
    m = shop.merchant
    gallery = m.ok(m.get(shop.dash("/storefront/templates")))
    assert gallery["templates"] and gallery["palettes"]
    key = gallery["templates"][0]["key"]
    detail = m.ok(m.get(shop.dash(f"/storefront/templates/{key}")))
    assert detail["pages"]
    applied = m.ok(m.post(shop.dash("/storefront/templates/apply"), {"preset": key}))
    assert applied["theme"]
    assert m.post(shop.dash("/storefront/templates/apply"), {"preset": "no-such-template"}).status_code == 404
    palette = gallery["palettes"][0]["key"]
    repainted = m.ok(m.post(shop.dash("/storefront/palette/apply"), {"palette": palette}))
    assert repainted["theme"]["colors"]["primary"]


def test_theme_values_are_sanitised_not_trusted(shop):
    m = shop.merchant
    out = m.ok(m.patch(shop.dash("/storefront/theme"), {"colors": {"primary": "red;background:url(javascript:alert(1))", "accent": "#12ab34"}, "fonts": {"heading": "Comic; evil"},
                                                       "logo_url": "javascript:alert(1)", "announcement": "Sale <script>x</script>"}))
    theme = out["theme"]
    assert theme["colors"]["accent"] == "#12ab34"
    assert "javascript" not in json.dumps(theme).lower() and ";" not in theme["colors"]["primary"]
    assert "<script" not in (theme.get("announcement") or "").lower()


def test_seo_settings_drive_robots_and_the_sitemap(shop):
    m = shop.merchant
    shop.add_product("Indexed", 1000, 1)
    sitemap = shop.shopper.ok(shop.shopper.get(shop.front("/sitemap.xml")))
    assert sitemap["content_type"] == "application/xml" and "/products/indexed" in sitemap["body"]
    assert "Allow: /" in shop.shopper.ok(shop.shopper.get(shop.front("/robots.txt")))["body"]
    m.ok(m.post(shop.dash("/storefront/seo"), {"title": "My shop", "description": "Things", "robots": "noindex,nofollow"}))
    assert "Disallow: /\n" in shop.shopper.ok(shop.shopper.get(shop.front("/robots.txt")))["body"]
    seo = m.ok(m.get(shop.dash("/storefront/seo")))
    assert seo["seo"]["title"] == "My shop" and seo["urls"]["sitemap"].endswith("sitemap.xml") and "preview=" not in seo["urls"]["canonical"]


def test_custom_domains_stay_unusable_until_dns_proves_ownership(shop):
    m = shop.merchant
    host = f"shop-{secrets.token_hex(4)}.example-unverified.test"
    added = m.ok(m.post(shop.dash("/storefront/domains"), {"hostname": f"https://{host.upper()}/"}))
    assert added["hostname"] == host and added["status"] == "pending" and added["verification_token"]
    assert m.post(shop.dash("/storefront/domains"), {"hostname": host}).status_code == 422
    assert m.post(shop.dash("/storefront/domains"), {"hostname": "not a host"}).status_code == 422
    verdict = m.ok(m.post(shop.dash(f"/storefront/domains/{added['id']}/verify")))
    assert verdict["verified"] is False
    # A pending domain does not resolve to the shop.
    assert shop.shopper.get("/hosts/resolve", params={"host": host}).status_code == 404
    # The platform subdomain does.
    resolved = shop.shopper.ok(shop.shopper.get("/hosts/resolve", params={"host": f"{shop.slug}.shop.localhost:3000"}))
    assert resolved["store"] == shop.slug


def test_shipping_zones_and_rates_round_trip(shop):
    m = shop.merchant
    zone = m.ok(m.post(shop.dash("/shipping"), {"name": "Nigeria", "countries": ["ng"], "rates": [
        {"name": "Courier", "price": 1500, "kind": "flat", "delivery_estimate": "2 days"},
        {"name": "Free over 100k", "price": 0, "kind": "price", "min_subtotal": 100000}]}))
    zones = m.ok(m.get(shop.dash("/shipping")))["zones"]
    mine = next(z for z in zones if z["id"] == zone["id"])
    assert mine["countries"] == ["NG"] and [r["name"] for r in mine["rates"]] == ["Courier", "Free over 100k"] and mine["rates"][0]["price_minor"] == 150_000
    m.ok(m.post(shop.dash("/shipping"), {"id": zone["id"], "name": "Nigeria", "countries": ["NG"], "rates": [{"name": "Only", "price": 1}]}))
    assert [r["name"] for r in next(z for z in m.ok(m.get(shop.dash("/shipping")))["zones"] if z["id"] == zone["id"])["rates"]] == ["Only"]
    m.ok(m.delete(shop.dash(f"/shipping/{zone['id']}")))


def test_a_physical_product_is_charged_the_cheapest_valid_shipping_option(shop):
    m = shop.merchant
    variant = shop.add_product("Heavy", 10000, 3, requires_shipping=True)["variants"][0]["id"]
    cart = shop.shopper.ok(shop.shopper.post(shop.front("/cart/add"), {"variant_id": variant, "quantity": 1}))
    page = shop.shopper.ok(shop.shopper.get(shop.front("/checkout"), params={"cart_token": cart["cart_token"], "country": "NG"}))
    assert page["shipping_options"]
    cheapest = min(o["price_minor"] for o in page["shipping_options"])
    out = shop.shopper.ok(shop.shopper.post(shop.front("/checkout"), {"email": "s@example.com", "first_name": "S", "line1": "x", "city": "Lagos", "country": "NG", "cart_token": cart["cart_token"]}))
    assert out["order"]["total"]["minor"] == 1_000_000 + cheapest
    _ = m


def test_checkout_refuses_a_destination_the_store_does_not_ship_to(shop):
    m = shop.merchant
    zones = m.ok(m.get(shop.dash("/shipping")))["zones"]
    for z in zones:
        m.ok(m.post(shop.dash("/shipping"), {"id": z["id"], "name": z["name"], "countries": ["NG"], "rates": [{"name": "Std", "price": 5}]}))
    variant = shop.add_product("Parcel", 1000, 3, requires_shipping=True)["variants"][0]["id"]
    cart = shop.shopper.ok(shop.shopper.post(shop.front("/cart/add"), {"variant_id": variant, "quantity": 1}))
    refused = shop.shopper.post(shop.front("/checkout"), {"email": "z@example.com", "first_name": "Z", "line1": "x", "city": "Paris", "country": "FR", "cart_token": cart["cart_token"]})
    assert refused.status_code == 422 and "ship" in refused.json()["message"].lower()


def test_maintenance_mode_holds_shoppers_but_not_a_paid_order_status_link(shop):
    m = shop.merchant
    variant = shop.add_product("Maint", 1000, 3)["variants"][0]["id"]
    bought = shop.buy(variant, 1)
    m.ok(m.post(shop.dash("/settings/maintenance"), {"maintenance_enabled": True, "maintenance_title": "Back soon", "maintenance_message": "Stocktake"}))
    held = shop.shopper.get(shop.front("/products"))
    assert held.status_code == 503 and held.json()["details"]["title"] == "Back soon"
    assert shop.shopper.get(shop.front(f"/orders/{bought['order']['number']}/{bought['token']}")).status_code == 200
    assert shop.shopper.get(shop.front("/products"), params={"preview": preview_token(shop)}).status_code == 200  # the merchant checks their work behind the curtain
    m.ok(m.post(shop.dash("/settings/maintenance"), {"maintenance_enabled": False}))
    assert shop.shopper.get(shop.front("/products")).status_code == 200


def test_a_store_that_has_not_launched_is_not_public_but_previews(make_shop):
    draft = make_shop(launch=False)
    assert draft.shopper.get(draft.front()).status_code == 404
    url = draft.merchant.ok(draft.merchant.get(draft.dash("/pages")))["storefront_url"]
    token = url.split("preview=")[1]
    assert draft.shopper.get(draft.front(), params={"preview": token}).status_code == 200
    assert scalar(f"SELECT status FROM stores WHERE slug = '{draft.slug}'") == "draft"


# ── the design studio ────────────────────────────────────────────────────

def test_designs_store_documents_and_only_links_this_stores_products(make_shop):
    one, two = make_shop(), make_shop()
    m = one.merchant
    foreign = two.add_product("Other", 1000, 1)
    mine = one.add_product("Mine", 1000, 1)
    design = m.ok(m.post(one.dash("/designs"), {"kind": "banner", "title": "Sale banner"}))
    assert (design["width"], design["height"]) == (1500, 500)
    saved = m.ok(m.patch(one.dash(f"/designs/{design['id']}"), {"data": {"objects": [{"type": "text", "text": "SALE"}]}, "product_id": mine["id"]}))
    assert saved["ok"] is True
    m.ok(m.patch(one.dash(f"/designs/{design['id']}"), {"product_id": foreign["id"]}))  # silently not linked
    shown = m.ok(m.get(one.dash(f"/designs/{design['id']}")))
    assert shown["design"]["product_id"] == mine["id"] and shown["design"]["data"]["objects"][0]["text"] == "SALE"
    assert shown["products"] and shown["store"]["currency"] == "NGN"
    assert m.patch(one.dash(f"/designs/{design['id']}"), {"thumbnail": "javascript:alert(1)"}).status_code == 200  # ignored, not stored
    assert not m.ok(m.get(one.dash(f"/designs/{design['id']}")))["design"]["thumbnail"]
    copy = m.ok(m.post(one.dash(f"/designs/{design['id']}/duplicate")))
    assert copy["title"].endswith("copy") and copy["id"] != design["id"]
    m.ok(m.delete(one.dash(f"/designs/{design['id']}")))
    assert m.get(one.dash(f"/designs/{design['id']}")).status_code == 404
    assert two.merchant.get(one.dash(f"/designs/{copy['id']}")).status_code == 404


def test_style_classes_a_merchant_sets_get_compiled_css(shop):
    """The Style tab writes Tailwind classes onto blocks; they live in the database, so the shop's own stylesheet has never heard of them."""
    m = shop.merchant
    page = m.ok(m.post(shop.dash("/pages"), {"title": "Styled", "kind": "page"}))
    block = m.ok(m.post(shop.dash("/pages/blocks/new"), {"type": "heading"}))["block"]
    block["props"]["styles"] = "p-4 bg-red-500"
    saved = m.ok(m.patch(shop.dash(f"/pages/{page['id']}"), {"tree": [block]}))
    assert "bg-red-500" in json.dumps(saved["tree"])
    m.ok(m.post(shop.dash(f"/pages/{page['id']}/publish")))
    live = shop.shopper.ok(shop.shopper.get(shop.front("/pages/styled")))
    assert ".bg-red-500" in live["page_css"] and ".p-4" in live["page_css"]
