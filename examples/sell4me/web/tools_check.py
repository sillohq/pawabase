"""Diff, for every dashboard page, the props the React component destructures against what the Pawabase endpoint answers. Needs a stack and a seeded store:

    python tools_seed.py            # prints email, password, slug
    PAWABASE_PUBLISHABLE_KEY=… python tools_check.py <email> <slug>
"""
import asyncio, json, os, re, sys
from server import gateway, pages, settings

ids = {"order_id": 1, "product_id": 1, "customer_id": 1, "campaign_id": 1, "design_id": 1, "page_id": 1, "session_id": 1, "ticket_id": 1}
props = json.load(open("/tmp/page_props.json"))
SHARED = {"auth", "notifications", "app", "errors", "flash", "theme"}


async def main(email: str, slug: str) -> None:
    cfg = settings.load()
    client = gateway.shared_client(cfg)
    session = await client.as_user(None).sign_in(email, "correct horse battery 9")
    api = client.as_user(session["access_token"])
    for page in pages.PAGES:
        path = page.api.format(store=slug, **ids)
        try:
            body = await api.request("GET", gateway.rest(path))
        except Exception as error:  # noqa: BLE001
            print(f"ERR  {page.component:28} {path}: {str(error)[:90]}")
            continue
        have = set(body) if isinstance(body, dict) else set()
        want = set(props.get(page.component) or []) - SHARED
        missing, extra = sorted(want - have), sorted(have - want)
        flag = "ok  " if not missing else "DIFF"
        print(f"{flag} {page.component:28} missing={missing}  has={extra}")
    await client.close()


asyncio.run(main(sys.argv[1], sys.argv[2]))
