# Sell4me on Pawabase

The whole of Sell4me (a multi-tenant commerce platform: merchant dashboard, hosted storefront, checkout and payments with marketplace payouts, point of sale,
help desk, page builder, analytics, exports, a merchant API and webhooks) as a **Pawabase backend**.

* **[BLUEPRINT.md](BLUEPRINT.md)** — every route, table, job, schedule, hook, bucket, role, permission and event, generated from the code, with a table that
  accounts for each of the original's 174 routes.
* **[sell4me.blueprint.json](sell4me.blueprint.json)** — the `pawabase.blueprint` that creates the project (resources, routes, buckets, schedules, hooks, roles, realtime).
* `code/sell4me/functions/` — the endpoints and jobs (Pawabase functions, written with the `pawabase` kit). `kit/sell4me_kit/` — the domain: money, stock, checkout, payments, ledger, builder, … — shipped inside the deployment bundle. `pawabase.toml` says where both are.
* `tests/` — a live suite (85+ tests) against the real stack.

## Run it

```bash
python -m venv ../../.venv && ../../.venv/bin/pip install -r ../../requirements.txt -r requirements.txt   # or your Pawabase venv
npm install                                  # optional: compiles page-builder Style-tab classes
scripts/reset.sh                             # a throwaway stack on SQLite: gateway :18080, provisions the project, then `pawabase deploy`s the functions
../../.venv/bin/python -m pytest tests -q    # the live suite (starts a stand-in for Paystack's API on :18099)
set -a; . /tmp/sell4me-stack/env; set +a      # the URL and key reset.sh made (or copy .env.example to .env)
pawabase deploy                              # after changing code: the new code is live at once
pawabase emulate --watch                     # or run the functions locally on :8787, against the same stack (everything else is forwarded)
SELL4ME_URL=http://127.0.0.1:8787 python -m pytest tests -q   # the same suite, through the emulator
python blueprint/build.py                    # after adding an endpoint: regenerates the blueprint and BLUEPRINT.md
```

`scripts/provision.py` creates the project from the blueprint, sets the development secrets, installs the composite unique indexes (Pawabase resources have
single-column unique only) and the Paystack hook secret, and writes `<state>/config.json` with the gateway URL and keys. Against a real deployment, do those
four things with your own secrets (see *Secrets* in BLUEPRINT.md).

## How a client uses it

```ts
import { createClient } from "@pawabase/client";
const pb = createClient({ url, apiKey: PUBLISHABLE_KEY });

// merchant
await pb.auth.signUp({ email, password });
await pb.functions.invoke ... // or plain REST:
await fetch(`${url}/rest/v1/onboarding/stores`, { method: "POST", headers: { apikey, authorization: `Bearer ${token}` }, body: JSON.stringify({ name: "My shop", currency: "NGN", country: "NG" }) });
await fetch(`${url}/rest/v1/dash/my-shop/products`, { ... });          // every dashboard route is /dash/{store}/...

// shopper (no account): the basket token is yours to keep
const { cart_token } = await (await fetch(`${url}/rest/v1/shop/my-shop/cart/add`, { method: "POST", headers: { apikey }, body: JSON.stringify({ variant_id: 1 }) })).json();
await fetch(`${url}/rest/v1/shop/my-shop/checkout`, { method: "POST", headers: { apikey }, body: JSON.stringify({ email, cart_token, ...address }) }); // -> { redirect_url }
```

## What is verified, and what is not

Verified by the live suite on SQLite, against the real gateway, Akountz, API and workers: onboarding and launch gating; catalogue, variants, inventory, images
(and the derivative job); the whole checkout (reserve, pay, settle, commit, release), idempotent settlement, forged/duplicate/unknown webhooks, refunds,
restocking, the ledger, marketplace payouts; discounts and campaigns; POS sessions and cash sales; the help desk including realtime; the page builder,
templates, themes, SEO, domains, designs; analytics, search, notifications, exports; background jobs; merchant webhooks (signed, retried, SSRF-guarded);
the store API; roles, permissions, invitations and cross-tenant isolation; the sandbox provider.

**Not verified here** — say so before relying on it:

* **Paystack's real API.** Payments run against `tests/fake_paystack.py`, a stand-in written from Paystack's documented shapes. First contact with the real API
  (initialize/verify/refund/transfer/webhook field names, the 5% split maths against real fees) needs a Paystack test key and a run with `PAYSTACK_BASE_URL` unset.
* **PostgreSQL.** Everything ran on SQLite. The SQL is dialect-neutral (`?` placeholders are converted by the platform's session) and ids are integers, but no run
  against Postgres has happened. Concurrency under load (the stock reservation is one conditional `UPDATE`, so it is sound on both) has not been load-tested.
* **Email.** Mail goes through the platform's mailer; in development it is suppressed (logged), so rendering is exercised and delivery is not.
* **Custom-domain DNS verification** shells out to `dig`; the TXT-found branch is not tested (the not-found and unresolvable branches are).
* **The Stripe provider** is carried over from the original and, as there, not offered.
* **Frontends.** This is the backend. The original's React/Inertia pages are not ported; every endpoint returns the data those pages were built from.
