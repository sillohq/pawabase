"""Products, variants, inventory, collections, images."""

from __future__ import annotations

from conftest import plain_png
from harness import operator_query, scalar, wait_for


def test_a_product_with_options_gets_a_variant_matrix(shop):
    m = shop.merchant
    created = m.ok(m.post(shop.dash("/products"), {"title": "Tee", "price": 2500, "stock": 4, "status": "active", "track_inventory": True, "product_type": "Apparel",
                                                  "options": [{"name": "Size", "values": ["S", "M", "L"]}, {"name": "Colour", "values": ["Red", "Blue"]}]}))
    assert len(created["variants"]) == 6
    titles = {v["title"] for v in created["variants"]}
    assert "S / Red" in titles and "L / Blue" in titles
    shown = m.ok(m.get(shop.dash(f"/products/{created['id']}")))
    assert shown["product"]["title"] == "Tee" and len(shown["product"]["options"]) == 2


def test_editing_options_keeps_the_variants_that_still_exist(shop):
    m = shop.merchant
    p = m.ok(m.post(shop.dash("/products"), {"title": "Cap", "price": 1000, "stock": 3, "status": "active", "options": [{"name": "Size", "values": ["S", "M"]}]}))
    keep = next(v for v in p["variants"] if v["title"] == "S")
    m.ok(m.post(shop.dash(f"/inventory/{keep['id']}"), {"mode": "set", "value": 11, "reason": "recount"}))
    updated = m.ok(m.patch(shop.dash(f"/products/{p['id']}"), {"options": [{"name": "Size", "values": ["S", "M", "L"]}]}))
    survivors = {v["title"]: v for v in updated["variants"]}
    assert set(survivors) == {"S", "M", "L"}
    assert survivors["S"]["id"] == keep["id"] and survivors["S"]["stock"] == 11  # not recreated: its stock and its history survive


def test_patching_one_field_does_not_require_the_others(shop):
    m = shop.merchant
    p = shop.add_product("Patchable", 1000, 2)
    out = m.ok(m.patch(shop.dash(f"/products/{p['id']}"), {"vendor": "Acme"}))
    assert out["vendor"] == "Acme" and out["title"] == "Patchable"


def test_inventory_adjustments_are_recorded_and_cannot_go_negative(shop):
    m = shop.merchant
    variant = shop.add_product("Stocked", 1000, 5)["variants"][0]["id"]
    m.ok(m.post(shop.dash(f"/inventory/{variant}"), {"value": 3, "reason": "restock"}))
    assert scalar(f"SELECT stock FROM product_variants WHERE id = {variant}") == 8
    refused = m.post(shop.dash(f"/inventory/{variant}"), {"value": -100, "reason": "oops"})
    assert refused.status_code == 422 and scalar(f"SELECT stock FROM product_variants WHERE id = {variant}") == 8
    assert int(scalar(f"SELECT COUNT(*) FROM inventory_movements WHERE variant_id = {variant}")) >= 1
    listing = m.ok(m.get(shop.dash("/inventory")))
    assert any(row.get("variant_id", row.get("id")) == variant or row.get("id") == variant for row in listing["data"])


def test_archiving_hides_a_product_from_the_shop_but_keeps_its_history(shop):
    m = shop.merchant
    p = shop.add_product("Gone soon", 1000, 2)
    assert any(x["slug"] == p["slug"] for x in shop.shopper.ok(shop.shopper.get(shop.front("/products")))["products"])
    m.ok(m.post(shop.dash(f"/products/{p['id']}/archive")))
    assert shop.shopper.get(shop.front(f"/products/{p['slug']}")).status_code == 404
    assert not any(x["slug"] == p["slug"] for x in shop.shopper.ok(shop.shopper.get(shop.front("/products")))["products"])
    assert int(scalar(f"SELECT COUNT(*) FROM products WHERE id = {p['id']}")) == 1  # archived, not deleted


def test_collections_group_products_and_publish_independently(shop):
    m = shop.merchant
    a, b = shop.add_product("In", 1000, 1), shop.add_product("Out", 1000, 1)
    col = m.ok(m.post(shop.dash("/collections"), {"title": "Summer", "is_published": True, "product_ids": [a["id"]]}))
    page = shop.shopper.ok(shop.shopper.get(shop.front("/collections/summer")))
    assert [p["slug"] for p in page["products"]] == [a["slug"]]
    assert "summer" in [c["slug"] for c in shop.shopper.ok(shop.shopper.get(shop.front("/collections")))["collections"]]
    m.ok(m.post(shop.dash("/collections"), {"id": col.get("id"), "title": "Summer", "is_published": False}))
    assert shop.shopper.get(shop.front("/collections/summer")).status_code == 404
    _ = b


def test_uploading_an_image_stores_it_and_a_background_job_makes_derivatives(shop):
    import base64

    m = shop.merchant
    p = shop.add_product("Pictured", 1000, 1)
    up = m.ok(m.post(shop.dash(f"/products/{p['id']}/images"), {"file": base64.b64encode(plain_png()).decode(), "alt": "A tee"}))
    image_id = up.get("id") or up["image"]["id"]
    done = wait_for(lambda: scalar(f"SELECT processed_at FROM product_images WHERE id = {image_id}"), timeout=40, message="image derivatives")
    assert done
    row = operator_query(f"SELECT width, height, placeholder, variants FROM product_images WHERE id = {image_id}")[0]
    assert row["width"] == 64 and row["height"] == 48 and row["placeholder"]
    status = m.ok(m.get(shop.dash(f"/products/{p['id']}/images/status")))
    assert status
    m.ok(m.delete(shop.dash(f"/images/{image_id}")))
    assert int(scalar(f"SELECT COUNT(*) FROM product_images WHERE id = {image_id} AND deleted_at IS NULL")) == 0


def test_a_file_that_is_not_an_image_is_refused(shop):
    import base64

    p = shop.add_product("NotPictured", 1000, 1)
    bad = shop.merchant.post(shop.dash(f"/products/{p['id']}/images"), {"file": base64.b64encode(b"<?php evil(); ?>").decode()})
    assert bad.status_code in (400, 415, 422)
