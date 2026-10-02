"""Assembling the app: session, CSRF, Inertia, the dashboard, the shop, and the storage proxy.

    uvicorn server.app:app --port 3000          (PAWABASE_PUBLISHABLE_KEY and friends in the environment or .env)
"""

from __future__ import annotations

import hashlib
import logging
from typing import Any

from sillo import SilloApp
from sillo.core.http import HttpContext
from sillo.core.routing import Group, Route
from sillo.responses import json, raw
from sillo.security.csrf import CSRFConfig, CSRFMiddleware
from sillo.session import SessionConfig, SessionMiddleware
from sillo.static import StaticFiles
from sillo_inertia import Inertia, always, vite_react

from . import auth, common, dashboard, shop
from .gateway import shared_client
from .settings import BASE_DIR, Settings, load

log = logging.getLogger("sell4me.web")
BUILD_DIR = BASE_DIR / "static" / "build"
MANIFEST = BUILD_DIR / ".vite" / "manifest.json"
ENTRY = "js/main.tsx"


def asset_version(settings: Settings) -> str | None:
    if settings.vite_dev or not MANIFEST.is_file():
        return None
    return hashlib.sha256(MANIFEST.read_bytes()).hexdigest()[:12]


def auth_prop(ctx: HttpContext) -> dict[str, Any]:
    """Who is signed in and what they may do (cosmetic: the platform refuses what they may not)."""
    found = getattr(ctx.state, "pb_context", None)
    if found is None:
        return {"user": None, "store": None, "permissions": []}
    return {"user": found["user"], "store": found["store"], "role": found["role"], "permissions": found["permissions"]}


def notifications_prop(ctx: HttpContext) -> dict[str, Any]:
    found = getattr(ctx.state, "pb_context", None)
    return found["notifications"] if found else {"unread": 0}


def build_inertia(settings: Settings) -> Inertia:
    inertia = Inertia(
        root_view=BASE_DIR / "resources" / "views" / "app.html",
        base_dir=BASE_DIR,
        version=lambda: asset_version(settings),
        root_id="app",
        vite=vite_react(entry=ENTRY, dev=settings.vite_dev, dev_server=settings.vite_dev_server, manifest_path=MANIFEST, asset_prefix="/assets/"),
    )
    inertia.view_data["title"] = settings.app_name
    inertia.share(
        auth=always(auth_prop),
        notifications=always(notifications_prop),
        # `pawabase` is what @pawabase/client needs in the browser: the gateway and the PUBLISHABLE key (meant for browsers).
        app=always(lambda _: {"name": settings.app_name, "env": settings.environment, "platform_fee": {"minor": 0, "currency": "NGN"},
                              "pawabase": {"url": settings.pawabase_url, "key": settings.publishable_key, "project": settings.project, "environment": settings.environment}}),
    )
    return inertia


async def storage_proxy(ctx: HttpContext, rest: str) -> Any:
    """Product images and other public objects: ``/storage/v1/object/media/…`` on this origin is the project's storage, fetched with the publishable key.

    Only reads, only the object routes: nothing else of the platform is reachable through here.
    """
    if not rest.startswith("v1/object/"):
        return json({"error": "Not found"}, status_code=404)
    upstream = await common.client().download(f"/storage/{rest}", params=dict(ctx.query_params))
    headers = {k: v for k, v in upstream.headers.items() if k.lower() in ("content-type", "cache-control", "etag", "last-modified")}
    return raw(upstream.content, content_type=headers.pop("content-type", "application/octet-stream"), headers=headers, status_code=upstream.status_code)


async def health(ctx: HttpContext) -> Any:
    try:
        await common.client().auth_settings()
        return json({"app": "sell4me-web", "pawabase": "ok"})
    except Exception as error:  # noqa: BLE001
        return json({"app": "sell4me-web", "pawabase": f"failed: {error}"}, status_code=503)


def by_host(shop_handler: Any, dashboard_handler: Any) -> Any:
    """The same path answers for a shop and for the dashboard; the hostname decides."""

    async def handler(ctx: HttpContext, **params: str) -> Any:
        if await shop.shop_slug(ctx):
            return await shop_handler(ctx, **params)
        return await dashboard_handler(ctx, **params)

    return handler


def create_app(settings: Settings | None = None) -> SilloApp:
    settings = settings or load()
    for problem in settings.problems():
        log.warning(problem)
    client = shared_client(settings)
    common.start(settings, client)

    # Dashboard first: its literal paths (``/products/new``) and numeric ids must be tried before the shop's ``/products/{slug}``.
    routes: list[Route] = [*auth.routes()]
    shared = shop.SHARED_SHOP
    for path, handler, methods, name in dashboard.specs():
        routes.append(Route(dashboard.typed(path), handler=by_host(shared[path], handler) if path in shared and "GET" in methods else handler, methods=methods, name=name))
    routes += shop.routes()
    routes += [Route("/storage/{rest:path}", handler=storage_proxy, methods=["GET"], name="storage"), Route("/health", handler=health, methods=["GET"], name="health")]

    app = SilloApp(debug=False, title=settings.app_name, version="1.0.0", routes=routes)
    inertia = build_inertia(settings)
    inertia.middleware(app)
    app.state["inertia"] = inertia
    app.use(CSRFMiddleware(config=CSRFConfig(enabled=True, cookie_name="XSRF-TOKEN", header_name="X-XSRF-TOKEN", cookie_httponly=False, cookie_secure=settings.cookie_secure, secret_key=settings.secret)))
    app.use(SessionMiddleware(config=SessionConfig(session_cookie_name="sell4me_session", session_expiration_time=60 * 60 * 24 * 14, session_cookie_secure=settings.cookie_secure), secret_key=settings.secret))

    assets = BUILD_DIR / "assets"
    if assets.is_dir():
        app.add_route(Group(path="/assets", app=StaticFiles(directory=str(assets))))
    public = BASE_DIR / "public"
    if public.is_dir():
        app.add_route(Group(path="/static", app=StaticFiles(directory=str(public))))

    async def close() -> None:
        await client.close()

    app.on_shutdown(close)
    return app


app = create_app()
