"""The parts of the blueprint that are declared, not derived: buckets, schedules, inbound hooks, subscriptions, roles, settings.

Resources come from ``resources.json`` (generated from the original models) and routes from the ``@endpoint`` registry in the
code, so the documentation cannot drift from what runs.
"""

from __future__ import annotations

from typing import Any

PROJECT_NAME = "Sell4me"
PROJECT_DESCRIPTION = "Multi-tenant commerce: merchant dashboard API, hosted storefront API, checkout and payments, POS, help desk."

# ── storage ──────────────────────────────────────────────────────────────
BUCKETS: list[dict[str, Any]] = [
    {"name": "media", "description": "Product images, logos and their derivatives. Public: product images are on a public storefront, and a signed URL on every <img> would break browser caching for no security gain. Only the application writes.",
     "public": True, "read_policy": "public", "write_policy": "service",
     "accepts": ["image/jpeg", "image/png", "image/webp", "image/avif", "image/gif"], "max_bytes": 12 * 1024 * 1024, "signed_uploads": False},
    {"name": "exports", "description": "Finished CSV and Excel exports. Private: they hold customer names, emails and addresses, and are handed out as short-lived signed URLs after a permission check.",
     "public": False, "read_policy": "service", "write_policy": "service", "accepts": [], "max_bytes": 0, "signed_uploads": False},
]

# ── scheduled work (every entry is a job function) ───────────────────────
SCHEDULES: list[dict[str, Any]] = [
    {"name": "webhook-delivery", "description": "Send merchant webhook deliveries whose time has come.", "interval_seconds": 30, "target_type": "function", "target": "webhooks.sweep"},
    {"name": "abandoned-carts", "description": "Close out checkouts that were given up on: release their stock and record the recovery opportunity.", "interval_seconds": 300, "target_type": "function", "target": "carts.sweep_abandoned"},
    {"name": "payment-reconciliation", "description": "Ask the provider about payments a webhook never resolved.", "interval_seconds": 600, "target_type": "function", "target": "payments.reconcile"},
    {"name": "export-expiry", "description": "Delete finished export files past their retention window.", "interval_seconds": 3600, "target_type": "function", "target": "exports.expire"},
    {"name": "daily-analytics", "description": "Roll up the day that just closed (and the day before, for late webhooks) for every store.", "cron": "15 0 * * *", "target_type": "function", "target": "analytics.aggregate_yesterday"},
    {"name": "segment-counts", "description": "Recompute every segment's cached size.", "cron": "30 0 * * *", "target_type": "function", "target": "segments.refresh_all"},
    {"name": "campaign-scheduler", "description": "Start and finish campaigns whose window has arrived or passed.", "cron": "0 * * * *", "target_type": "function", "target": "campaigns.advance"},
    {"name": "export-runner", "description": "Run exports that were queued but whose job was lost (a restart).", "interval_seconds": 120, "target_type": "function", "target": "exports.run_queued"},
]

# ── inbound webhooks ─────────────────────────────────────────────────────
INBOUND_HOOKS: list[dict[str, Any]] = [
    {"slug": "paystack", "name": "Paystack", "description": "Paystack events (charge.success, refunds, transfers). Set this hook's secret to the platform's Paystack secret key: Paystack signs every delivery with it (HMAC-SHA512, x-paystack-signature).",
     "verification": "hmac-sha512", "signature_header": "x-paystack-signature", "target_type": "event", "target": "webhook.paystack"},
    {"slug": "stripe", "name": "Stripe", "description": "Stripe events. Registered but unoffered, as in the original.",
     "verification": "none", "signature_header": "stripe-signature", "target_type": "event", "target": "webhook.stripe", "enabled": False},
    {"slug": "sandbox", "name": "Sandbox", "description": "The offline sandbox provider's test deliveries (demo and test environments only).",
     "verification": "none", "signature_header": "x-signature", "target_type": "event", "target": "webhook.sandbox", "enabled": False},
]

SUBSCRIPTIONS: list[dict[str, Any]] = [
    {"name": "paystack-events", "description": "Handle a verified Paystack delivery exactly once.", "event": "webhook.paystack", "target_type": "function", "target": "payments.webhook_event"},
    {"name": "stripe-events", "description": "Handle a Stripe delivery.", "event": "webhook.stripe", "target_type": "function", "target": "payments.webhook_event", "enabled": False},
    {"name": "sandbox-events", "description": "Handle a sandbox delivery.", "event": "webhook.sandbox", "target_type": "function", "target": "payments.webhook_event", "enabled": False},
]

# ── identity ─────────────────────────────────────────────────────────────
ROLES: list[dict[str, Any]] = [
    {"name": "platform_admin", "description": "People who run the platform itself (the original's is_superuser). Says nothing about what anyone may do inside a store: that is the store membership's job.", "permissions": []},
]

AUTH: dict[str, Any] = {
    "signup_enabled": True,
    "require_email_verification": False,
    "password_min_length": 10,
    "mfa_enabled": True,
    "magic_link_enabled": False,
}

# ── realtime (the help desk) ─────────────────────────────────────────────
REALTIME: dict[str, Any] = {
    "channels": [
        # A ticket's own thread: the unguessable token in the name is the capability (same as the shopper's link). Clients may not publish.
        {"pattern": "help:ticket:*", "subscribe": "public", "publish": "deny", "presence": False, "history": 20},
        # A store's staff inbox: the name carries a per-store secret that only a member holding support.read is given.
        {"pattern": "help:staff:*", "subscribe": "public", "publish": "deny", "presence": False, "history": 20},
    ],
    "allow_client_publish": False,
    "default_policy": "deny",
}

SETTINGS: dict[str, Any] = {
    "public_docs": True,
    "realtime": REALTIME,
}
