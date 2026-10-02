"""A faithful stand-in for the parts of Paystack's API the platform calls, so the real Paystack provider code runs end to end with no network.

It answers what the provider reads (``data.authorization_url``, ``data.access_code``, ``data.status``, ``fees``, ``subaccount_code``, ``recipient_code``,
``transfer_code``) and keeps charges in memory so a test can decide their fate (``pay``/``fail``) and then deliver the signed webhook Paystack would.
Point the stack at it with the ``PAYSTACK_BASE_URL`` secret.
"""

from __future__ import annotations

import hashlib
import hmac
import json
import secrets
import threading
import time
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from typing import Any
from urllib.parse import parse_qs, urlparse

PORT = 18099
BANKS = [{"name": "Test Bank", "code": "058"}, {"name": "Other Bank", "code": "044"}]


class FakePaystack:
    def __init__(self, port: int = PORT) -> None:
        self.port = port
        self.charges: dict[str, dict[str, Any]] = {}
        self.refunds: list[dict[str, Any]] = []
        self.transfers: list[dict[str, Any]] = []
        self.calls: list[tuple[str, str]] = []
        # Real Paystack ids are unique across time; a fresh double on a long-lived stack must not reuse the last run's.
        self._next_id = int(time.time() * 1000) % 2_000_000_000
        self._server: ThreadingHTTPServer | None = None
        self.fail_transfers = False

    @property
    def url(self) -> str:
        return f"http://127.0.0.1:{self.port}"

    def start(self) -> "FakePaystack":
        fake = self

        class Handler(BaseHTTPRequestHandler):
            def log_message(self, *args: Any) -> None:  # silence
                return

            def _send(self, payload: dict[str, Any], status: int = 200) -> None:
                body = json.dumps(payload).encode()
                self.send_response(status)
                self.send_header("Content-Type", "application/json")
                self.send_header("Content-Length", str(len(body)))
                self.end_headers()
                self.wfile.write(body)

            def _body(self) -> dict[str, Any]:
                length = int(self.headers.get("Content-Length") or 0)
                return json.loads(self.rfile.read(length) or b"{}") if length else {}

            def do_GET(self) -> None:  # noqa: N802
                url = urlparse(self.path)
                fake.calls.append(("GET", url.path))
                query = {k: v[0] for k, v in parse_qs(url.query).items()}
                self._send(fake.get(url.path, query))

            def do_POST(self) -> None:  # noqa: N802
                url = urlparse(self.path)
                fake.calls.append(("POST", url.path))
                self._send(fake.post(url.path, self._body()))

        self._server = ThreadingHTTPServer(("127.0.0.1", self.port), Handler)
        threading.Thread(target=self._server.serve_forever, daemon=True).start()
        return self

    def stop(self) -> None:
        if self._server:
            self._server.shutdown()
            self._server.server_close()

    # ── the API ──────────────────────────────────────────────────────────

    def get(self, path: str, query: dict[str, str]) -> dict[str, Any]:
        if path == "/bank":
            return {"status": True, "data": BANKS}
        if path == "/bank/resolve":
            ok = query.get("account_number", "").isdigit() and len(query["account_number"]) == 10
            return {"status": True, "data": {"account_name": "TEST MERCHANT LTD"}} if ok else {"status": False, "message": "Could not resolve account name"}
        if path.startswith("/transaction/verify/"):
            charge = self.charges.get(path.rsplit("/", 1)[-1])
            if charge is None:
                return {"status": False, "message": "Transaction reference not found."}
            return {"status": True, "data": self._transaction(charge)}
        if path == "/transaction":
            return {"status": True, "data": [self._transaction(c) for c in list(self.charges.values())[-20:]]}
        if path == "/integration/payment_session_timeout":
            return {"status": True, "data": {"payment_session_timeout": 30}}
        return {"status": False, "message": f"fake: no GET {path}"}

    def post(self, path: str, body: dict[str, Any]) -> dict[str, Any]:
        if path == "/transaction/initialize":
            reference = body["reference"]
            self._next_id += 1
            self.charges[reference] = {"id": self._next_id, "reference": reference, "amount": body["amount"], "currency": body["currency"], "email": body["email"],
                                       "metadata": body.get("metadata") or {}, "status": "abandoned", "access_code": f"ac_{secrets.token_hex(6)}", "refunded": 0}
            charge = self.charges[reference]
            return {"status": True, "data": {"authorization_url": f"https://checkout.paystack.test/{charge['access_code']}", "access_code": charge["access_code"], "reference": reference}}
        if path == "/subaccount":
            return {"status": True, "data": {"subaccount_code": f"ACCT_{secrets.token_hex(5)}"}}
        if path == "/transferrecipient":
            return {"status": True, "data": {"recipient_code": f"RCP_{secrets.token_hex(5)}"}}
        if path == "/refund":
            charge = next((c for c in self.charges.values() if str(c["id"]) == str(body["transaction"]) or c["reference"] == body["transaction"]), None)
            if charge is None or charge["status"] != "success":
                return {"status": False, "message": "Transaction not found or not successful"}
            if charge["refunded"] + int(body["amount"]) > charge["amount"]:
                return {"status": False, "message": "Amount is greater than the transaction amount"}
            charge["refunded"] += int(body["amount"])
            self._next_id += 1
            refund = {"id": self._next_id, "status": "pending", "amount": int(body["amount"]), "transaction": charge["id"], "transaction_reference": charge["reference"]}
            self.refunds.append(refund)
            return {"status": True, "data": refund}
        if path == "/transfer":
            if self.fail_transfers:
                return {"status": False, "message": "Insufficient balance"}
            if any(t["reference"] == body["reference"] for t in self.transfers):
                return {"status": False, "message": "Transfer reference already used", "code": "duplicate_reference"}
            transfer = {"transfer_code": f"TRF_{secrets.token_hex(5)}", "reference": body["reference"], "amount": body["amount"], "recipient": body["recipient"], "status": "pending"}
            self.transfers.append(transfer)
            return {"status": True, "data": transfer}
        return {"status": False, "message": f"fake: no POST {path}"}

    def _transaction(self, charge: dict[str, Any]) -> dict[str, Any]:
        paid = charge["status"] == "success"
        return {"id": charge["id"], "reference": charge["reference"], "status": charge["status"], "amount": charge["amount"], "currency": charge["currency"],
                "channel": "card", "fees": (charge["amount"] * 15 // 1000 + 100) if paid else None, "gateway_response": "Successful" if paid else "Abandoned",
                "authorization": {"card_type": "visa", "last4": "4081"}, "metadata": charge["metadata"], "customer": {"email": charge["email"]}}

    # ── what a test does to the world ────────────────────────────────────

    def pay(self, reference: str) -> dict[str, Any]:
        self.charges[reference]["status"] = "success"
        return self.charges[reference]

    def fail(self, reference: str) -> dict[str, Any]:
        self.charges[reference]["status"] = "failed"
        return self.charges[reference]

    def webhook(self, event: str, data: dict[str, Any], secret: str) -> tuple[bytes, dict[str, str]]:
        """The bytes and headers Paystack would POST to the inbound hook (signed with HMAC-SHA512 of the body, keyed by the secret key)."""
        body = json.dumps({"event": event, "data": data}, separators=(",", ":")).encode()
        return body, {"x-paystack-signature": hmac.new(secret.encode(), body, hashlib.sha512).hexdigest(), "content-type": "application/json"}

    def charge_success_event(self, reference: str) -> dict[str, Any]:
        return self._transaction(self.charges[reference]) | {"status": "success"}
