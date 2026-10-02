"""Every dashboard page: the browser path, the React component, and the Pawabase endpoint its props come from.

``adapt`` reshapes the endpoint's answer into the props the component expects, where the two differ. A component's props are the contract (they are what the original
server sent); the endpoint's answer is what the platform sends. ``tools_check.py`` diffs the two for every page against a live stack.
"""

from __future__ import annotations

from collections.abc import Callable
from dataclasses import dataclass
from typing import Any

Adapter = Callable[[dict[str, Any], dict[str, Any]], dict[str, Any]]


def rename(**moves: str) -> Adapter:
    """``rename(data="orders")``: the endpoint answers ``{"data": [...]}``, the component wants ``orders``."""

    def adapt(body: dict[str, Any], _ctx: dict[str, Any]) -> dict[str, Any]:
        out = dict(body)
        for old, new in moves.items():
            if old in out:
                out[new] = out.pop(old)
        return out

    return adapt


def chain(*adapters: Adapter) -> Adapter:
    def adapt(body: dict[str, Any], ctx: dict[str, Any]) -> dict[str, Any]:
        for one in adapters:
            body = one(body, ctx)
        return body

    return adapt


def add(**fixed: Any) -> Adapter:
    """Props the endpoint has no reason to send: constants, or ``lambda body, ctx: value``."""

    def adapt(body: dict[str, Any], ctx: dict[str, Any]) -> dict[str, Any]:
        return {**body, **{k: (v(body, ctx) if callable(v) else v) for k, v in fixed.items()}}

    return adapt


def paged(listing: str) -> Adapter:
    """``{data, page, per_page, total, pages}`` becomes ``{<listing>, pagination: {…}}``."""

    def adapt(body: dict[str, Any], _ctx: dict[str, Any]) -> dict[str, Any]:
        out = dict(body)
        out[listing] = out.pop("data", [])
        if "pagination" not in out and "page" in out:
            out["pagination"] = {k: out.pop(k) for k in ("page", "per_page", "total", "pages") if k in out}
        return out

    return adapt


@dataclass(frozen=True)
class Page:
    path: str  # the browser path, with {name} segments
    component: str  # the Inertia component
    api: str  # the Pawabase path, with {store} and the same {name} segments
    adapt: Adapter | None = None
    #: extra Pawabase calls whose answers are merged in as ``{prop: answer}`` (or adapted by the callable given as second item)
    also: tuple[tuple[str, str], ...] = ()


PAGES: list[Page] = [
    Page("/", "Dashboard", "/dash/{store}/overview", adapt=add(show_tour=False)),
    Page("/orders", "orders/Index", "/dash/{store}/orders", adapt=rename(data="orders")),
    Page("/orders/{order_id}", "orders/Show", "/dash/{store}/orders/{order_id}"),
    Page("/products", "products/Index", "/dash/{store}/products", adapt=rename(data="products")),
    Page("/products/new", "products/Edit", "/dash/{store}/product-form"),
    Page("/products/{product_id}", "products/Show", "/dash/{store}/products/{product_id}"),
    Page("/products/{product_id}/edit", "products/Edit", "/dash/{store}/products/{product_id}"),
    Page("/collections", "collections/Index", "/dash/{store}/collections", adapt=rename(data="collections")),
    Page("/inventory", "inventory/Index", "/dash/{store}/inventory", adapt=rename(data="variants")),
    Page("/customers", "customers/Index", "/dash/{store}/customers", adapt=rename(data="customers")),
    Page("/customers/segments", "customers/Segments", "/dash/{store}/segments", adapt=rename(data="segments")),
    Page("/customers/abandoned", "customers/Abandoned", "/dash/{store}/abandoned-carts", adapt=rename(data="carts")),
    Page("/customers/{customer_id}", "customers/Show", "/dash/{store}/customers/{customer_id}"),
    Page("/marketing/discounts", "marketing/Discounts", "/dash/{store}/discounts", adapt=rename(data="discounts")),
    Page("/marketing/campaigns", "marketing/Campaigns", "/dash/{store}/campaigns", adapt=rename(data="campaigns")),
    Page("/marketing/campaigns/{campaign_id}", "marketing/CampaignShow", "/dash/{store}/campaigns/{campaign_id}"),
    Page("/storefront/templates", "storefront/Templates", "/dash/{store}/storefront/templates", adapt=add(builder_url="/storefront/pages")),
    Page("/storefront/domains", "storefront/Domains", "/dash/{store}/storefront/domains", adapt=rename(data="domains")),
    Page("/storefront/seo", "storefront/Seo", "/dash/{store}/storefront/seo"),
    Page("/settings/shipping", "storefront/Shipping", "/dash/{store}/shipping"),
    Page("/designs", "designs/Index", "/dash/{store}/designs", adapt=rename(data="designs")),
    Page("/designs/{design_id}", "designs/Editor", "/dash/{store}/designs/{design_id}"),
    Page("/storefront/pages", "builder/Index", "/dash/{store}/pages", adapt=rename(data="pages")),
    Page("/storefront/pages/{page_id}", "builder/Editor", "/dash/{store}/pages/{page_id}"),
    Page("/analytics", "analytics/Overview", "/dash/{store}/analytics"),
    Page("/analytics/products", "analytics/Products", "/dash/{store}/analytics/products"),
    Page("/analytics/customers", "analytics/Customers", "/dash/{store}/analytics/customers"),
    Page("/analytics/sales", "analytics/Sales", "/dash/{store}/analytics/sales"),
    Page("/payments", "finance/Overview", "/dash/{store}/payments"),
    Page("/payments/transactions", "finance/Transactions", "/dash/{store}/payments/transactions", adapt=rename(data="transactions")),
    Page("/payments/refunds", "finance/Refunds", "/dash/{store}/payments/refunds", adapt=rename(data="refunds")),
    Page("/payments/providers", "finance/Providers", "/dash/{store}/payments/providers"),
    Page("/payments/payouts", "finance/Payouts", "/dash/{store}/payments/payouts", adapt=rename(data="payouts")),
    Page("/payments/payouts/connect", "finance/PayoutsConnect", "/dash/{store}/payments/payouts/connect"),
    Page("/payments/fees", "finance/Fees", "/dash/{store}/payments/fees"),
    Page("/developers", "settings/Developers", "/dash/{store}/developers"),
    Page("/developers/mail", "settings/MailPreview", "/dash/{store}/developers/mail", adapt=add(transport="the platform mailer")),
    Page("/developers/logs", "settings/WebhookLogs", "/dash/{store}/developers/logs", adapt=rename(data="deliveries")),
    Page("/settings", "settings/General", "/dash/{store}/settings", adapt=add(preview_url=lambda body, ctx: ctx["shared"]["store"]["storefront_url"])),
    Page("/settings/team", "settings/Team", "/dash/{store}/team"),
    Page("/settings/roles", "settings/Roles", "/dash/{store}/roles"),
    Page("/settings/audit", "settings/AuditLog", "/dash/{store}/audit", adapt=rename(data="entries")),
    Page("/pos", "pos/Index", "/dash/{store}/pos"),
    Page("/pos/terminal", "pos/Terminal", "/dash/{store}/pos/terminal"),
    Page("/pos/sessions", "pos/Sessions", "/dash/{store}/pos/sessions", adapt=paged("sessions"), also=(("devices", "/dash/{store}/pos/config"),)),
    Page("/pos/sessions/{session_id}", "pos/SessionDetail", "/dash/{store}/pos/sessions/{session_id}"),
    Page("/pos/config", "pos/Config", "/dash/{store}/pos/config"),
    Page("/help-desk", "HelpDesk/Index", "/dash/{store}/support", adapt=rename(data="tickets")),
    Page("/help-desk/{ticket_id}", "HelpDesk/Show", "/dash/{store}/support/{ticket_id}"),
    Page("/notifications", "Notifications", "/dash/{store}/notifications", adapt=rename(data="notifications")),
    Page("/exports", "Exports", "/dash/{store}/exports", adapt=rename(data="exports")),
    Page("/search", "Search", "/dash/{store}/search"),
]
