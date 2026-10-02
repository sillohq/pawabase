/**
 * `GET /pos/sessions/{id}` — the end-of-day report.
 *
 * The component itself lives in `Sessions.tsx`, next to the list it was
 * written with — they share the session types and the variance badge. This
 * file exists only because Inertia's resolver finds pages by module path
 * (`pos/SessionDetail` → `views/pages/pos/SessionDetail.tsx`), so the named
 * export is re-exported as the default here.
 */

export { SessionDetail as default } from './Sessions'
