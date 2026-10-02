"""Every form post and JSON fetch the dashboard makes, and the Pawabase endpoint it becomes.

Generated from the endpoints' ``original`` field (the route of the original application each one replaces), then given the few behaviours that differ:
where to go afterwards (``then``), and what a success says when the endpoint sent no ``message``.

The browser path is the original one (the React pages post to them unchanged); the Pawabase path takes its parameters from the browser path *in order*.
"""

from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True)
class Action:
    path: str  # the browser path, {id}-style segments
    method: str  # the Pawabase method (the browser always POSTs)
    api: str  # the Pawabase path, with {store} and its own parameter names
    then: str | None = None  # where to go after a form post, ``{field}`` filled from the answer; default: back
    says: str | None = None  # the flash when the endpoint sent no ``message``
    upload: bool = False  # the browser sends a multipart file; the endpoint wants it base64 in ``file``


ACTIONS: list[Action] = [
    Action("/storefront/pages", "POST", "/dash/{store}/pages"),
    Action("/storefront/pages/{id}/save", "PATCH", "/dash/{store}/pages/{page_id}"),
    Action("/storefront/pages/{id}/publish", "POST", "/dash/{store}/pages/{page_id}/publish"),
    Action("/storefront/pages/publish-all", "POST", "/dash/{store}/pages/publish-all"),
    Action("/storefront/pages/{id}/unpublish", "POST", "/dash/{store}/pages/{page_id}/unpublish"),
    Action("/storefront/pages/{id}/revisions/{rev}/restore", "POST", "/dash/{store}/pages/{page_id}/restore/{revision_id}"),
    Action("/storefront/pages/{id}/delete", "DELETE", "/dash/{store}/pages/{page_id}"),
    Action("/storefront/blocks", "POST", "/dash/{store}/pages/blocks/new"),
    Action("/products", "POST", "/dash/{store}/products"),
    Action("/products/{id}", "PATCH", "/dash/{store}/products/{product_id}"),
    Action("/products/{id}/archive", "POST", "/dash/{store}/products/{product_id}/archive"),
    Action("/inventory/{variant_id}", "POST", "/dash/{store}/inventory/{variant_id}"),
    Action("/collections", "POST", "/dash/{store}/collections"),
    Action("/customers/{id}", "PATCH", "/dash/{store}/customers/{customer_id}"),
    Action("/customers/segments", "POST", "/dash/{store}/segments"),
    Action("/customers/segments/{id}/delete", "DELETE", "/dash/{store}/segments/{segment_id}"),
    Action("/customers/abandoned/{id}/notify", "POST", "/dash/{store}/abandoned-carts/{record_id}/notify"),
    Action("/designs", "POST", "/dash/{store}/designs"),
    Action("/designs/{id}/save", "PATCH", "/dash/{store}/designs/{design_id}"),
    Action("/designs/{id}/duplicate", "POST", "/dash/{store}/designs/{design_id}/duplicate"),
    Action("/designs/{id}/delete", "DELETE", "/dash/{store}/designs/{design_id}"),
    Action("/payments/providers/{key}/connect", "POST", "/dash/{store}/payments/providers/{provider_key}/connect"),
    Action("/payments/providers/{key}/verify", "POST", "/dash/{store}/payments/providers/{provider_key}/verify"),
    Action("/payments/providers/{key}/disconnect", "POST", "/dash/{store}/payments/providers/{provider_key}/disconnect"),
    Action("/payments/providers/{key}/default", "POST", "/dash/{store}/payments/providers/{provider_key}/default"),
    Action("/payments/payouts/connect", "POST", "/dash/{store}/payments/payouts/connect"),
    Action("/notifications/read", "POST", "/dash/{store}/notifications/read"),
    Action("/exports", "POST", "/dash/{store}/exports"),
    Action("/marketing/discounts", "POST", "/dash/{store}/discounts"),
    Action("/marketing/discounts/{id}/toggle", "POST", "/dash/{store}/discounts/{discount_id}/toggle"),
    Action("/marketing/campaigns", "POST", "/dash/{store}/campaigns"),
    Action("/marketing/campaigns/{id}/status", "POST", "/dash/{store}/campaigns/{campaign_id}/status"),
    Action("/products/{id}/images", "POST", "/dash/{store}/products/{product_id}/images"),
    Action("/images/{id}/delete", "DELETE", "/dash/{store}/images/{image_id}"),
    Action("/products/{id}/images/order", "POST", "/dash/{store}/products/{product_id}/images/order"),
    Action("/storefront/logo", "POST", "/dash/{store}/storefront/logo"),
    Action("/orders/{id}/fulfil", "POST", "/dash/{store}/orders/{order_id}/fulfil"),
    Action("/orders/{id}/deliver", "POST", "/dash/{store}/orders/{order_id}/deliver"),
    Action("/orders/{id}/cancel", "POST", "/dash/{store}/orders/{order_id}/cancel"),
    Action("/orders/{id}/refund", "POST", "/dash/{store}/orders/{order_id}/refund"),
    Action("/orders/{id}/note", "POST", "/dash/{store}/orders/{order_id}/note"),
    Action("/pos/sale", "POST", "/dash/{store}/pos/sale"),
    Action("/pos/sale/card/start", "POST", "/dash/{store}/pos/sale/card/start"),
    Action("/pos/sessions/open", "POST", "/dash/{store}/pos/sessions/open"),
    Action("/pos/sessions/{id}/close", "POST", "/dash/{store}/pos/sessions/{session_id}/close"),
    Action("/pos/config/device", "POST", "/dash/{store}/pos/config/device"),
    Action("/pos/config/device/{id}/verify", "POST", "/dash/{store}/pos/config/device/{device_id}/verify"),
    Action("/pos/config/device/{id}/delete", "DELETE", "/dash/{store}/pos/config/device/{device_id}"),
    Action("/settings", "PATCH", "/dash/{store}/settings"),
    Action("/settings/maintenance", "POST", "/dash/{store}/settings/maintenance"),
    Action("/settings/help-desk", "POST", "/dash/{store}/settings/help-desk"),
    Action("/settings/launch", "POST", "/dash/{store}/settings/launch"),
    Action("/settings/team/invite", "POST", "/dash/{store}/team/invitations"),
    Action("/settings/team/{id}", "PATCH", "/dash/{store}/team/{member_id}"),
    Action("/settings/team/{id}/remove", "DELETE", "/dash/{store}/team/{member_id}"),
    Action("/developers/keys", "POST", "/dash/{store}/developers/keys"),
    Action("/developers/keys/{id}/revoke", "POST", "/dash/{store}/developers/keys/{key_id}/revoke"),
    Action("/developers/webhooks", "POST", "/dash/{store}/developers/webhooks"),
    Action("/developers/webhooks/{id}/test", "POST", "/dash/{store}/developers/webhooks/{webhook_id}/test"),
    Action("/developers/webhooks/{id}/delete", "DELETE", "/dash/{store}/developers/webhooks/{webhook_id}"),
    Action("/storefront/palette", "PATCH", "/dash/{store}/storefront/theme"),
    Action("/storefront/templates/apply", "POST", "/dash/{store}/storefront/templates/apply"),
    Action("/storefront/palette/apply", "POST", "/dash/{store}/storefront/palette/apply"),
    Action("/storefront/domains", "POST", "/dash/{store}/storefront/domains"),
    Action("/storefront/domains/{id}/verify", "POST", "/dash/{store}/storefront/domains/{domain_id}/verify"),
    Action("/storefront/seo", "POST", "/dash/{store}/storefront/seo"),
    Action("/settings/shipping", "POST", "/dash/{store}/shipping"),
    Action("/help-desk/{id}/reply", "POST", "/dash/{store}/support/{ticket_id}/reply"),
    Action("/help-desk/{id}/close", "POST", "/dash/{store}/support/{ticket_id}/close"),
]

#: JSON the browser fetches with GET (not Inertia pages): the answer is passed through as it is.
FETCHES: list[Action] = [
    Action("/pos/search", "GET", "/dash/{store}/pos/search"),
    Action("/pos/customer-search", "GET", "/dash/{store}/pos/customer-search"),
    Action("/products/{id}/images/status", "GET", "/dash/{store}/products/{product_id}/images/status"),
    Action("/storefront/templates/{key}", "GET", "/dash/{store}/storefront/templates/{key}"),
]

#: Behaviour that differs from "forward, flash, go back", by browser path.
OVERRIDES: dict[str, dict] = {
    "/products": {"then": "/products/{id}", "says": "Product created."},
    "/products/{id}": {"says": "Product saved."},
    "/products/{id}/archive": {"then": "/products", "says": "Product archived."},
    "/storefront/pages": {"then": "/storefront/pages/{id}"},
    "/storefront/pages/{id}/delete": {"then": "/storefront/pages"},
    "/designs": {"then": "/designs/{id}"},
    "/designs/{id}/duplicate": {"then": "/designs/{id}"},
    "/designs/{id}/delete": {"then": "/designs", "says": "Design deleted."},
    "/pos/sessions/open": {"then": "/pos/terminal", "says": "Session opened."},
    "/pos/sessions/{id}/close": {"then": "/pos/sessions/{id}", "says": "Session closed."},
    "/pos/config/device": {"then": "/pos/config"},
    "/pos/config/device/{id}/delete": {"then": "/pos/config"},
    "/payments/payouts/connect": {"then": "/payments/payouts"},
    "/settings/launch": {"then": "/"},
    "/products/{id}/images": {"upload": True},
    "/storefront/logo": {"upload": True},
}


def all_actions() -> list[Action]:
    out = []
    for action in ACTIONS:
        out.append(Action(**{**action.__dict__, **OVERRIDES.get(action.path, {})}))
    return out
