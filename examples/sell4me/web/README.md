# Sell4me web

The Sell4me dashboard and storefront (Inertia + React, the original design) on top of the Sell4me **Pawabase project**.

* `server/` — a small Sillo app with **no database**. Each page's props are fetched from Pawabase with the `pawabase` Python kit (`httpx`) *as the signed-in user*
  (their access token lives in the signed session cookie, refreshed transparently); each form post is forwarded the same way. A shopper is anonymous: the publishable key
  plus a basket token held in the session. The store comes from the hostname (`<slug>.<STOREFRONT_SUFFIX>` or a verified custom domain).
* `views/`, `js/` — the React app, unchanged except `js/realtime.ts`: the help desk's live updates use `@pawabase/client` (browser → gateway, publishable key) instead of the
  original's WebSockets. Replies are plain POSTs.
* `server/pages.py` / `server/actions.py` — the table of every page (browser path → component → Pawabase endpoint → prop adapter) and every post. `server/actions.py` is
  generated from the endpoints' `original` field.

## Run

```bash
cp .env.example .env          # PAWABASE_URL, PAWABASE_PUBLISHABLE_KEY (pb_pk_…), SELL4ME_WEB_SECRET, STOREFRONT_SUFFIX …
pip install -r requirements.txt
npm install && npm run build  # or `VITE_DEV=1` with `npm run dev`
uvicorn server.app:app --port 3000
```

Three values must agree with the Pawabase project's secrets: `STOREFRONT_SUFFIX` (shops live at `<slug>.<suffix>`), `APP_URL` (links in emails) and the port you serve on.
Provider webhooks go to Pawabase's inbound hook (`/hooks/v1/<project>/<env>/paystack`), not to this app.

## Tests

`examples/sell4me/scripts/reset.sh` starts a throwaway stack; then `python -m pytest web/tests` (from `examples/sell4me`) starts this app for real and drives it like a browser:
every dashboard page renders with every prop its component destructures, the shop (basket, discount, checkout, confirmation, receipt, help widget, sandbox pay screen),
form posts and JSON fetches, uploads, sign-up/sign-in/onboarding/sign-out, store switching and cross-store isolation.

`tools_seed.py` seeds a demo store; `tools_check.py` diffs the endpoints' answers against the components' props.
