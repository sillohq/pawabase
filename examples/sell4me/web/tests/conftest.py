"""The web app under test: started for real (uvicorn) against the live Pawabase stack (``examples/sell4me/scripts/reset.sh``), with the same stand-in for Paystack's API."""

from __future__ import annotations

import os
import re
import secrets
import socket
import subprocess
import sys
import time
from pathlib import Path

import httpx
import pytest

HERE = Path(__file__).resolve().parent
WEB = HERE.parent
sys.path[:0] = [str(HERE), str(WEB.parent / "tests")]

from browser import Browser  # noqa: E402
from fake_paystack import FakePaystack  # noqa: E402
from harness import STATE, Api, config, new_store, signup  # noqa: E402

SUFFIX = "shop.localhost:3000"


def pytest_collection_modifyitems(config, items):  # noqa: ANN001
    if not (STATE / "config.json").exists():
        skip = pytest.mark.skip(reason=f"no stack at {STATE}: run examples/sell4me/scripts/reset.sh")
        for item in items:
            item.add_marker(skip)


@pytest.fixture(scope="session")
def fake():
    server = FakePaystack().start()
    yield server
    server.stop()


@pytest.fixture(scope="session")
def web():
    with socket.socket() as probe:
        probe.bind(("127.0.0.1", 0))
        port = probe.getsockname()[1]
    cfg = config()
    env = {**os.environ, "PAWABASE_URL": cfg["url"], "PAWABASE_PUBLISHABLE_KEY": cfg["publishable"], "SELL4ME_WEB_SECRET": "test-secret-0123456789-abcdefghij", "STOREFRONT_SUFFIX": SUFFIX,
           "PYTHONPATH": f"{WEB}:{WEB.parent.parent.parent}"}
    log = open("/tmp/sell4me-web-test.log", "w")
    process = subprocess.Popen([sys.executable, "-m", "uvicorn", "server.app:app", "--port", str(port), "--log-level", "warning"], cwd=WEB, env=env, stdout=log, stderr=log)
    base = f"http://127.0.0.1:{port}"
    for _ in range(60):
        try:
            if httpx.get(f"{base}/health", timeout=2).status_code == 200:
                break
        except httpx.TransportError:
            time.sleep(0.5)
    else:
        process.kill()
        raise RuntimeError("the web app did not start; see /tmp/sell4me-web-test.log")
    yield base
    process.terminate()
    process.wait(timeout=10)


class Merchant:
    """A merchant with a launched, populated store, signed in to the web app like a browser."""

    def __init__(self, base: str, api: Api, email: str, slug: str, fake: FakePaystack) -> None:
        self.base, self.api, self.email, self.slug, self.fake = base, api, email, slug, fake
        self.browser = Browser(base)
        self.browser.http.get("/login")
        response = self.browser.post("/login", {"email": email, "password": "correct horse battery 9"})
        assert response.status_code in (302, 303, 409), response.text
        self.dash = f"/dash/{slug}"
        self.shop_host = f"{slug}.{SUFFIX}"

    def shopper(self) -> Browser:
        shopper = Browser(self.base, host=self.shop_host)
        shopper.http.get("/")
        return shopper


@pytest.fixture(scope="session")
def merchant(web, fake) -> Merchant:
    api, who = signup(password="correct horse battery 9")
    slug = new_store(api, f"Web Test {secrets.token_hex(3)}", currency="NGN", country="NG")["store"]["slug"]
    d = f"/dash/{slug}"
    api.ok(api.post(d + "/payments/payouts/connect", {"business_name": "Web", "bank_code": "058", "bank_name": "Test Bank", "account_number": "0123456789"}))
    for title, price in (("Linen shirt", 12000), ("Canvas tote", 4500)):
        api.ok(api.post(d + "/products", {"title": title, "price": price, "stock": 30, "status": "active", "track_inventory": True, "requires_shipping": True}))
    api.ok(api.post(d + "/settings/launch"))
    api.ok(api.post(d + "/discounts", {"code": "WELCOME10", "kind": "percentage", "value": 10, "is_active": True}))
    api.ok(api.post(d + "/collections", {"title": "Summer", "is_published": True}))
    api.ok(api.post(d + "/settings/help-desk", {"help_desk_enabled": True}))
    return Merchant(web, api, who["email"], slug, fake)


def destructured_props() -> dict[str, list[str] | None]:
    """What each page component takes as props, read from its source (the contract the server has to meet)."""
    out: dict[str, list[str] | None] = {}
    for path in sorted((WEB / "views" / "pages").rglob("*.tsx")):
        found = re.search(r"export default function \w+\(\s*\{([^}]*)\}", path.read_text(), re.S)
        name = str(path.relative_to(WEB / "views" / "pages"))[:-4]
        out[name] = [k.strip().split(":")[0].split("=")[0].strip() for k in found.group(1).split(",") if k.strip()] if found else None
    return out
