"""Create the Sell4me project on a running local stack from the blueprint, set its secrets, and install what a blueprint cannot carry.

    PYTHONPATH=<repo> python scripts/provision.py <state dir> [--env development]

Writes <state dir>/config.json: gateway URL, project, environment and the publishable and secret keys.
"""

from __future__ import annotations

import asyncio
import json
import os
import subprocess
import sys
from pathlib import Path

from pawabase_core.clients import ServiceClient

ROOT = Path(__file__).resolve().parent.parent
GATEWAY, API = "http://127.0.0.1:18080", "http://127.0.0.1:8001"
SECRET = "dev-internal-secret-change-me-please"
REF = "sell4me"

#: Dev/test values. In a real deployment set PAYSTACK_* to the platform's keys and SELL4ME_SECRET_KEY to a long random value.
SECRETS = {
    "SELL4ME_SECRET_KEY": "dev-sell4me-secret-key-change-me-0123456789",
    "PAYSTACK_SECRET_KEY": "sk_test_dummy_not_used_by_the_sandbox",
    "PAYSTACK_PUBLIC_KEY": "pk_test_dummy_not_used_by_the_sandbox",
    "APP_URL": "http://localhost:3000",
    "STOREFRONT_SUFFIX": "shop.localhost:3000",
    "SANDBOX_ENABLED": "true",
    "WEBHOOKS_ALLOW_PRIVATE": "true",  # the tests receive deliveries on 127.0.0.1; never set this in production
    # The tests run a stand-in for Paystack's API here (tests/fake_paystack.py). Unset it to talk to the real one.
    "PAYSTACK_BASE_URL": "http://127.0.0.1:18099",
}


async def main(state: str, env: str) -> None:
    api = ServiceClient(API, secret=SECRET, issuer="studio", audience="api")
    blueprint = json.loads((ROOT / "sell4me.blueprint.json").read_text())
    created = await api.post("/platform/v1/projects", json={"ref": REF, "name": "Sell4me", "environments": [env], "blueprint": blueprint})
    base = f"/platform/v1/projects/{REF}/envs/{env}"
    keys = created["keys"][env]
    for name, value in SECRETS.items():
        await api.put(f"{base}/secrets/{name}", json={"value": value, "description": "Sell4me platform setting"})

    # What a blueprint cannot say: composite unique keys (a store's slugs and order numbers are unique per store, not globally).
    uniques = json.loads((ROOT / "blueprint" / "unique_together.json").read_text())
    for table, groups in uniques.items():
        for group in groups:
            name = f"ux_{table}_{'_'.join(group)}"[:60]
            await api.post(f"{base}/database/query", json={
                "sql": f"CREATE UNIQUE INDEX IF NOT EXISTS {name} ON {table} ({', '.join(group)})", "allow_write": True})

    # The inbound Paystack hook is signed with the Paystack secret key.
    hook = next(h for h in blueprint["definitions"]["inbound-hooks"] if h["slug"] == "paystack")
    await api.put(f"{base}/inbound-hooks/paystack", json={**hook, "secret": SECRETS["PAYSTACK_SECRET_KEY"], "enabled": True})

    # The functions are deployed the way a developer deploys them: the CLI, a secret key, the URL, the environment.
    deploy = subprocess.run(
        [sys.executable, "-m", "pawabase.cli", "deploy", "--yes", "--force"],
        cwd=ROOT, capture_output=True, text=True,
        env={**os.environ, "PAWABASE_URL": GATEWAY, "PAWABASE_API_KEY": keys["secret"], "PAWABASE_PROJECT": REF, "PAWABASE_ENVIRONMENT": env, "PYTHONPATH": str(ROOT.parent.parent)},
    )
    print(deploy.stdout.strip())
    if deploy.returncode != 0:
        raise SystemExit(f"pawabase deploy failed:\n{deploy.stderr}")

    Path(state, "env").write_text(f"PAWABASE_URL={GATEWAY}\nPAWABASE_API_KEY={keys['secret']}\nPAWABASE_PROJECT={REF}\nPAWABASE_ENVIRONMENT={env}\n")
    os.chmod(Path(state, "env"), 0o600)
    Path(state, "config.json").write_text(json.dumps({
        "url": GATEWAY, "project": REF, "environment": env, "publishable": keys["publishable"], "secret": keys["secret"],
        "hook_secret": SECRETS["PAYSTACK_SECRET_KEY"]}, indent=2))
    await api.close()
    print("provisioned", REF, env, "->", f"{state}/config.json", f"(deploy/emulate with: set -a; . {state}/env; set +a)")


if __name__ == "__main__":
    asyncio.run(main(sys.argv[1], sys.argv[sys.argv.index("--env") + 1] if "--env" in sys.argv else "development"))
