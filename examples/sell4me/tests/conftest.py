"""Fixtures for the live suite. Needs the stack: ``scripts/reset.sh`` (or ``stack.sh start`` + ``provision.py``)."""

from __future__ import annotations

import secrets
import sys
from pathlib import Path

import httpx
import pytest

sys.path.insert(0, str(Path(__file__).resolve().parent))

from fake_paystack import FakePaystack  # noqa: E402
from harness import STATE, Api, config, new_store, signup  # noqa: E402


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


class Shop:
    """One live shop: its merchant (signed in), slug, and an anonymous shopper client."""

    def __init__(self, merchant: Api, slug: str, fake: FakePaystack) -> None:
        self.merchant, self.slug, self.fake = merchant, slug, fake
        self.shopper = Api()
        self.base = f"/dash/{slug}"
        self.shop = f"/shop/{slug}"

    def dash(self, path: str = "") -> str:
        return f"{self.base}{path}"

    def front(self, path: str = "") -> str:
        return f"{self.shop}{path}"

    def add_product(self, title: str = "Tee", price: float | int | str = 5000, stock: int = 10, **extra) -> dict:
        body = {"title": title, "price": price, "stock": stock, "status": "active", "track_inventory": True, **extra}
        return self.merchant.ok(self.merchant.post(self.dash("/products"), body))

    def buy(self, variant_id: int, quantity: int = 1, *, email: str = "buyer@example.com", token: str | None = None, **form) -> dict:
        """Basket → checkout → provider pays → return. Returns the checkout answer plus the settled order."""
        cart = self.shopper.ok(self.shopper.post(self.front("/cart/add"), {"variant_id": variant_id, "quantity": quantity, "cart_token": token}))
        token = cart["cart_token"]
        out = self.shopper.ok(self.shopper.post(self.front("/checkout"), {"email": email, "first_name": "Ada", "last_name": "Buyer", "line1": "1 Road", "city": "Lagos",
                                                                        "country": "NG", "cart_token": token, **form}))
        self.fake.pay(out["reference"])
        done = self.shopper.ok(self.shopper.get(self.front("/checkout/return"), params={"cart": token}))
        return {**out, "return": done, "token": token}


@pytest.fixture()
def make_shop(fake):
    """A launched shop with payouts connected (Paystack's API is the stand-in), ready to sell."""

    def make(name: str | None = None, *, launch: bool = True, connect: bool = True, currency: str = "NGN", country: str = "NG") -> Shop:
        merchant, _ = signup()
        created = new_store(merchant, name or f"Shop {secrets.token_hex(3)}", currency=currency, country=country)
        shop = Shop(merchant, created["store"]["slug"], fake)
        if connect:
            merchant.ok(merchant.post(shop.dash("/payments/payouts/connect"), {"business_name": "Test Co", "bank_code": "058", "bank_name": "Test Bank", "account_number": "0123456789"}))
        if launch:
            shop.add_product("Starter", 1000, 5)
            merchant.ok(merchant.post(shop.dash("/settings/launch")))
        return shop

    return make


@pytest.fixture()
def shop(make_shop) -> Shop:
    return make_shop()


@pytest.fixture(scope="session")
def cfg():
    return config()


@pytest.fixture(scope="session")
def anon() -> Api:
    return Api()


def plain_png(width: int = 64, height: int = 48) -> bytes:
    import io

    from PIL import Image

    buffer = io.BytesIO()
    Image.new("RGB", (width, height), (200, 80, 40)).save(buffer, "PNG")
    return buffer.getvalue()
