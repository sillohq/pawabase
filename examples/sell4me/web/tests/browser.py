"""A browser-shaped HTTP client for the web app: cookies, the XSRF header, and Inertia's JSON page objects."""

from __future__ import annotations

import json
import re
from typing import Any

import httpx


class Browser:
    def __init__(self, base: str, host: str | None = None) -> None:
        self.http = httpx.Client(base_url=base, follow_redirects=False, timeout=60, headers={"host": host} if host else {})

    def xsrf(self) -> str:
        return self.http.cookies.get("XSRF-TOKEN") or ""

    def page(self, path: str, **params: Any) -> httpx.Response:
        return self.http.get(path, params=params, headers={"X-Inertia": "true", "X-Requested-With": "XMLHttpRequest", "Accept": "text/html, application/xhtml+xml"})

    def props(self, path: str, **params: Any) -> tuple[str, dict[str, Any]]:
        response = self.page(path, **params)
        if response.status_code == 409 and response.headers.get("x-inertia-location"):
            raise Redirected(response.headers["x-inertia-location"])
        assert response.status_code == 200, f"{path} -> {response.status_code} {response.text[:300]}"
        data = response.json() if "json" in response.headers.get("content-type", "") else json.loads(re.search(r'data-page="([^"]*)"', response.text).group(1).replace("&quot;", '"'))
        return data["component"], data["props"]

    def post(self, path: str, body: Any = None, *, inertia: bool = True, **kw: Any) -> httpx.Response:
        if not self.xsrf():
            self.http.get("/login")
        headers = {"X-XSRF-TOKEN": self.xsrf(), **({"X-Inertia": "true", "X-Requested-With": "XMLHttpRequest"} if inertia else {"Accept": "application/json"})}
        return self.http.post(path, json=body if body is not None else {}, headers=headers, **kw)


class Redirected(Exception):
    def __init__(self, location: str) -> None:
        super().__init__(location)
        self.location = location
