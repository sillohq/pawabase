"""What follows from each domain event, **in code**.

``events.emit`` announces every event on the platform's bus first: the audit trail, the merchant's bell, the emails (receipt, shipping notice, refund, invitation,
welcome, cart recovery) are **flows** and **mail templates** in the Pawabase dashboard, subscribed to those events (see ``blueprint/automation.py``). Only what needs
this project's data and libraries stays here, because a flow's blocks cannot express it: fanning an event out to *each merchant's own* webhook endpoints (tenant data
with signing and retry), resampling an uploaded image, the denormalised counters, a Paystack transfer, a campaign's attribution.

Importing this module registers the listeners (``functions/_load.py`` does it once).
"""

from __future__ import annotations

import logging
from datetime import UTC, datetime
from typing import Any

from . import q
from .events import DomainEvent, listener
from .services import webhooks_out

log = logging.getLogger("sell4me.listeners")

# ── the merchant's webhooks ──────────────────────────────────────────────

#: Domain events merchants can subscribe to, mapped to the public name their endpoint receives. Internal events are absent on
#: purpose: a merchant's integration should not break because we renamed something.
PUBLIC_EVENTS: dict[str, str] = {name: name for name in (
    "order.created", "order.paid", "order.fulfilled", "order.cancelled", "payment.succeeded", "payment.failed", "refund.created",
    "product.created", "product.updated", "inventory.low", "customer.created")}


def public_payload(event: DomainEvent) -> dict[str, Any]:
    """What a merchant's endpoint receives: listed by hand, so a column added later is not published by accident."""
    order, payment, refund = event.get("order"), event.get("payment"), event.get("refund")
    product, variant, customer = event.get("product"), event.get("variant"), event.get("customer")
    if order is not None and refund is None:
        return {"id": order.pk, "number": order.number, "email": order.email, "currency": order.currency, "subtotal_minor": order.subtotal_minor,
                "discount_minor": order.discount_minor, "shipping_minor": order.shipping_minor, "total_minor": order.total_minor, "status": order.status,
                "payment_status": order.payment_status, "fulfilment_status": order.fulfilment_status, "tracking_number": order.tracking_number}
    if refund is not None:
        return {"id": refund.pk, "order_id": refund.order_id, "amount_minor": refund.amount_minor, "currency": refund.currency, "reason": refund.reason}
    if payment is not None:
        return {"id": payment.pk, "reference": payment.reference, "order_id": payment.order_id, "provider": payment.provider,
                "amount_minor": payment.amount_minor, "currency": payment.currency, "status": payment.status}
    if product is not None:
        return {"id": product.pk, "title": product.title, "slug": product.slug, "status": product.status}
    if variant is not None:
        return {"id": variant.pk, "product_id": variant.product_id, "sku": variant.sku, "available": variant.available}
    if customer is not None:
        return {"id": customer.pk, "email": customer.email}
    return {}


@listener(*PUBLIC_EVENTS)
async def fan_out_to_webhooks(c: Any, event: DomainEvent) -> None:
    public = PUBLIC_EVENTS.get(event.name)
    if public and event.store is not None:
        queued = await webhooks_out.dispatch(c, event.store, public, public_payload(event))
        if queued:
            await c.dispatch("webhooks.sweep", {})


# ── media ────────────────────────────────────────────────────────────────

@listener("image.uploaded")
async def process_uploaded_image(c: Any, event: DomainEvent) -> None:
    """Generate the responsive and OpenGraph derivatives as a job: resampling a 4000px source takes seconds."""
    image = event.image
    if image is not None:
        await c.dispatch("image.process", {"image_id": image.pk})


# ── analytics, counters, payouts, campaigns ──────────────────────────────

@listener("order.paid", "refund.created")
async def refresh_today(c: Any, event: DomainEvent) -> None:
    if event.store is not None:
        await c.dispatch("analytics.aggregate_day", {"store_id": event.store.pk, "day": datetime.now(UTC).date().isoformat()})


@listener("order.paid")
async def bump_product_counters(c: Any, event: DomainEvent) -> None:
    """Keep the denormalised purchase counters in step (read on every product list; recomputing per row would be an aggregate per product)."""
    order = event.order
    if order is None:
        return
    db = await c.db()
    for item in await q.find(db, "order_items", {"order_id": order.pk}):
        if item.product_id:
            await q.increment(db, "products", item.product_id, purchase_count=item.quantity)


@listener("order.paid")
async def initiate_payout(c: Any, event: DomainEvent) -> None:
    """Pay the merchant their share now that the order is confirmed (a Paystack transfer is a network call the request should not wait on)."""
    if event.order is not None:
        await c.dispatch("payouts.initiate", {"order_id": event.order.pk})


@listener("order.paid")
async def refresh_attributed_campaign(c: Any, event: DomainEvent) -> None:
    order = event.order
    if order is None or not order.discount_id:
        return
    campaign = await q.first(await c.db(), "campaigns", {"store_id": order.store_id, "discount_id": order.discount_id})
    if campaign is not None:
        await c.dispatch("campaigns.refresh", {"campaign_id": campaign.pk})
