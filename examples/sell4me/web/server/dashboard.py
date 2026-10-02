"""The merchant dashboard: sign-in, the store the person is working in, pages and form posts."""

from __future__ import annotations

import re
from typing import Any

from sillo.core.http import HttpContext
from sillo.responses import html, json
from sillo_inertia import back, render, set_flash

from . import common
from .actions import FETCHES, Action, all_actions
from .gateway import ACCESS, Api, ApiFailure
from .pages import PAGES, Page

STORE = "store"


# ── who, and where ───────────────────────────────────────────────────────

async def resolve_store(api: Api, ctx: HttpContext, *, force: bool = False) -> str | None:
    """The store slug the person is working in: the session's, else their most recently used, else the first they belong to. ``None``: they have no store (onboarding)."""
    slug = None if force else ctx.session.get(STORE)
    if slug:
        return slug
    me = await api.get("/account/me")
    stores = me.get("stores") or []
    if not stores:
        return None
    last = (me.get("user") or {}).get("last_store_id")
    chosen = next((s for s in stores if s["id"] == last), stores[0])
    ctx.session.set(STORE, chosen["slug"])
    return chosen["slug"]


async def store_context(api: Api, ctx: HttpContext, slug: str) -> tuple[str, dict[str, Any]]:
    """``(slug, context)``; a store the session names but the person no longer belongs to is dropped and re-resolved once."""
    try:
        return slug, await api.get(f"/account/stores/{slug}/context")
    except ApiFailure as error:
        if error.status != 404:
            raise
        ctx.session.delete(STORE)
        again = await resolve_store(api, ctx, force=True)
        if again is None:
            raise
        return again, await api.get(f"/account/stores/{again}/context")


def login_redirect(ctx: HttpContext) -> Any:
    return common.to(ctx, "/login")


async def explain(ctx: HttpContext, error: ApiFailure) -> Any:
    """A failed page load, as a page: sign in again, a 403 screen, a 404, or a plain holding message."""
    if error.status == 401:
        common.api_of(ctx).sign_out()
        return login_redirect(ctx)
    if error.status == 403:
        permission = (error.details or {}).get("permission") if isinstance(error.details, dict) else None
        return await render("errors/Forbidden", {"permission": permission}, status_code=403)
    if error.status == 404:
        return html(f"<h1>Not found</h1><p>{error.message}</p>", status_code=404)
    return html(f"<h1>Something went wrong</h1><p>{error.message}</p>", status_code=502 if error.status >= 500 else error.status)


# ── pages ────────────────────────────────────────────────────────────────

def page_handler(page: Page) -> Any:
    async def handler(ctx: HttpContext, **params: str) -> Any:
        api = common.api_of(ctx)
        if not api.signed_in:
            return login_redirect(ctx)
        try:
            slug = await resolve_store(api, ctx)
            if slug is None:
                return common.to(ctx, "/onboarding")
            query = dict(ctx.query_params)
            slug, context = await store_context(api, ctx, slug)
            path = page.api.format(store=slug, **params)
            body, *extra = await common.gather(api.call("GET", path, params=query), *[api.get(p.format(store=slug, **params)) for _, p in page.also])
        except ApiFailure as error:
            return await explain(ctx, error)
        ctx.state.pb_context = context
        props = dict(body) if isinstance(body, dict) else {"data": body}
        for (prop, _), answer in zip(page.also, extra, strict=True):
            props[prop] = answer.get(prop, answer) if isinstance(answer, dict) else answer
        if page.adapt:
            props = page.adapt(props, {"shared": context, "query": query, "params": params})
        await realtime_props(ctx, page, props, context)
        return await render(page.component, props)

    return handler


async def realtime_props(ctx: HttpContext, page: Page, props: dict[str, Any], context: dict[str, Any]) -> None:
    """Pages that update live get the connection details for ``@pawabase/client`` (the publishable key is meant for browsers)."""
    if page.component in ("HelpDesk/Index", "HelpDesk/Show") and context["realtime"]["help_staff"]:
        channel = await common.api_of(ctx).get(f"/dash/{context['store']['slug']}/support/channel")
        props["realtime"] = {"channel": channel["channel"], "events": channel["events"]}


# ── forms and fetches ────────────────────────────────────────────────────

def path_params(browser: str, api: str) -> list[tuple[str, str]]:
    """Pair the browser path's parameters with the Pawabase path's, in order: ``{id}`` ↔ ``{product_id}``."""
    ours = [n for n in re.findall(r"\{(\w+)\}", api) if n != "store"]
    theirs = re.findall(r"\{(\w+)\}", browser)
    return list(zip(theirs, ours, strict=False))


def action_handler(action: Action, *, fetch: bool = False) -> Any:
    pairs = path_params(action.path, action.api)

    async def handler(ctx: HttpContext, **params: str) -> Any:
        api = common.api_of(ctx)
        if not api.signed_in:
            return login_redirect(ctx) if not fetch and common.is_inertia(ctx) else json({"error": "Sign in to continue."}, status_code=401)
        inertia = common.is_inertia(ctx)
        try:
            slug = await resolve_store(api, ctx)
            if slug is None:
                return common.to(ctx, "/onboarding")
            api_path = common.fill(action.api, {"store": slug, **{theirs: params.get(mine) for mine, theirs in pairs}})
            body: dict[str, Any] | None = None
            if action.method != "GET":
                body = await common.body_of(ctx)
                files = body.pop("__files__", None)
                if action.upload:
                    encoded = await common.encode_upload(files or {})
                    if encoded is None:
                        return json({"error": "No file was sent."}, status_code=400)
                    body = {**{k: v for k, v in body.items() if isinstance(v, str)}, "file": encoded}
                if "__body__" in body:
                    body = body["__body__"]
            result = await api.call(action.method, api_path, json=body, params=dict(ctx.query_params) if action.method == "GET" else None)
        except ApiFailure as error:
            if error.status == 401:
                return await explain(ctx, error)
            if inertia and not fetch:
                return common.flash_failure(ctx, error, fallback=ctx.headers.get("referer", "/"))
            return common.failure_json(error)
        if fetch or not inertia:
            return json(result)
        message = result.get("message") if isinstance(result, dict) else None
        message = message or action.says
        if message:
            set_flash(ctx, "success", message)
        if action.then and isinstance(result, dict):
            return common.to(ctx, common.fill(action.then, {**params, **result}))
        return back(fallback=ctx.headers.get("referer", "/"), ctx=ctx)

    return handler


# ── switching stores, signing out ────────────────────────────────────────

async def switch_store(ctx: HttpContext) -> Any:
    api = common.api_of(ctx)
    if not api.signed_in:
        return login_redirect(ctx)
    body = await common.body_of(ctx)
    wanted = body.get("store_id") or body.get("store")
    try:
        me = await api.get("/account/me")
        chosen = next((s for s in me["stores"] if str(s["id"]) == str(wanted) or s["slug"] == wanted), None)
        if chosen is None:  # "not a member" and "no such store" look the same, or store ids become enumerable
            set_flash(ctx, "error", "You don't have access to that store.")
            return common.to(ctx, "/")
        await api.call("POST", f"/account/stores/{chosen['slug']}/switch")
    except ApiFailure as error:
        return await explain(ctx, error)
    ctx.session.set(STORE, chosen["slug"])
    return common.to(ctx, "/")


def typed(path: str) -> str:
    """``/products/{product_id}`` → ``/products/{product_id:int}``: a dashboard id is a number, and that is what keeps it apart from the shop's ``/products/{slug}`` on the same path."""
    return re.sub(r"\{(id|rev|\w+_id)\}", r"{\1:int}", path)


def specs() -> list[tuple[str, Any, list[str], str]]:
    """``(path, handler, methods, name)`` for every dashboard route; the path is the typed one, the name the plain one."""
    out: list[tuple[str, Any, list[str], str]] = []
    for page in PAGES:
        out.append((page.path, page_handler(page), ["GET"], f"page:{page.path}"))
    for action in all_actions():
        out.append((action.path, action_handler(action), ["POST"], f"action:{action.path}"))
    for fetch in FETCHES:
        out.append((fetch.path, action_handler(fetch, fetch=True), ["GET"], f"fetch:{fetch.path}"))
    out.append(("/switch-store", switch_store, ["POST"], "switch-store"))
    return out


__all__ = ["ACCESS", "specs", "store_context"]
