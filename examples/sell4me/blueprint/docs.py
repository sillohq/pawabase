"""Write BLUEPRINT.md: every route, table, job, schedule, hook, bucket, role and event, generated from the code that defines them.

    python blueprint/docs.py     (build.py runs it)

The document is derived, never edited: the route table comes from the ``@endpoint`` registry, the data model from the generated resources, the coverage
table from ``tools/source-routes.json`` (a dump of the original application's 174 routes) matched against each endpoint's ``original`` field. A route
that is in the original and not accounted for here makes the generator fail, so "no feature left out" is a check, not a claim.
"""

from __future__ import annotations

import json
import re
from collections import defaultdict
from pathlib import Path
from typing import Any

from sell4me_kit.endpoints import JOBS, REGISTRY
from sell4me_kit.events import EVENTS
from sell4me_kit.perms import ALL_PERMISSIONS, ROLE_PERMISSIONS, ROLES

#: (group, key, label) for every permission.
PERMISSIONS = [(group, key, label) for group, entries in ALL_PERMISSIONS.items() for key, label in entries]

HERE = Path(__file__).resolve().parent
ROOT = HERE.parent

#: Original routes that are not an endpoint here, with where the capability went instead.
ELSEWHERE: dict[tuple[str, str], str] = {
    ("POST", "/login"): "Akountz `POST /auth/v1/token` (SDK `auth.signInWithPassword`)",
    ("GET", "/register"): "Akountz: the sign-up form is the client's; the survey answers go to `PATCH /account/profile`",
    ("POST", "/register"): "Akountz `POST /auth/v1/signup`; `GET /account/me` creates the profile on first use",
    ("POST", "/logout"): "Akountz `POST /auth/v1/logout`",
    ("GET", "/forgot-password"): "Akountz recovery (`/auth/v1/recover`)",
    ("POST", "/forgot-password"): "Akountz `POST /auth/v1/recover`",
    ("GET", "/reset-password/{token}"): "Akountz recovery link",
    ("POST", "/reset-password/{token}"): "Akountz `POST /auth/v1/verify` + `PUT /auth/v1/user`",
    ("GET", "/media/{key:path}"): "Storage `GET /storage/v1/object/media/{key}`: the `media` bucket is public",
    ("POST", "/{provider_key}/{slug}"): "Inbound hook `POST /hooks/v1/{project}/{env}/paystack` (signature verified by the platform) then function `payments.webhook_event`",
}


def shape(path: str) -> str:
    return re.sub(r"\{[^}]*\}", "{}", path).rstrip("/") or "/"


def claims() -> dict[tuple[str, str], list[str]]:
    out: dict[tuple[str, str], list[str]] = defaultdict(list)
    for endpoint in REGISTRY.values():
        for part in re.split(r",\s*(?=(?:GET|POST|PATCH|DELETE|PUT|WS)\s)", endpoint.original):
            found = re.match(r"(GET|POST|PATCH|DELETE|PUT|WS)\s+(\S+)", part.strip())
            if found:
                out[(found.group(1), shape(found.group(2).split("?")[0]))].append(endpoint.name)
    return out


def coverage() -> tuple[list[tuple[str, str, str, str]], list[tuple[str, str, str]]]:
    """(rows of covered originals, originals nobody accounts for)."""
    source = json.loads((ROOT / "tools" / "source-routes.json").read_text())
    claimed = claims()
    rows, missing = [], []
    for route in source:
        prefix = "/api" if route["src"] == "api" else ""
        for method in (m for m in route["methods"] if m != "HEAD"):
            key = (method, shape(prefix + route["path"]))
            where = ", ".join(f"`{n}`" for n in sorted(set(claimed.get(key, []))))
            note = ELSEWHERE.get((method, route["path"]), "")
            if where or note:
                rows.append((method, prefix + route["path"], route["name"], where or note))
            else:
                missing.append((method, prefix + route["path"], route["name"]))
    return rows, missing


def md_table(header: list[str], rows: list[list[Any]]) -> str:
    if not rows:
        return "_none_\n"
    esc = lambda v: str(v if v is not None else "").replace("|", "\\|").replace("\n", " ")  # noqa: E731
    return "\n".join(["| " + " | ".join(header) + " |", "|" + "|".join("---" for _ in header) + "|", *("| " + " | ".join(esc(c) for c in row) + " |" for row in rows)]) + "\n"


def fields_of(route: dict[str, Any]) -> str:
    return ", ".join(f"`{f['name']}`" + ("*" if f.get("required") else "") for f in route.get("input_fields", [])) or ""


def render(blueprint: dict[str, Any], build_report: dict[str, Any]) -> str:
    d = blueprint["definitions"]
    routes, resources = d["routes"], d["resources"]
    unique = json.loads((HERE / "unique_together.json").read_text())
    rows, missing = coverage()
    if missing:
        raise SystemExit("Original routes with no counterpart:\n" + "\n".join(f"  {m} {p} ({n})" for m, p, n in missing))
    by_area: dict[str, list[dict[str, Any]]] = defaultdict(list)
    for route in routes:
        by_area[route["tags"][0]].append(route)
    spec_perm = {e.name: e.permission for e in REGISTRY.values()}
    out: list[str] = []
    w = out.append

    w(f"# {blueprint['name']} — the blueprint\n")
    w(f"{blueprint['description']}\n")
    w("> Generated by `blueprint/build.py` from the code that defines the backend. Do not edit: change the code and rebuild.\n")
    w("## At a glance\n")
    w(md_table(["", "count"], [["Resources (tables)", len(resources)], ["Composite unique indexes (installed by `scripts/provision.py`)", sum(len(v) for v in unique.values())],
                               ["HTTP routes", len(routes)], ["Job functions (no route)", len(JOBS)], ["Schedules", len(d["schedules"])], ["Inbound webhooks", len(d["inbound-hooks"])],
                               ["Event subscriptions", len(d["subscriptions"])], ["Storage buckets", len(d["buckets"])], ["Roles (platform)", len(blueprint["roles"])],
                               ["Store roles / permissions", f"{len(ROLES)} / {len(PERMISSIONS)}"], ["Domain events", len(EVENTS)], ["Original routes accounted for", f"{len(rows)} of {len(rows)}"]]))

    w("## Deploying it\n")
    w("""```bash
python blueprint/build.py                       # regenerate sell4me.blueprint.json and this file
# create the project from the blueprint (what scripts/provision.py does against a local stack):
#   POST /platform/v1/projects   {"ref": "sell4me", "name": "Sell4me", "environments": ["development"], "blueprint": <sell4me.blueprint.json>}
# the functions are code, deployed with the pawabase kit: URL + a secret key + project + environment (+ branch), from .env / pawabase.toml / flags
cp .env.example .env && $EDITOR .env              # PAWABASE_URL, PAWABASE_API_KEY=pb_sk_…
pawabase deploy                                   # bundles code/sell4me/functions + kit/sell4me_kit, checks they import, uploads, activates
pawabase deploy --branch my-feature               # or beside main, reachable with ?branch=my-feature
pawabase emulate --watch                          # run them locally on :8787 against the deployment (forwards everything else)
# then set the secrets below, install the composite unique indexes, and set the paystack inbound hook's secret
scripts/reset.sh                                  # all of the above, against a throwaway local stack on SQLite
```

A blueprint carries *definitions* and never secrets, data or users. After creating the project: set the secrets (next section), run the composite-index
statements in `blueprint/unique_together.json` (Pawabase resources have single-column unique only), and `PUT` the `paystack` inbound hook with
`secret` = the platform's Paystack secret key (Paystack signs every delivery with it).
""")
    w("## Secrets (the platform's settings)\n")
    w(md_table(["Secret", "Meaning", "Default"], [
        ["`SELL4ME_SECRET_KEY`", "Signs preview links and encrypts stored provider keys. **Set a long random value.**", "(insecure dev value)"],
        ["`PAYSTACK_SECRET_KEY` / `PAYSTACK_PUBLIC_KEY`", "The platform's Paystack account: every store is charged through it and paid out from it", "(none: checkout is unavailable)"],
        ["`PAYSTACK_BASE_URL`", "Paystack's API origin (point at a test double)", "https://api.paystack.co"],
        ["`PLATFORM_SPLIT_PERCENT` / `PLATFORM_FEE_MINOR` / `PLATFORM_FEE_CURRENCY`", "The platform's cut of each order: a percentage, and a flat fee", "5 / 100 / NGN"],
        ["`APP_URL`", "The dashboard's public URL (links in emails; https turns test mode off)", "http://localhost:3000"],
        ["`STOREFRONT_SUFFIX`", "Shops live at `<slug>.<suffix>`", "shop.localhost:3000"],
        ["`MAIL_FROM` / `MAIL_FROM_NAME`", "Sender of every email", "orders@commerce.local / SELL4ME"],
        ["`MEDIA_BASE_URL`", "A CDN origin for product images (otherwise the storage API path)", "(none)"],
        ["`SANDBOX_ENABLED`", "Allow the offline sandbox payment provider. **Never in production.**", "false"],
        ["`WEBHOOKS_ALLOW_PRIVATE`", "Let merchant webhooks target private addresses and plain http. **Dev/test only.**", "false"]]))
    w("Platform (not project) setting: `PAWABASE_TRUSTED_PROXY_HOPS` (default 0) — how many proxies sit in front of the gateway. The caller's address that risk scoring and the audit trail record is taken from the right of `X-Forwarded-For`, never the left, which a caller controls.\n")
    w("Runtime dependencies of the functions: `Pillow` (images, receipts), `openpyxl` (the Excel export), `httpx`, and Node with `tailwindcss` for the page builder's per-page CSS. See `requirements.txt`.\n")

    w("## What changed from the original, and why\n")
    w("Same features; different mechanics where the platform differs. Each row is a decision, not an omission.\n")
    w(md_table(["Original", "Here", "Why"], [
        ["Inertia pages, session cookie, CSRF, flash messages", "JSON endpoints under `/rest/v1`, Akountz JWT, errors as `{error, message, details}`", "A backend with any frontend; the shop and dashboard are separate clients"],
        ["Login, register, password reset, MFA on a `User` model", "Akountz; a `profiles` row keeps what `User` held (name, avatar, timezone, last store, signup survey)", "Identity is the platform's"],
        ["Store resolved from the session / `Host` header", "Store named in the path (`/dash/{store}`, `/shop/{store}`); `GET /hosts/resolve?host=` maps a hostname to it", "A tenant is never taken from anything the caller can forge: the dashboard looks up the caller's *membership of that store* on every call"],
        ["Tortoise ORM with foreign keys and transactions", "`ctx.runtime.db()` / `.transaction()`: parameterised SQL with typed encode/decode, ids kept by the code", "Pawabase resources have no referential integrity or ORM"],
        ["In-process listeners on an event bus", "`events.emit` calls listeners that queue job *functions* (`c.dispatch`)", "Slow work leaves the request; the queue is at-least-once so every job is idempotent"],
        ["Redis queue workers", "Pawabase function jobs + schedules", "One platform queue"],
        ["Cookie cart session", "A basket token held by the client (`x-cart-token`), echoed in every basket response", "No session on a public API"],
        ["Provider webhook: `POST /webhooks/{provider}/{store-slug}`, raw-body signature check in the app", "Inbound hook verifies HMAC-SHA512 first; `payments.webhook_event` finds the store from the charge's metadata or reference", "One URL per provider; the signature check moved to the platform"],
        ["Sandbox charges in a process dict and a hosted page", "`sandbox_charges` table; the storefront draws its own pay screen from `GET /shop/{store}/sandbox/{ref}`", "Functions run in separate workers: memory is not shared"],
        ["Files on local disk; `GET /media/{key}`", "Storage buckets `media` (public) and `exports` (private, signed URLs)", "Platform storage"],
        ["Merchant webhooks could point anywhere", "Destinations on private/loopback/link-local addresses are refused when saved and on every attempt", "A merchant-chosen URL must not reach the platform's own network"],
        ["`PATCH`-less forms (every field sent)", "`PATCH` is partial; `null` and *not sent* mean the same, and `\"\"` clears a field", "API clients send only what changed"],
        ["Money typed as form strings", "Money fields accept a number or a decimal string; all arithmetic is integer minor units (`money.py`)", "Unchanged invariant: floats never touch money"],
        ["Discount `fixed` (API) vs `fixed_amount` (dashboard)", "Both accepted; stored as `fixed_amount`", "The original API created a kind the evaluator did not price"],
        ["`SANDBOX_ENABLED` default on", "Default off", "A fake payment provider must be opted into"]]))

    w("## Coverage: every route of the original\n")
    w(f"The original has {len(rows)} routes (141 dashboard, 19 shop, 13 merchant-API, 1 webhook) plus two WebSocket endpoints. Each is below with where it went.\n")
    w(md_table(["Method", "Original path", "Original name", "Here"], [[m, f"`{p}`", n, h] for m, p, n, h in rows]))
    w("WebSockets `GET /help-desk/ws` (staff) and `GET /help/ws/{token}` (shopper) → Pawabase realtime channels `help:staff:<store secret>` and `help:ticket:<ticket token>`; "
      "`GET /dash/{store}/support/channel` hands a member holding `support.read` the staff channel name. Clients may not publish to either.\n")

    w("## Routes\n")
    w("All paths are under `/rest/v1` on the gateway. `policy` is the platform's gate (`public` = anyone with the project's publishable key, `authenticated` = a signed-in user); "
      "a **permission** is checked by the function against the caller's *membership of the named store* (an unknown store, or one the caller is not in, is a 404). "
      "`*` marks a required field. `PATCH` fields are never required.\n")
    for area in sorted(by_area):
        w(f"### {area}\n")
        w(md_table(["Method", "Path", "Name", "Policy", "Permission", "Input", "What it does"],
                   [[r["method"], f"`{r['path']}`", f"`{r['name']}`", r["policy"], spec_perm.get(r["name"]) or "", fields_of(r), r["description"]] for r in sorted(by_area[area], key=lambda r: (r["path"], r["method"]))]))

    w("## Jobs (functions with no route)\n")
    w("Service-only: no client can call them. Reached by a schedule, an event subscription, or a handler that queued them.\n")
    w(md_table(["Function", "What it does"], [[f"`{n}`", s] for n, s in sorted(JOBS.items())]))
    w("### Schedules\n")
    w(md_table(["Name", "When", "Runs", "Why"], [[f"`{s['name']}`", s.get("cron") or f"every {s['interval_seconds']}s", f"`{s['target']}`", s["description"]] for s in d["schedules"]]))
    w("### Inbound webhooks and subscriptions\n")
    w(md_table(["Hook", "URL", "Verification", "Delivers to"], [[f"`{h['slug']}`", f"`/hooks/v1/{{project}}/{{env}}/{h['slug']}`", f"{h['verification']} (`{h['signature_header']}`)" if h["verification"] != "none" else "none",
                                                            f"event `{h['target']}`" + ("" if h.get("enabled", True) else " (disabled)")] for h in d["inbound-hooks"]]))
    w(md_table(["Subscription", "Event", "Runs"], [[f"`{s['name']}`", f"`{s['event']}`", f"`{s['target']}`" + ("" if s.get("enabled", True) else " (disabled)")] for s in d["subscriptions"]]))
    w("### Buckets\n")
    w(md_table(["Bucket", "Public", "Read / write", "Accepts", "Max"], [[f"`{b['name']}`", b["public"], f"{b['read_policy']} / {b['write_policy']}", ", ".join(b["accepts"]) or "any", b["max_bytes"] or "default"] for b in d["buckets"]]))
    w("### Realtime\n")
    w(md_table(["Channel pattern", "Subscribe", "Publish", "History"], [[f"`{c['pattern']}`", c["subscribe"], c["publish"], c["history"]] for c in blueprint["settings"]["realtime"]["channels"]]))
    w("### Domain events\n")
    w("Emitted by the code (`events.emit`); listeners write the audit trail, notifications, merchant webhooks, emails and the jobs above. Eleven are published to merchants' webhook endpoints.\n")
    w(md_table(["Event", "Meaning"], [[f"`{n}`", m] for n, m in EVENTS.items()]))

    w("## Roles and permissions\n")
    w("Store roles live on the *membership* (a person can be an owner of one store and support in another). A member's effective permissions are the role's, plus `extra_permissions`, minus `denied_permissions`; "
      "the owner holds everything. The platform role `platform_admin` says nothing about any store.\n")
    cols = ["group", "permission", "what it allows", *ROLES]
    matrix = [[group, f"`{key}`", label, *["●" if role == "owner" or key in ROLE_PERMISSIONS.get(role, ()) else "" for role in ROLES]] for group, key, label in PERMISSIONS]
    w(md_table(cols, matrix))

    w("## Data model\n")
    w("Every table soft-deletes (`deleted_at`) and carries Pawabase's `id`, `created_at`, `updated_at`. No resource exposes REST operations: data is reached only through the functions above, "
      "which check the store, the member and the permission first. Money is integer minor units in `*_minor` columns. A column named `<x>_id` is an integer reference to table `<x>` (a user id is a string: users live in Akountz).\n")
    for resource in sorted(resources, key=lambda r: r["name"]):
        w(f"### `{resource['name']}`\n")
        w(f"{resource.get('description', '')}\n")
        extra = unique.get(resource["name"])
        rows_ = [[f"`{f['name']}`", f["type"] + (f"({f['max_length']})" if f.get("max_length") else ""), "unique" if f.get("unique") else ("index" if f.get("indexed") else ""), f.get("default", "")] for f in resource["fields"]]
        w(md_table(["Column", "Type", "Key", "Default"], rows_))
        if extra:
            w("Composite unique: " + "; ".join("(" + ", ".join(g) + ")" for g in extra) + "\n")

    w("## Invariants the code keeps, and the tests that prove them\n")
    w("`tests/` drives the real stack (gateway, Akountz, API, workers, database) with a stand-in for Paystack's API. See `README.md` for how to run it.\n")
    w(md_table(["Invariant", "Where it is proved"], [
        ["Stock is reserved atomically at checkout, committed on payment, released on failure/abandonment; it can never be oversold", "`test_checkout.py`, `test_insight_jobs.py` (abandoned carts)"],
        ["A payment settles once, however often the shopper returns or the provider delivers", "`test_checkout.py`, `test_webhooks_refunds.py`"],
        ["A forged webhook changes nothing; a delivery for no known store is acknowledged and ignored", "`test_webhooks_refunds.py`"],
        ["Refunds cannot exceed what was paid; restocking follows refunded lines; the ledger balances", "`test_webhooks_refunds.py`, `test_dashboard.py`, `test_insight_jobs.py`"],
        ["A merchant is paid their share once per order", "`test_webhooks_refunds.py` (payout)"],
        ["One store's data is unreachable from another store, by any route, id or token", "`test_tenancy_team.py`, `test_checkout.py`, `test_pos_support.py`, `test_insight_jobs.py`, `test_storefront_builder.py`"],
        ["Roles, extra and denied permissions, removal and invitations are enforced per store", "`test_tenancy_team.py`, `test_pos_support.py`"],
        ["Store API keys are hashed, scoped, store-confined, and fail identically when wrong/revoked/missing", "`test_tenancy_team.py`"],
        ["The page builder stores only what the block registry allows; drafts are invisible without a signed preview", "`test_storefront_builder.py`"],
        ["Merchant webhooks are signed, retried on a schedule, deduplicable, and cannot target the platform's network", "`test_insight_jobs.py`"],
        ["Help-desk updates are live, per-ticket and per-store, and clients cannot publish", "`test_realtime.py`, `test_pos_support.py`"]]))
    return "\n".join(out)
