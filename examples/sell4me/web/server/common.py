"""What every handler shares: the Pawabase client, the signed-in user's view of it, and the shapes of a failure."""

from __future__ import annotations

import asyncio
import base64
import re
from typing import Any

from pawabase import AsyncPawabase
from sillo.core.http import HttpContext
from sillo.responses import json, redirect
from sillo_inertia import back, location, render, set_errors, set_flash

from .gateway import Api, ApiFailure
from .settings import Settings

_state: dict[str, Any] = {}


def start(settings: Settings, client: AsyncPawabase) -> None:
    _state["settings"], _state["client"] = settings, client


def settings() -> Settings:
    return _state["settings"]


def client() -> AsyncPawabase:
    return _state["client"]


def api_of(ctx: HttpContext, **headers: str) -> Api:
    """This request's view of Pawabase (cached on the request)."""
    if headers:
        return Api(client(), ctx.session if "session" in ctx.scope else None, anonymous_headers={k.replace("_", "-"): v for k, v in headers.items()})
    found = getattr(ctx.state, "pb_api", None)
    if found is None:
        found = Api(client(), ctx.session if "session" in ctx.scope else None)
        ctx.state.pb_api = found
    return found


def is_inertia(ctx: HttpContext) -> bool:
    return ctx.headers.get("x-inertia", "").lower() == "true"


def to(ctx: HttpContext, url: str) -> Any:
    """Go to *url*: a full visit for an Inertia request (a redirect would be followed by XHR and render HTML as a page), a 303 otherwise."""
    return location(url) if is_inertia(ctx) else redirect(url, status_code=303)


async def body_of(ctx: HttpContext) -> dict[str, Any]:
    """The submitted body however it arrived: JSON, urlencoded, or multipart (files become ``{name: bytes}`` under ``__files__``)."""
    content_type = (ctx.headers.get("content-type") or "").lower()
    if "application/json" in content_type:
        try:
            data = await ctx.json
            return dict(data) if isinstance(data, dict) else {"__body__": data}
        except ValueError:
            return {}
    try:
        form = await ctx.form
    except ValueError:
        return {}
    out = {key: form[key] for key in form}
    if "multipart" in content_type:
        try:
            files = await ctx.files
        except ValueError:
            files = {}
        out["__files__"] = files
    return out


async def read_upload(upload: Any, limit: int = 13 * 1024 * 1024) -> bytes:
    reader = getattr(upload, "read", None)
    if reader is None:
        return bytes(upload or b"")
    data = reader()
    if hasattr(data, "__await__"):
        data = await data
    return bytes(data)[:limit]


async def encode_upload(files: dict[str, Any]) -> str | None:
    upload = files.get("file") or next(iter(files.values()), None) if files else None
    if upload is None:
        return None
    return base64.b64encode(await read_upload(upload)).decode()


def failure_json(error: ApiFailure) -> Any:
    return json({"error": error.message, "code": error.code, "details": error.details}, status_code=error.status)


def flash_failure(ctx: HttpContext, error: ApiFailure, fallback: str = "/") -> Any:
    """A rejected form post: field problems on the fields, anything else as a flash, and back to the form with what was typed."""
    fields = error.fields
    if fields:
        set_errors(ctx, fields)
    else:
        set_flash(ctx, "error", error.message)
    return back(fallback=fallback, ctx=ctx)


def fill(template: str, values: dict[str, Any]) -> str:
    return re.sub(r"\{(\w+)\}", lambda m: str(values.get(m.group(1), m.group(0))), template)


async def gather(*calls: Any) -> list[Any]:
    return list(await asyncio.gather(*calls))


__all__ = ["render", "set_flash"]
