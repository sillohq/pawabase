"""Configuration, from the environment (and ``.env`` next to ``package.json``).

========================  ===================================================================  =====================
Variable                  Meaning                                                              Default
========================  ===================================================================  =====================
PAWABASE_URL              The Pawabase gateway                                                 http://127.0.0.1:8080
PAWABASE_PUBLISHABLE_KEY  The project's publishable key (``pb_pk_…``): safe to ship to browsers  (required)
PAWABASE_PROJECT          Project reference                                                    sell4me
PAWABASE_ENVIRONMENT      Environment                                                          development
SELL4ME_WEB_SECRET        Signs the session and CSRF cookies                                   (dev value; set it)
SELL4ME_WEB_ORIGIN        Public origin of this app (links in emails are the platform's)        http://localhost:3000
STOREFRONT_SUFFIX         Shops are served at ``<slug>.<suffix>`` (must match the platform's)  shop.localhost:3000
VITE_DEV                  ``1``: assets from the Vite dev server                               0
VITE_DEV_SERVER           The Vite dev server                                                  http://localhost:5173
========================  ===================================================================  =====================

There is no secret Pawabase key here, on purpose: this server acts *as the signed-in user* (their access token, from the session) or as an anonymous shopper (the
publishable key alone), so a bug in this app cannot do more than the person using it could.
"""

from __future__ import annotations

import os
from dataclasses import dataclass
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parents[1]


def _dotenv() -> dict[str, str]:
    path = BASE_DIR / ".env"
    out: dict[str, str] = {}
    if path.is_file():
        for line in path.read_text().splitlines():
            line = line.strip()
            if line and not line.startswith("#") and "=" in line:
                key, _, value = line.partition("=")
                out[key.strip()] = value.strip().strip("\"'")
    return out


@dataclass(frozen=True)
class Settings:
    pawabase_url: str
    publishable_key: str
    project: str
    environment: str
    secret: str
    origin: str
    storefront_suffix: str
    vite_dev: bool
    vite_dev_server: str
    app_name: str = "Sell4me"

    @property
    def scheme(self) -> str:
        return "https" if self.origin.startswith("https://") else "http"

    @property
    def cookie_secure(self) -> bool:
        return self.scheme == "https"

    def problems(self) -> list[str]:
        out = []
        if not self.publishable_key:
            out.append("PAWABASE_PUBLISHABLE_KEY is not set (the project's pb_pk_… key).")
        elif not self.publishable_key.startswith("pb_pk_"):
            out.append("PAWABASE_PUBLISHABLE_KEY must be the PUBLISHABLE key (pb_pk_…); a secret key must never reach a browser-facing server.")
        if self.secret.startswith("dev-") and self.scheme == "https":
            out.append("SELL4ME_WEB_SECRET is the development value but the app is served over https.")
        return out


def load() -> Settings:
    env = {**_dotenv(), **os.environ}

    def get(name: str, default: str = "") -> str:
        return env.get(name, default)

    return Settings(
        pawabase_url=get("PAWABASE_URL", "http://127.0.0.1:8080").rstrip("/"),
        publishable_key=get("PAWABASE_PUBLISHABLE_KEY"),
        project=get("PAWABASE_PROJECT", "sell4me"),
        environment=get("PAWABASE_ENVIRONMENT", "development"),
        secret=get("SELL4ME_WEB_SECRET", "dev-only-insecure-web-secret-change-me"),
        origin=get("SELL4ME_WEB_ORIGIN", "http://localhost:3000").rstrip("/"),
        storefront_suffix=get("STOREFRONT_SUFFIX", "shop.localhost:3000"),
        vite_dev=get("VITE_DEV", "0").lower() in ("1", "true", "yes"),
        vite_dev_server=get("VITE_DEV_SERVER", "http://localhost:5173"),
    )
