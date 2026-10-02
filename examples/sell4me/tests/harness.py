"""A thin client for the live stack: the gateway, a signed-in merchant, an anonymous shopper.

The suite drives the real thing (gateway, Akountz, the API, the function workers, the database), because the things worth proving about a commerce backend
(atomic stock, idempotent settlement, tenancy, permissions) are properties of the whole stack, not of a function in isolation.
"""

from __future__ import annotations

import json
import os
import secrets
import time
from pathlib import Path
from typing import Any

import httpx

STATE = Path(os.environ.get("SELL4ME_STATE", "/tmp/sell4me-stack"))


def gateway() -> dict[str, Any]:
    """The stack's own settings, ignoring ``SELL4ME_URL`` (a WebSocket cannot go through the emulator)."""
    return json.loads((STATE / "config.json").read_text())


def config() -> dict[str, Any]:
    """The stack's settings. ``SELL4ME_URL`` points every request at another address (the emulator, ``pawabase emulate``, which forwards what it does not run)."""
    cfg = json.loads((STATE / "config.json").read_text())
    if os.environ.get("SELL4ME_URL"):
        cfg["url"] = os.environ["SELL4ME_URL"].rstrip("/")
    return cfg


class Api:
    """Calls the gateway as one principal. ``token`` None is an anonymous shopper (publishable key only)."""

    def __init__(self, token: str | None = None, *, store_key: str | None = None) -> None:
        self.cfg = config()
        self.token = token
        self.store_key = store_key
        self.http = httpx.Client(base_url=self.cfg["url"], timeout=60)

    def headers(self, extra: dict[str, str] | None = None) -> dict[str, str]:
        headers = {"apikey": self.cfg["publishable"], **(extra or {})}
        if self.token:
            headers["Authorization"] = f"Bearer {self.token}"
        if self.store_key:
            headers["x-store-key"] = self.store_key
        return headers

    def call(self, method: str, path: str, *, json: Any = None, params: dict[str, Any] | None = None, headers: dict[str, str] | None = None) -> httpx.Response:
        prefix = "" if path.startswith(("/auth/", "/storage/", "/hooks/")) else "/rest/v1"
        return self.http.request(method, f"{prefix}{path}", json=json, params=params, headers=self.headers(headers))

    def get(self, path: str, **kw: Any) -> httpx.Response:
        return self.call("GET", path, **kw)

    def post(self, path: str, body: Any = None, **kw: Any) -> httpx.Response:
        return self.call("POST", path, json=body if body is not None else {}, **kw)

    def patch(self, path: str, body: Any = None, **kw: Any) -> httpx.Response:
        return self.call("PATCH", path, json=body if body is not None else {}, **kw)

    def delete(self, path: str, **kw: Any) -> httpx.Response:
        return self.call("DELETE", path, **kw)

    def ok(self, response: httpx.Response, *statuses: int) -> Any:
        assert response.status_code in (statuses or (200, 201)), f"{response.request.method} {response.request.url.path} -> {response.status_code}: {response.text[:600]}"
        return response.json() if response.content else None


def signup(email: str | None = None, password: str = "correct horse battery 9", name: str = "Test Merchant") -> tuple[Api, dict[str, Any]]:
    """A new merchant: an Akountz account, signed in."""
    email = email or f"m{secrets.token_hex(4)}@example.com"
    anon = Api()
    for _ in range(40):  # Akountz rate-limits sign-ups per address, which is right for production and slow for a suite that makes a merchant per test
        response = anon.call("POST", "/auth/v1/signup", json={"email": email, "password": password, "name": name})
        if response.status_code != 429:
            break
        time.sleep(float(response.json().get("retry_after", 1)) + 0.5)
    body = anon.ok(response, 200, 201)
    token = body.get("access_token") or body["session"]["access_token"]
    return Api(token), {"email": email, "password": password, "user": body.get("user")}


def new_store(api: Api, name: str | None = None, **extra: Any) -> dict[str, Any]:
    name = name or f"Shop {secrets.token_hex(3)}"
    return api.ok(api.post("/onboarding/stores", {"name": name, "currency": "USD", "country": "US", **extra}), 200, 201)


# ── what only the platform operator can do ───────────────────────────────

def operator_query(sql: str, *, write: bool = False) -> list[dict[str, Any]]:
    """Run SQL in the environment's database through the platform API (what the Studio's database console does). Tests use it to look at ground truth
    (a stock level, a ledger row) and to move time (back-date a cart), never to make something pass."""
    import asyncio

    from pawabase_core.clients import ServiceClient

    cfg = config()

    async def run() -> Any:
        client = ServiceClient("http://127.0.0.1:8001", secret="dev-internal-secret-change-me-please", issuer="studio", audience="api")
        try:
            return await client.post(f"/platform/v1/projects/{cfg['project']}/envs/{cfg['environment']}/database/query", json={"sql": sql, "allow_write": write})
        finally:
            await client.close()

    result = asyncio.run(run())
    return result.get("rows", result) if isinstance(result, dict) else result


def scalar(sql: str) -> Any:
    rows = operator_query(sql)
    return next(iter(rows[0].values())) if rows else None


def wait_for(check, *, timeout: float = 20.0, interval: float = 0.5, message: str = "condition") -> Any:
    """Poll for work done by a background job (a queued function runs a moment after the request that queued it)."""
    import time

    deadline = time.time() + timeout
    last = None
    while time.time() < deadline:
        last = check()
        if last:
            return last
        time.sleep(interval)
    raise AssertionError(f"timed out waiting for {message} (last: {last!r})")


def run_job(name: str, payload: dict[str, Any] | None = None) -> Any:
    """Run a service-only function now, as the platform's scheduler or worker would (the project's secret key may call them; clients may not)."""
    cfg = config()
    response = httpx.post(f"{cfg['url']}/functions/v1/{name}", json=payload or {}, headers={"apikey": cfg["secret"]}, timeout=120)
    assert response.status_code == 200, f"{name} -> {response.status_code}: {response.text[:500]}"
    body = response.json()
    return body.get("data", body) if isinstance(body, dict) else body


class Receiver:
    """A local HTTP endpoint that records what a merchant's webhook receives, and can be told to fail."""

    def __init__(self, port: int = 18098) -> None:
        import threading
        from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

        self.requests: list[dict[str, Any]] = []
        self.status = 200
        outer = self

        class Handler(BaseHTTPRequestHandler):
            def log_message(self, *args: Any) -> None:
                return

            def do_POST(self) -> None:  # noqa: N802
                body = self.rfile.read(int(self.headers.get("Content-Length") or 0))
                outer.requests.append({"path": self.path, "headers": {k.lower(): v for k, v in self.headers.items()}, "body": body})
                self.send_response(outer.status)
                self.end_headers()
                self.wfile.write(b"ok")

        self.server = ThreadingHTTPServer(("127.0.0.1", port), Handler)
        threading.Thread(target=self.server.serve_forever, daemon=True).start()
        self.url = f"http://127.0.0.1:{port}/hook"

    def stop(self) -> None:
        self.server.shutdown()
        self.server.server_close()
