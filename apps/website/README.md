# Pawabase marketing — homepage preview

Phase 1 only. React, TypeScript and TanStack Router, with Vite and build-time React prerendering. The separate Sillo website and Pawabase Studio are untouched.

## Run

```sh
cd pawabase/apps/website
npm ci
npm run dev
```

Open **http://localhost:4173/**. For the prerendered production preview, stop the development server, then run `npm run build` and `npm run preview` on the same port.

The review session also serves the production build at **http://localhost:4174/** using `npm run preview -- --port 4174`. Check that instance with `CHECK_URL=http://localhost:4174 node scripts/check.mjs`.

## Deployment configuration

The public marketing, documentation and hosted Studio domains have not been supplied. Defaults deliberately avoid inventing them:

- `SITE_URL=https://your-marketing-domain` at build time sets canonical, social metadata, structured data, robots and sitemap. Without it, the build is a localhost preview with `noindex` and `Disallow: /`.
- `VITE_DOCS_URL=https://your-docs-domain` changes documentation links. By default they point to the existing MDX documentation in the public GitHub repository.
- `VITE_DASHBOARD_URL=https://your-studio-domain` enables the Open Studio CTA. Without it the header links to self-hosting instructions, not an inaccessible dashboard.

Serve `dist` as static files. Only `/` is a marketing route; do not blanket-rewrite unknown paths to `/index.html` in production. Configure your static host to return HTTP 404 for unknown URLs. No production deployment was performed.

## Real product media

Four silent H.264 clips and WebP posters were recorded from the running local Studio, in the existing Sell4Me Commerce development environment:

- Overview: changing the analytics range and inspecting the traffic chart.
- Resources: browsing the existing resource listing.
- Flows: opening an existing Flow and inspecting blocks, without saving or running it.
- Observability: filtering the existing request logs.

Clips are approximately 6.5 seconds, muted and viewport-aware. Reduced-motion visitors see a poster unless they explicitly play a clip. No backend business data was changed. Login occurs before recording starts, authentication state remains in memory, and the operator identity area is hidden during capture. Request IDs and analytics in the clips are actual local development observations, not performance claims.

The interactive Flow explainer is explicitly illustrative, uses verified block types, and does not pretend to execute against a backend. No AI-generated images, fabricated dashboards, customer logos, testimonials, pricing, benchmarks, or AI/marketplace availability claims were added. The social card is rendered from HTML, the existing brand mark and a real Studio capture.

Capture tooling: `node scripts/capture.mjs` reads credentials from the local Pawabase `.env` without printing or persisting them. It requires local Studio, Google Chrome, ffmpeg, and `npx playwright install ffmpeg`. `CAPTURE_ONLY=flows` recaptures a single clip. Raw output is ignored under `artifacts/`. Review every captured frame before publishing against a different dataset.

## Verification

With the site running on port 4173:

```sh
node scripts/check.mjs
```

Checks desktop/tablet/mobile overflow, browser errors, WCAG A/AA automated rules, menu/Escape behavior, keyboard tabs, illustrative block selection, reduced-motion behavior, playback/pause, and prerendered metadata. Reports and screenshots go to ignored `artifacts/`. Automated accessibility checks are not a substitute for a full assistive-technology audit. No production traffic, Core Web Vitals or load benchmark is claimed.

`node scripts/social.mjs` rebuilds the social card against the running local homepage. `npm run build` copies all public media and produces the crawlable HTML, robots.txt and homepage-only sitemap.xml.

## Remaining 15 pages — awaiting homepage approval

2. Database — resources, relations, filtering, policies, generated APIs.
3. Authentication — accounts, sessions, OAuth, MFA, organizations and permissions.
4. Storage — objects, uploads, signed access, infrastructure drivers.
5. Realtime — broadcast, presence, channels and history.
6. Flows — triggers, blocks, branching/loops, runs and errors.
7. Queues & Background Jobs — dispatch, workers and job operations.
8. APIs & Webhooks — routes, Explorer, inbound hooks and outbound delivery.
9. Functions / Compute — Python extension points and execution boundaries.
10. AI & Agents — audit implementation before choosing claims or availability language.
11. Observability — request logs, Flow traces and user log blocks.
12. Platform — environments, releases, schedules, secrets and infrastructure.
13. Marketplace — audit availability; distinguish repository blueprints from a marketplace.
14. Developers — docs, API conventions, examples and extension guides.
15. Community — issues, contribution and verified community destinations.
16. About / Open Source — project direction, Sillo foundation and verified support options.

None of these pages has been implemented. Existing homepage links lead to real documentation or repository destinations. Sponsorship is omitted because no verified sponsorship destination was supplied.
