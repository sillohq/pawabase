"""The public shop: a shopper has no account, so nothing here is signed in. The store comes from the hostname, the basket from the session, and every page's data from the
shop endpoints of the Pawabase project, which answer to the publishable key alone."""

from __future__ import annotations

import time
from typing import Any

from sillo.core.http import HttpContext
from sillo.core.routing import Route
from sillo.responses import html, json, raw
from sillo_inertia import back, location, render, set_errors, set_flash

from . import common
from .gateway import ApiFailure

CART = "cart"
_hosts: dict[str, tuple[float, str | None]] = {}
HOST_TTL = 60.0


async def shop_slug(ctx: HttpContext) -> str | None:
    """Which store this hostname is: ``<slug>.<STOREFRONT_SUFFIX>`` directly, or a verified custom domain (asked of the platform, remembered for a minute)."""
    host = (ctx.headers.get("host") or "").lower()
    suffix = common.settings().storefront_suffix.lower()
    for candidate, tail in ((host, suffix), (host.split(":", 1)[0], suffix.split(":", 1)[0])):
        if candidate.endswith(f".{tail}"):
            return candidate[: -len(tail) - 1]
    cached = _hosts.get(host)
    if cached and time.monotonic() - cached[0] < HOST_TTL:
        return cached[1]
    try:
        slug = (await common.api_of(ctx).get("/hosts/resolve", host=host))["store"]
    except ApiFailure:
        slug = None
    _hosts[host] = (time.monotonic(), slug)
    return slug


def api_for(ctx: HttpContext) -> Any:
    """This shopper's view of Pawabase: the publishable key, and their basket token."""
    token = ctx.session.get(CART)
    return common.api_of(ctx, **({"x_cart_token": token} if token else {}))


def keep_basket(ctx: HttpContext, answer: Any) -> None:
    if isinstance(answer, dict) and answer.get("cart_token"):
        ctx.session.set(CART, answer["cart_token"])


async def not_a_shop(ctx: HttpContext) -> Any:
    return html("<h1>No shop at this address</h1>", status_code=404)


async def holding_page(error: ApiFailure) -> Any:
    details = error.details if isinstance(error.details, dict) else {}
    title, message = details.get("title") or "We'll be right back", details.get("message") or ""
    return html(f"<!doctype html><meta name=viewport content='width=device-width'><body style='font-family:system-ui;display:grid;place-items:center;min-height:100vh;margin:0'>"
                f"<main style='text-align:center;max-width:32rem;padding:2rem'><h1>{title}</h1><p>{message}</p></main>", status_code=503, headers={"Retry-After": "300", "Cache-Control": "no-store"})


async def chrome(ctx: HttpContext, slug: str) -> dict[str, Any]:
    info = await api_for(ctx).call("GET", f"/shop/{slug}", params=dict(ctx.query_params))
    return {k: info[k] for k in ("theme", "cart_count", "header", "header_css") if k in info} | {"store": info["store"]}


def shop_page(component: str, api: str, *, keep: bool = False, then_unavailable: str | None = None) -> Any:
    """A page whose props are one shop endpoint's answer plus the page chrome."""

    async def handler(ctx: HttpContext, **params: str) -> Any:
        slug = await shop_slug(ctx)
        if slug is None:
            return await not_a_shop(ctx)
        client = api_for(ctx)
        try:
            props, body = await common.gather(chrome(ctx, slug), client.call("GET", common.fill(api, {"store": slug, **params}), params=dict(ctx.query_params)))
        except ApiFailure as error:
            if error.status == 503 and error.code == "maintenance":
                return await holding_page(error)
            if error.status == 404:
                return html("<h1>Not found</h1>", status_code=404)
            if then_unavailable and error.status == 503:
                return await render(then_unavailable, {})
            if error.status == 422 and error.code == "empty_cart":
                return common.to(ctx, "/cart")
            return html(f"<h1>Something went wrong</h1><p>{error.message}</p>", status_code=502)
        keep_basket(ctx, body)
        ctx.state.pb_shop = props
        return await render(component, {**props, **{k: v for k, v in body.items() if k != "cart_token"}})

    return handler


def shop_action(api: str, *, says: str | None = None, then: str | None = None) -> Any:
    """A form post from the shop (add to basket, update, apply a code): flash the answer and go back."""

    async def handler(ctx: HttpContext, **params: str) -> Any:
        slug = await shop_slug(ctx)
        if slug is None:
            return await not_a_shop(ctx)
        body = await common.body_of(ctx)
        body.pop("__files__", None)
        try:
            answer = await api_for(ctx).call("POST", common.fill(api, {"store": slug, **params}), json=body)
        except ApiFailure as error:
            if error.status == 503 and error.code == "maintenance":
                return await holding_page(error)
            return common.flash_failure(ctx, error, fallback=ctx.headers.get("referer", "/cart"))
        keep_basket(ctx, answer)
        if isinstance(answer, dict) and answer.get("applied") is False:
            set_errors(ctx, {"code": answer.get("message") or "That code can't be used."})
        elif says or (isinstance(answer, dict) and answer.get("message")):
            set_flash(ctx, "success", says or answer["message"])
        return common.to(ctx, then) if then else back(fallback=ctx.headers.get("referer", "/cart"), ctx=ctx)

    return handler


async def checkout_start(ctx: HttpContext) -> Any:
    slug = await shop_slug(ctx)
    if slug is None:
        return await not_a_shop(ctx)
    body = await common.body_of(ctx)
    body.pop("__files__", None)
    try:
        answer = await api_for(ctx).call("POST", f"/shop/{slug}/checkout", json=body)
    except ApiFailure as error:
        return common.flash_failure(ctx, error, fallback="/checkout")
    keep_basket(ctx, answer)
    target = answer.get("redirect_url") or f"/checkout/return?cart={answer['cart_token']}"
    if target.startswith(f"/shop/{slug}/sandbox/"):  # the offline provider's pay screen is drawn by this app
        target = f"/sandbox/pay/{target.rsplit('/', 1)[1]}"
    return location(target) if common.is_inertia(ctx) else common.to(ctx, target)


async def checkout_return(ctx: HttpContext) -> Any:
    slug = await shop_slug(ctx)
    if slug is None:
        return await not_a_shop(ctx)
    try:
        props, body = await common.gather(chrome(ctx, slug), api_for(ctx).call("GET", f"/shop/{slug}/checkout/return", params=dict(ctx.query_params)))
    except ApiFailure as error:
        return common.to(ctx, "/") if error.status == 404 else html(f"<h1>{error.message}</h1>", status_code=502)
    if body["order"]["payment_status"] in ("paid", "partially_refunded"):
        ctx.session.delete(CART)  # the basket became an order
    order = {**body["order"], "status_url": body["order"]["status_path"].replace(f"/shop/{slug}", "", 1)}
    receipt_url = (body.get("receipt_path") or "").replace(f"/shop/{slug}", "", 1).rsplit("/receipt", 1)[0] + "/receipt" if body.get("receipt_path") else ""
    return await render("shop/Confirmation", {**props, "order": order, "receipt": body.get("receipt"), "receipt_url": receipt_url})


async def order_status(ctx: HttpContext, number: str, token: str) -> Any:
    slug = await shop_slug(ctx)
    if slug is None:
        return await not_a_shop(ctx)
    try:
        props, body = await common.gather(chrome(ctx, slug), api_for(ctx).call("GET", f"/shop/{slug}/orders/{number}/{token}"))
    except ApiFailure as error:
        return html("<h1>No such order</h1>", status_code=404) if error.status == 404 else html(f"<h1>{error.message}</h1>", status_code=502)
    return await render("shop/OrderStatus", {**props, "order": body["order"], "receipt": body.get("receipt"), "receipt_url": f"/orders/{number}/{token}/receipt"})


async def order_receipt(ctx: HttpContext, number: str, token: str, fmt: str) -> Any:
    slug = await shop_slug(ctx)
    if slug is None:
        return await not_a_shop(ctx)
    try:
        link = await api_for(ctx).call("GET", f"/shop/{slug}/orders/{number}/{token}/receipt/{fmt}")
    except ApiFailure as error:
        return html(f"<h1>{error.message}</h1>", status_code=error.status if error.status < 500 else 502)
    fetched = await common.client().download(link["url"])
    disposition = "attachment" if ctx.query_params.get("download") else "inline"
    return raw(fetched.content, content_type=link["content_type"], headers={"Content-Disposition": f'{disposition}; filename="{link["filename"]}"', "Cache-Control": "private, no-store"})


async def cart_recover(ctx: HttpContext, token: str) -> Any:
    slug = await shop_slug(ctx)
    if slug is None:
        return await not_a_shop(ctx)
    try:
        answer = await api_for(ctx).call("GET", f"/shop/{slug}/cart/recover/{token}")
    except ApiFailure:
        return html("<h1>That link has expired.</h1>", status_code=404)
    keep_basket(ctx, answer)
    return common.to(ctx, "/cart")


async def seo_file(ctx: HttpContext, kind: str) -> Any:
    slug = await shop_slug(ctx)
    if slug is None:
        return await not_a_shop(ctx)
    answer = await api_for(ctx).call("GET", f"/shop/{slug}/{kind}")
    return raw(answer["body"].encode(), content_type=answer["content_type"])


async def sitemap(ctx: HttpContext) -> Any:
    return await seo_file(ctx, "sitemap.xml")


async def robots(ctx: HttpContext) -> Any:
    return await seo_file(ctx, "robots.txt")


async def help_json(ctx: HttpContext, **params: str) -> Any:
    """The help widget's own API (open a ticket, read it, reply): JSON in, JSON out, passed through."""
    slug = await shop_slug(ctx)
    if slug is None:
        return json({"error": "No shop at this address."}, status_code=404)
    method = ctx.method
    path = ctx.path.replace("/help/", f"/shop/{slug}/help/", 1)
    body = None if method == "GET" else await common.body_of(ctx)
    try:
        answer = await api_for(ctx).call(method, path, json=body)
    except ApiFailure as error:
        return common.failure_json(error)
    return json(answer, status_code=201 if method == "POST" and path.endswith("/tickets") else 200)


async def help_page(ctx: HttpContext, token: str) -> Any:
    slug = await shop_slug(ctx)
    if slug is None:
        return await not_a_shop(ctx)
    try:
        props, body = await common.gather(chrome(ctx, slug), api_for(ctx).call("GET", f"/shop/{slug}/help/tickets/{token}"))
    except ApiFailure as error:
        return html("<h1>No conversation at that link.</h1>", status_code=404) if error.status == 404 else html(f"<h1>{error.message}</h1>", status_code=502)
    return await render("shop/HelpTicket", {**props, **body, "realtime": {"channel": body["channel"]}})


# ── the offline payment provider's pay screen (development only) ─────────

async def sandbox_page(ctx: HttpContext, ref: str) -> Any:
    slug = await shop_slug(ctx)
    if slug is None:
        return await not_a_shop(ctx)
    try:
        charge = await api_for(ctx).call("GET", f"/shop/{slug}/sandbox/{ref}")
    except ApiFailure:
        return html("<h1>No such payment</h1>", status_code=404)
    amount = charge["amount"]["formatted"]
    return html(f"<!doctype html><meta name=viewport content='width=device-width'><body style='font-family:system-ui;max-width:26rem;margin:4rem auto;padding:0 1rem'>"
                f"<h1>Sandbox payment</h1><p>Pay <b>{amount}</b> (no real money moves). An amount ending in .01 or .02 is declined.</p>"
                f"<form method=post style='display:flex;gap:.5rem'><button name=outcome value=succeeded>Pay</button><button name=outcome value=failed>Decline</button></form></body>")


async def sandbox_settle(ctx: HttpContext, ref: str) -> Any:
    slug = await shop_slug(ctx)
    if slug is None:
        return await not_a_shop(ctx)
    body = await common.body_of(ctx)
    try:
        charge = await api_for(ctx).call("GET", f"/shop/{slug}/sandbox/{ref}")
        await api_for(ctx).call("POST", f"/shop/{slug}/sandbox/{ref}/settle", json={"outcome": body.get("outcome")})
    except ApiFailure as error:
        return html(f"<h1>{error.message}</h1>", status_code=502)
    return common.to(ctx, charge["return_url"] or "/checkout/return")


def routes() -> list[Route]:
    return [
        Route("/pages/{slug}", handler=shop_page("shop/Built", "/shop/{store}/pages/{slug}"), methods=["GET"], name="shop.page"),
        Route("/products/{slug}", handler=shop_page("shop/Product", "/shop/{store}/products/{slug}"), methods=["GET"], name="shop.product"),
        Route("/collections/{slug}", handler=shop_page("shop/Collection", "/shop/{store}/collections/{slug}"), methods=["GET"], name="shop.collection"),
        Route("/cart", handler=shop_page("shop/Cart", "/shop/{store}/cart"), methods=["GET"], name="shop.cart"),
        Route("/cart/recover/{token}", handler=cart_recover, methods=["GET"], name="shop.cart.recover"),
        Route("/cart/add", handler=shop_action("/shop/{store}/cart/add", says="Added to your basket."), methods=["POST"], name="shop.cart.add"),
        Route("/cart/update", handler=shop_action("/shop/{store}/cart/update"), methods=["POST"], name="shop.cart.update"),
        Route("/cart/discount", handler=shop_action("/shop/{store}/cart/discount"), methods=["POST"], name="shop.cart.discount"),
        Route("/checkout", handler=shop_page("shop/Checkout", "/shop/{store}/checkout", then_unavailable="shop/CheckoutUnavailable"), methods=["GET"], name="shop.checkout"),
        Route("/checkout", handler=checkout_start, methods=["POST"], name="shop.checkout.start"),
        Route("/checkout/return", handler=checkout_return, methods=["GET"], name="shop.checkout.return"),
        Route("/orders/{number}/{token}", handler=order_status, methods=["GET"], name="shop.order"),
        Route("/orders/{number}/{token}/receipt/{fmt}", handler=order_receipt, methods=["GET"], name="shop.order.receipt"),
        Route("/sitemap.xml", handler=sitemap, methods=["GET"], name="shop.sitemap"),
        Route("/robots.txt", handler=robots, methods=["GET"], name="shop.robots"),
        Route("/help/tickets", handler=help_json, methods=["POST"], name="shop.help.create"),
        Route("/help/tickets/{token}", handler=help_json, methods=["GET"], name="shop.help.show"),
        Route("/help/tickets/{token}/reply", handler=help_json, methods=["POST"], name="shop.help.reply"),
        Route("/help/{token}", handler=help_page, methods=["GET"], name="shop.help.page"),
        Route("/sandbox/pay/{ref}", handler=sandbox_page, methods=["GET"], name="sandbox.page"),
        Route("/sandbox/pay/{ref}", handler=sandbox_settle, methods=["POST"], name="sandbox.settle"),
    ]


#: The four paths both surfaces answer: which one is decided by the hostname.
SHARED_SHOP = {
    "/": shop_page("shop/Built", "/shop/{store}/home"),
    "/products": shop_page("shop/Products", "/shop/{store}/products"),
    "/collections": shop_page("shop/Collections", "/shop/{store}/collections"),
    "/search": shop_page("shop/Search", "/shop/{store}/search"),
}
