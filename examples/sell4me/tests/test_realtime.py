"""The help desk's live updates ride Pawabase realtime (the original's two WebSocket endpoints)."""

from __future__ import annotations

import json
import time

from harness import gateway
from websockets.sync.client import connect


def listen(channel: str, until, *, seconds: float = 12.0, before=None):
    """Subscribe, run ``before`` (which causes something to be published), and collect frames until ``until(frame)`` holds."""
    cfg = gateway()
    url = cfg["url"].replace("http", "ws", 1) + f"/realtime/v1/socket?apikey={cfg['publishable']}"
    frames: list[dict] = []
    with connect(url, open_timeout=10) as ws:
        ws.send(json.dumps({"type": "subscribe", "channel": channel, "ref": "s1"}))
        deadline, subscribed, fired = time.time() + seconds, False, False
        while time.time() < deadline:
            try:
                raw = ws.recv(timeout=1.0)
            except TimeoutError:
                raw = None
            if raw:
                frame = json.loads(raw)
                frames.append(frame)
                if frame.get("type") in ("subscribed", "ack") or frame.get("ref") == "s1":
                    subscribed = True
                if until(frame):
                    return frames
            if subscribed and not fired and before:
                fired = True
                before()
    return frames


def test_a_shopper_sees_the_staff_reply_live_on_their_ticket_channel(shop):
    m = shop.merchant
    m.ok(m.post(shop.dash("/settings/help-desk"), {"help_desk_enabled": True}))
    opened = shop.shopper.ok(shop.shopper.post(shop.front("/help/tickets"), {"email": "live@example.com", "message": "Is anyone there?"}))
    channel, tid = opened["channel"], opened["ticket"]["id"]
    frames = listen(channel, lambda f: "On our way" in json.dumps(f), before=lambda: m.ok(m.post(shop.dash(f"/support/{tid}/reply"), {"message": "On our way"})))
    assert any("On our way" in json.dumps(f) for f in frames), frames


def test_staff_see_a_new_ticket_on_the_inbox_channel_and_others_cannot_guess_it(shop):
    m = shop.merchant
    m.ok(m.post(shop.dash("/settings/help-desk"), {"help_desk_enabled": True}))
    channel = m.ok(m.get(shop.dash("/support/channel")))["channel"]
    frames = listen(channel, lambda f: "ticket.created" in json.dumps(f) or "Brand new question" in json.dumps(f),
                    before=lambda: shop.shopper.ok(shop.shopper.post(shop.front("/help/tickets"), {"email": "new@example.com", "message": "Brand new question"})))
    assert any("Brand new question" in json.dumps(f) for f in frames), frames
    # The secret is per store: another store's staff channel name is different, and a name made up by a stranger carries nothing.
    guessed = listen("help:staff:not-the-secret", lambda f: "Brand new question" in json.dumps(f), seconds=4,
                     before=lambda: shop.shopper.ok(shop.shopper.post(shop.front("/help/tickets"), {"email": "n2@example.com", "message": "Brand new question again"})))
    assert not any("Brand new question" in json.dumps(f) for f in guessed)


def test_a_client_cannot_publish_to_a_help_channel(shop):
    cfg = gateway()
    url = cfg["url"].replace("http", "ws", 1) + f"/realtime/v1/socket?apikey={cfg['publishable']}"
    with connect(url, open_timeout=10) as ws:
        ws.send(json.dumps({"type": "publish", "channel": "help:ticket:whatever", "event": "message", "payload": {"x": 1}, "ref": "p1"}))
        reply = None
        deadline = time.time() + 6
        while time.time() < deadline:
            try:
                frame = json.loads(ws.recv(timeout=1.0))
            except TimeoutError:
                continue
            if frame.get("ref") == "p1":
                reply = frame
                break
    assert reply is not None and ("error" in json.dumps(reply).lower() or reply.get("type") == "error")
