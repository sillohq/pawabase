"""What an event looks like once it leaves the process.

``events.emit`` runs the listeners that need the database rows (counters, payouts, image work) and also publishes the event on the platform's bus, where the
project's **flows** turn it into audit entries, notifications and emails, and where the Pawabase dashboard shows them. What travels is a plain JSON *view*: the
store, the order or refund or invitation it is about, money already formatted for people, and the links an email needs. Flows and mail templates read these
fields (``{{ input.event.payload.order.total }}``); they never reach back into the database for what the view already says.

Written by hand, field by field, so a column added to a table is not published by accident (the same rule as the merchant webhooks' payloads).
"""

from __future__ import annotations

import datetime as dt
import decimal
from typing import Any

from . import q
from .money import Money


def jsonable(value: Any) -> Any:
    """Anything a row can hold, as JSON."""
    if value is None or isinstance(value, (str, int, float, bool)):
        return value
    if isinstance(value, (dt.datetime, dt.date)):
        return value.isoformat()
    if isinstance(value, decimal.Decimal):
        return float(value)
    if isinstance(value, bytes):
        return None
    if isinstance(value, dict):
        return {str(k): jsonable(v) for k, v in value.items()}
    if isinstance(value, (list, tuple, set)):
        return [jsonable(v) for v in value]
    return str(value)


def _money(minor: Any, currency: str) -> str:
    return Money(int(minor or 0), currency).format()


def _shop_base(store: Any, settings: Any) -> str:
    scheme = "https" if str(settings.app_url).lower().startswith("https://") else "http"
    return f"{scheme}://{store.slug}.{settings.storefront_suffix}"


def store_view(store: Any, settings: Any) -> dict[str, Any]:
    return {"id": store.pk, "slug": store.slug, "name": store.name, "currency": store.currency, "support_email": store.support_email or store.email,
            "shop_url": _shop_base(store, settings), "app_url": str(settings.app_url).rstrip("/")}


def order_view(order: Any) -> dict[str, Any]:
    cur = order.currency
    return {"id": order.pk, "number": order.number, "email": order.email, "currency": cur, "status": order.status,
            "status_path": f"/orders/{order.number}/{order.cart_token}",
            "subtotal": _money(order.subtotal_minor, cur), "discount": _money(order.discount_minor, cur), "shipping": _money(order.shipping_minor, cur),
            "total": _money(order.total_minor, cur), "total_minor": order.total_minor, "has_discount": (order.discount_minor or 0) > 0,
            "tracking_number": order.tracking_number, "tracking_url": order.tracking_url}


async def _order_lines(c: Any, order: Any) -> tuple[list[dict[str, Any]], dict[str, Any] | None]:
    db = await c.db()
    items = await q.find(db, "order_items", {"order_id": order.pk}, order="id")
    addresses = {a.kind: a for a in await q.find(db, "order_addresses", {"order_id": order.pk})}
    shipping = addresses.get("shipping")
    lines = [{"title": i.title, "variant": i.variant_title, "quantity": i.quantity, "total": _money(i.total_minor, order.currency)} for i in items]
    address = ({"name": shipping.name, "line1": shipping.line1, "line2": shipping.line2, "city": shipping.city, "postal_code": shipping.postal_code,
                "country": shipping.country} if shipping else None)
    return lines, address


#: Events that appear in the audit trail, and the sentence each writes (``{field}`` is filled from the view below).
AUDITED: dict[str, str] = {
    "product.created": "Created the product {title}",
    "product.updated": "Updated the product {title}",
    "product.archived": "Archived the product {title}",
    "order.paid": "Order #{number} was paid",
    "order.fulfilled": "Fulfilled order #{number}",
    "order.cancelled": "Cancelled order #{number}",
    "refund.created": "Refunded {amount} on order #{number}",
    "inventory.adjusted": "Adjusted stock for {sku} by {delta:+d}",
    "provider.connected": "Connected {provider}",
    "domain.verified": "Verified the domain {hostname}",
    "staff.invited": "Invited {email} as {role}",
    "staff.joined": "{email} joined the store",
    "store.launched": "Launched the store",
}


def _audit_fields(payload: dict[str, Any]) -> dict[str, Any]:
    fields: dict[str, Any] = {k: v for k, v in payload.items() if isinstance(v, (str, int, float))}
    for key in ("product", "order", "variant", "domain", "invitation", "refund"):
        obj = payload.get(key)
        if isinstance(obj, dict):
            for attribute in ("title", "number", "sku", "hostname", "email", "role", "amount"):
                if obj.get(attribute) is not None:
                    fields.setdefault(attribute, obj[attribute])
    return fields


def _resource_id(payload: dict[str, Any]) -> Any:
    for key in ("order", "product", "variant", "refund", "domain", "invitation"):
        obj = payload.get(key)
        if isinstance(obj, dict) and obj.get("id") is not None:
            return obj["id"]
    return payload.get("resource_id")


async def view_of(c: Any, name: str, payload: dict[str, Any]) -> dict[str, Any]:
    """The JSON view of one event."""
    settings = await c.settings()
    out: dict[str, Any] = {"app_name": getattr(settings, "app_name", "Sell4me")}
    store = payload.get("store")
    if store is not None:
        out["store"] = store_view(store, settings)
    order, refund, payment = payload.get("order"), payload.get("refund"), payload.get("payment")
    if order is not None:
        out["order"] = order_view(order)
        if name == "order.paid":
            out["items"], out["address"] = await _order_lines(c, order)
    if refund is not None:
        out["refund"] = {"id": refund.pk, "amount": _money(refund.amount_minor, refund.currency), "reason": refund.reason}
    if payment is not None:
        out["payment"] = {"id": payment.pk, "failure_message": payment.failure_message, "provider": payment.provider}
    for key in ("product", "variant"):
        obj = payload.get(key)
        if obj is not None:
            out[key] = {"id": obj.pk, "title": obj.title, "sku": obj.get("sku"), "available": obj.get("available"), "product_id": obj.get("product_id")}
    invitation = payload.get("invitation")
    if invitation is not None:
        out["invitation"] = {"id": invitation.pk, "email": invitation.email, "role": invitation.role, "accept_url": f"{str(settings.app_url).rstrip('/')}/invitations/{invitation.token}",
                             "invited_by": payload.get("invited_by_name")}
    owner = payload.get("owner")
    if owner:
        out["owner"] = {"email": owner.get("email"), "name": owner.get("full_name") or owner.get("email")}
    payout = payload.get("payout")
    if payout is not None:
        out["payout"] = {"id": payout.pk, "amount": _money(payout.amount_minor, payout.currency)}
    record = payload.get("record")
    if record is not None:
        out["cart"] = {"id": record.pk, "email": record.email, "value": _money(record.value_minor, record.currency), "recover_path": f"/cart/recover/{record.recovery_token}"}
        db = await c.db()
        rows = await db.fetch("SELECT ci.quantity, v.title AS variant, p.title FROM cart_items ci JOIN product_variants v ON v.id = ci.variant_id JOIN products p ON p.id = v.product_id "
                              "WHERE ci.cart_id = ? AND ci.deleted_at IS NULL LIMIT 4", [record.cart_id])
        out["items"] = [{"title": r["title"], "variant": r["variant"], "quantity": r["quantity"]} for r in rows]
    ticket = payload.get("ticket")
    if ticket is not None:
        out["ticket"] = {"id": ticket.pk, "token": ticket.token, "subject": ticket.subject, "customer_name": ticket.customer_name, "customer_email": ticket.customer_email,
                         "opt_in_email": bool(ticket.opt_in_email), "path": f"/help/{ticket.token}"}
        out["ticket_path"] = f"/help/{ticket.token}"
        out["name"] = ticket.customer_name
        for key in ("reply", "question"):
            if payload.get(key) is not None:
                out[key] = payload[key]
    domain = payload.get("domain")
    if domain is not None:
        out["domain"] = {"id": domain.pk, "hostname": domain.hostname}
    for key in ("provider", "delta", "resource_id"):
        if payload.get(key) is not None:
            out[key] = jsonable(payload[key])
    actor = payload.get("actor")
    if actor:
        out["actor"] = {"id": str(actor.get("id") or ""), "label": actor.get("full_name") or actor.get("email") or "System"} if isinstance(actor, dict) else {"id": str(actor), "label": str(actor)}
    if payload.get("ip_address"):
        out["ip_address"] = payload["ip_address"]
    if name in AUDITED:
        view = jsonable(out)
        try:
            summary = AUDITED[name].format(**_audit_fields({**view, "delta": payload.get("delta")}))
        except (KeyError, IndexError, ValueError):
            summary = name.replace(".", " ")
        out["audit"] = {"action": name, "resource_type": name.split(".", 1)[0], "resource_id": _resource_id(view), "summary": summary[:500],
                        "changes": jsonable(payload.get("changes") or {})}
    return jsonable(out)
