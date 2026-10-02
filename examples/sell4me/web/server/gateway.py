"""Talking to Pawabase as the person using the app.

One :class:`AsyncPawabase` for the process (a single connection pool); per request, :class:`Api` takes a view of it carrying that person's access token. The tokens live in
the signed session cookie, and an expired access token is refreshed once, transparently, and the call replayed.
"""

from __future__ import annotations

from typing import Any

from pawabase import AsyncPawabase, PawabaseError

from .settings import Settings

ACCESS, REFRESH = "pb_access", "pb_refresh"
PLATFORM_PREFIXES = ("/auth/", "/storage/", "/functions/", "/flows/", "/realtime/", "/rest/")


def rest(path: str) -> str:
    """Application routes live under ``/rest/v1``; the platform's own services keep their prefixes."""
    return path if path.startswith(PLATFORM_PREFIXES) else f"/rest/v1{path}"


class ApiFailure(Exception):
    """A Pawabase call that failed, as the page needs to see it."""

    def __init__(self, status: int, code: str, message: str, details: Any = None) -> None:
        super().__init__(message)
        self.status, self.code, self.message, self.details = status, code, message, details

    @classmethod
    def of(cls, error: PawabaseError) -> ApiFailure:
        body = error.detail if isinstance(error.detail, dict) else {}
        inner = body.get("detail") if isinstance(body.get("detail"), dict) else body
        code = inner.get("error") if isinstance(inner.get("error"), str) else error.code or "error"
        message = inner.get("message") if isinstance(inner.get("message"), str) else error.message
        details = inner.get("details")
        # Pydantic-style validation lists ([{"loc": [...], "msg": ...}]) become {field: message}
        if isinstance(error.detail, list):
            details = {".".join(str(p) for p in item.get("loc", [])[1:]) or "": item.get("msg", "") for item in error.detail if isinstance(item, dict)}
            message = "Check the highlighted fields."
        return cls(error.status_code or 502, str(code), str(message), details)

    @property
    def fields(self) -> dict[str, str]:
        """Per-field problems, when the platform sent them as ``{field: message}``."""
        return {str(k): str(v) for k, v in self.details.items()} if isinstance(self.details, dict) and all(isinstance(v, str) for v in self.details.values()) else {}


def shared_client(settings: Settings) -> AsyncPawabase:
    return AsyncPawabase(settings.pawabase_url, settings.publishable_key, project=settings.project, environment=settings.environment, timeout=60.0, retries=1)


class Api:
    """Pawabase, as whoever the session says is signed in (or anonymously)."""

    def __init__(self, shared: AsyncPawabase, session: Any | None, *, anonymous_headers: dict[str, str] | None = None) -> None:
        self.shared, self.session = shared, session
        self.extra = anonymous_headers or {}

    @property
    def signed_in(self) -> bool:
        return bool(self.session is not None and self.session.get(ACCESS))

    def _view(self) -> AsyncPawabase:
        return self.shared.as_user(self.session.get(ACCESS) if self.session is not None else None, **self.extra)

    async def call(self, method: str, path: str, *, json: Any = None, params: dict[str, Any] | None = None) -> Any:
        clean = {k: v for k, v in (params or {}).items() if v not in (None, "")}
        try:
            return await self._view().request(method, rest(path), json=json, params=clean)
        except PawabaseError as error:
            if error.status_code == 401 and await self._refresh():
                try:
                    return await self._view().request(method, rest(path), json=json, params=clean)
                except PawabaseError as again:
                    raise ApiFailure.of(again) from again
            raise ApiFailure.of(error) from error

    async def get(self, path: str, **params: Any) -> Any:
        return await self.call("GET", path, params=params)

    async def _refresh(self) -> bool:
        if self.session is None or not self.session.get(REFRESH):
            return False
        try:
            fresh = await self.shared.as_user(None).refresh_session(self.session.get(REFRESH))
        except PawabaseError:
            self.sign_out()
            return False
        self.remember(fresh)
        return True

    # ── the session ─────────────────────────────────────────────────────

    def remember(self, session: dict[str, Any]) -> None:
        self.session.set(ACCESS, session["access_token"])
        self.session.set(REFRESH, session.get("refresh_token"))

    def sign_out(self) -> None:
        for key in (ACCESS, REFRESH, "store"):
            self.session.delete(key)
