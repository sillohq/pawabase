import { useState } from "react";
import { Icon } from "./components/Primitives";
import { dashboard, docs, github } from "./config";

function Heading({ title, children, action }: { title: string; children: string; action?: React.ReactNode }) {
  return <div className="sx-heading">
    <div><h2>{title}</h2><p>{children}</p></div>
    {action}
  </div>;
}

/* 1 — Architecture · framed */
const tiers = [
  { label: "Clients", note: "apikey + bearer token", nodes: ["Web app", "iOS", "Android", "Server / worker"] },
  { label: "Gateway", note: "one door, :8080", nodes: ["Resolve project:env", "Check API key", "CORS & rate limits"], hot: true },
  { label: "Services", note: "split by concern", nodes: ["API · resources, flows, functions", "Akountz · identity", "Angula · realtime"] },
  { label: "State", note: "yours to host", nodes: ["Postgres", "Redis", "Storage volume"] },
];

function Architecture() {
  return <section className="sx sx-framed" aria-labelledby="sx-arch">
    <div className="sx-frame">
      <Heading title="Every request takes the same road.">Clients never talk to a service directly. The gateway resolves which project and environment a request belongs to before anything else runs.</Heading>
      <div className="sx-arch" id="sx-arch">
        {tiers.map((tier, i) => <div className={`sx-tier${tier.hot ? " hot" : ""}`} key={tier.label}>
          <div className="sx-tier-label"><b>{tier.label}</b><span>{tier.note}</span></div>
          <div className="sx-tier-nodes">{tier.nodes.map((n) => <span key={n}>{n}</span>)}</div>
          {i < tiers.length - 1 && <i className="sx-tier-link" aria-hidden="true" />}
        </div>)}
      </div>
    </div>
  </section>;
}

/* 2 — SDK · full-bleed, no borders */
const snippets = [
  { id: "js", label: "JavaScript", code: `const res = await fetch(
  \`\${GW}/rest/v1/posts?filter[status]=published\`,
  { headers: { apikey: PUBLISHABLE_KEY } },
);
const posts = await res.json();` },
  { id: "swift", label: "Swift", code: `var req = URLRequest(url: URL(string:
  "\\(gw)/rest/v1/posts?filter[status]=published")!)
req.setValue(publishableKey, forHTTPHeaderField: "apikey")
let (data, _) = try await URLSession.shared.data(for: req)` },
  { id: "kotlin", label: "Kotlin", code: `val request = Request.Builder()
    .url("$gw/rest/v1/posts?filter[status]=published")
    .header("apikey", publishableKey)
    .build()
val body = client.newCall(request).execute().body?.string()` },
  { id: "dart", label: "Dart", code: `final res = await dio.get(
  '$gw/rest/v1/posts',
  queryParameters: {'filter[status]': 'published'},
  options: Options(headers: {'apikey': publishableKey}),
);` },
  { id: "python", label: "Python", code: `res = requests.get(
    f"{GW}/rest/v1/posts",
    params={"filter[status]": "published"},
    headers={"apikey": PUBLISHABLE_KEY},
)` },
];
const clientFacts = [
  ["Plain REST + JSON", "Same URLs, filters, sorting and pagination on every platform."],
  ["A wrapper you own", "One typed file: pawabase.list(\"posts\", { sort: \"-created_at\" })."],
  ["Refresh built in to the pattern", "Catch a 401, swap the refresh token, retry once."],
  ["Structured errors", "Every failure carries a code, or per-field details on a 422."],
];
const platforms = [["react", "React"], ["nextdotjs", "Next.js"], ["vuedotjs", "Vue"], ["android", "Android"], ["apple", "iOS"], ["flutter", "Flutter"], ["python", "Python"], ["nodedotjs", "Node.js"]];

function Clients() {
  const [active, setActive] = useState(0);
  const current = snippets[active];
  return <section className="sx sx-bleed sx-clients" aria-labelledby="sx-sdk">
    <div className="sx-wide">
      <div className="sx-split">
        <div className="sx-copy">
          <h2 id="sx-sdk">No SDK to install.<br />The API is the SDK.</h2>
          <p>Pawabase speaks plain REST, so the HTTP client your platform already ships is the client. No package to pin, no generated code to regenerate when you add a resource.</p>
          <div className="sx-actions">
            <a className="button" href={docs("clients/overview")}>Client guides <Icon name="arrow" /></a>
            <a className="sx-link" href={docs("clients/rest-conventions")}>REST conventions <Icon name="arrow" /></a>
          </div>
        </div>
        <div className="sx-code">
          <div className="sx-code-tabs" role="tablist" aria-label="Client language">
            {snippets.map((s, i) => <button key={s.id} role="tab" aria-selected={i === active} className={i === active ? "on" : ""} onClick={() => setActive(i)}>{s.label}</button>)}
          </div>
          <pre><code>{current.code}</code></pre>
          <div className="sx-code-foot"><span>GET /rest/v1/posts</span><b>200 OK</b></div>
        </div>
      </div>
      <div className="sx-facts">{clientFacts.map(([t, d]) => <div key={t}><h3>{t}</h3><p>{d}</p></div>)}</div>
      <ul className="sx-platforms" aria-label="Works with">{platforms.map(([icon, name]) => <li key={name}><img src={`/integrations/${icon}.svg`} alt="" width="20" height="20" />{name}</li>)}</ul>
    </div>
  </section>;
}

/* 3 — Policies · framed */
const matrix = [
  { op: "list", rule: "owner", arg: "owner_id", ok: "own rows only" },
  { op: "get", rule: "owner", arg: "owner_id", ok: "own rows only" },
  { op: "create", rule: "authenticated", arg: "true", ok: "any signed-in user" },
  { op: "update", rule: "owner", arg: "owner_id", ok: "own rows only" },
  { op: "delete", rule: "role", arg: "[\"admin\"]", ok: "admins" },
];

function Policies() {
  return <section className="sx sx-framed" aria-labelledby="sx-pol">
    <div className="sx-frame">
      <Heading title="Access rules you can read in one glance." action={<a className="sx-link" href={docs("policies/overview")}>Policies <Icon name="arrow" /></a>}>Each operation on a resource gets a rule written as JSON. Shorthands cover the common questions: signed in, which role, owns the row, using a server key.</Heading>
      <div className="sx-policy" id="sx-pol">
        <div className="sx-matrix">
          <div className="sx-matrix-head"><span>orders</span><b>5 operations</b></div>
          {matrix.map((row) => <div className="sx-matrix-row" key={row.op}>
            <span className="op">{row.op}</span>
            <code>{`{ "${row.rule}": ${row.arg === "true" || row.arg.startsWith("[") ? row.arg : `"${row.arg}"`} }`}</code>
            <span className="ok"><i />{row.ok}</span>
          </div>)}
        </div>
        <div className="sx-trace">
          <h3>What happens on a list request</h3>
          <ol>
            <li><b>Checked first</b><span>Signed in? Right role? Decided from the token, with no database work per row.</span></li>
            <li><b>Pushed into the query</b><span><code>owner</code> becomes a filter, so other people's rows are never fetched.</span></li>
            <li><b>Secret keys skip it</b><span>Server credentials bypass policies, so keep them off clients.</span></li>
          </ol>
        </div>
      </div>
    </div>
  </section>;
}

/* 4 — Flows · full-bleed, no borders */
function FlowCanvas() {
  return <div className="sx-canvas" aria-hidden="true">
    <svg viewBox="0 0 900 360" preserveAspectRatio="none" fill="none">
      <path d="M170 180H236" /><path d="M376 180H430" />
      <path d="M430 180C470 180 470 90 520 90H570" /><path d="M430 180C470 180 470 270 520 270H570" />
      <path d="M710 90H760" /><path d="M710 270H760" />
    </svg>
    <span className="n trig" style={{ left: "2%", top: "42%" }}><small>Trigger</small>POST /orders</span>
    <span className="n" style={{ left: "26%", top: "42%" }}><small>Policy</small>authenticated</span>
    <span className="n branch" style={{ left: "47%", top: "42%" }}><small>Branch</small>in stock?</span>
    <span className="n" style={{ left: "63%", top: "16%" }}><small>Record</small>Create order</span>
    <span className="n" style={{ left: "63%", top: "68%" }}><small>Respond</small>409 sold out</span>
    <span className="n done" style={{ left: "85%", top: "16%" }}><small>Queue</small>Email receipt</span>
  </div>;
}

const runs = [
  ["#1248", "Complete", "84 ms", true], ["#1247", "Complete", "91 ms", true], ["#1246", "Branch: sold out", "37 ms", false], ["#1245", "Complete", "88 ms", true],
] as const;

function Flows() {
  return <section className="sx sx-bleed sx-flows" aria-labelledby="sx-flows">
    <div className="sx-wide">
      <Heading title="Backend logic you can follow." action={<a className="sx-link" href={docs("flows/overview")}>Flows <Icon name="arrow" /></a>}>Triggers, policies, branches and records on one canvas. Every run is recorded, so you can open one and see exactly what happened.</Heading>
      <div className="sx-flowbox" id="sx-flows">
        <FlowCanvas />
        <aside className="sx-runs">
          <div className="sx-runs-head"><span>Runs</span><b>order.created</b></div>
          {runs.map(([id, status, time, ok]) => <p key={id}><i className={ok ? "" : "warn"} /><span>{id}</span><em>{status}</em><b>{time}</b></p>)}
        </aside>
      </div>
    </div>
  </section>;
}

/* 5 — Realtime protocol · framed */
const frames = [
  { dir: "out", type: "subscribe", body: '{ "type": "subscribe", "channel": "store:7" }' },
  { dir: "in", type: "subscribed", body: '{ "type": "subscribed", "channel": "store:7", "status": "ok" }' },
  { dir: "out", type: "publish", body: '{ "type": "publish", "channel": "store:7",\n  "payload": { "event": "item_added", "data": { "name": "Widget" } } }' },
  { dir: "in", type: "presence", body: "someone joined store:7" },
];
const realtimeFacts = [["Channels", "Named rooms with their own subscribe and publish rules."], ["Presence", "See who is online and what they are doing."], ["History", "New subscribers replay recent messages, in order."], ["Resource changes", "Row writes can broadcast to a channel."]];

function Realtime() {
  return <section className="sx sx-framed" aria-labelledby="sx-rt">
    <div className="sx-frame">
      <div className="sx-split sx-split-rev">
        <div className="sx-wire" id="sx-rt">
          <div className="sx-wire-head"><span><i /> wss · store:7</span><b>3 online</b></div>
          {frames.map((f) => <div className={`sx-frame-row ${f.dir}`} key={f.type + f.dir}>
            <span className="arrow">{f.dir === "out" ? "↑ send" : "↓ receive"}</span><pre>{f.body}</pre>
          </div>)}
        </div>
        <div className="sx-copy">
          <h2>One protocol on web, mobile and servers.</h2>
          <p>Realtime is a WebSocket carrying small JSON frames. Learn the handful of message types once and the same code shape works everywhere.</p>
          <dl className="sx-list">{realtimeFacts.map(([t, d]) => <div key={t}><dt>{t}</dt><dd>{d}</dd></div>)}</dl>
          <a className="sx-link" href={docs("realtime/protocol")}>Read the protocol <Icon name="arrow" /></a>
        </div>
      </div>
    </div>
  </section>;
}

/* 6 — Environments · full-bleed, no borders */
const envs = [
  { name: "development", version: "v249", keys: "pb_pk_… / pb_sk_…", note: "Where you build" },
  { name: "staging", version: "v247", keys: "own keys", note: "Rehearse the release" },
  { name: "production", version: "v244", keys: "own keys", note: "What users hit" },
];
const audit = [["09:41", "maya@acme.co", "promoted development → staging"], ["09:12", "daniel@acme.co", "updated policy orders.update"], ["08:57", "maya@acme.co", "created secret key"]];

function Environments() {
  return <section className="sx sx-bleed sx-envs" aria-labelledby="sx-env">
    <div className="sx-wide">
      <Heading title="Promoted, not deployed." action={<a className="sx-link" href={docs("operate/environments-and-promotion")}>Environments <Icon name="arrow" /></a>}>Each environment has its own keys, users and definitions. Promotion copies definitions forward and overwrites rather than merges, so staging always matches what you tested.</Heading>
      <div className="sx-pipeline" id="sx-env">
        {envs.map((e, i) => <div className="sx-env-wrap" key={e.name}>
          <div className="sx-env"><header><b>{e.name}</b><span>{e.version}</span></header><p>{e.note}</p><code>{e.keys}</code></div>
          {i < envs.length - 1 && <div className="sx-promote"><span>promote</span><i /></div>}
        </div>)}
      </div>
      <div className="sx-audit">
        <div className="sx-audit-head"><span>Audit log</span><b>every change, attributed</b></div>
        {audit.map(([time, who, what]) => <p key={time}><time>{time}</time><span>{who}</span><em>{what}</em></p>)}
      </div>
    </div>
  </section>;
}

/* 7 — Self-hosting · framed */
const services = [["gateway", ":8080", "public entry"], ["studio", ":8090", "dashboard"], ["api", "internal", "resources & flows"], ["akountz", "internal", "identity"], ["angula", "internal", "realtime"], ["worker", "internal", "jobs"], ["scheduler", "internal", "cron"], ["postgres", "internal", "platform state"], ["redis", "internal", "queues & pub/sub"]];

function SelfHost() {
  return <section className="sx sx-framed" aria-labelledby="sx-host">
    <div className="sx-frame">
      <div className="sx-split">
        <div className="sx-copy">
          <h2 id="sx-host">Run the whole thing on your own host.</h2>
          <p>One compose file brings up every service from a single image. Your data stays in your own Postgres and on your own storage.</p>
          <div className="sx-term"><span>$</span> docker compose up -d</div>
          <div className="sx-actions">
            <a className="button" href={docs("self-hosting/docker-compose")}>Self-hosting guide <Icon name="arrow" /></a>
            <a className="sx-link" href={github}>View on GitHub <Icon name="arrow" /></a>
          </div>
        </div>
        <div className="sx-services">
          {services.map(([name, port, role]) => <p key={name}><i /><b>{name}</b><span>{role}</span><em>{port}</em></p>)}
        </div>
      </div>
    </div>
  </section>;
}

/* 8 — Migrate + CTA · full-bleed, no borders */
const concept = [
  ["anon key", "Firebase Auth SDK", "Publishable key"],
  ["service_role key", "Firebase Admin SDK", "Secret key"],
  ["GoTrue", "Firebase Auth", "Akountz"],
  ["Row-level security", "Security Rules", "Policies"],
  ["JOIN", "Denormalize", "?expand=relation"],
];

function Migrate() {
  return <section className="sx sx-bleed sx-migrate" aria-labelledby="sx-migrate">
    <div className="sx-wide">
      <Heading title="Coming from Supabase or Firebase?" action={<a className="sx-link" href={docs("compare/concept-map")}>Full concept map <Icon name="arrow" /></a>}>Most of what you know has a direct counterpart. Here is the short version of the mapping.</Heading>
      <div className="sx-map" id="sx-migrate">
        <div className="sx-map-row head"><span>Supabase</span><span>Firebase</span><span>Pawabase</span></div>
        {concept.map(([a, b, c]) => <div className="sx-map-row" key={a}><span>{a}</span><span>{b}</span><span>{c}</span></div>)}
      </div>
      <div className="sx-cta">
        <h2>Spend your time on the product.</h2>
        <div className="sx-actions">
          <a className="button" href={dashboard || docs("quickstart")}>{dashboard ? "Open Studio" : "Start building"} <Icon name="arrow" /></a>
          <a className="sx-link" href={docs("migrate/from-supabase")}>Migration guides <Icon name="arrow" /></a>
        </div>
      </div>
    </div>
  </section>;
}

export function Sections() {
  return <>
    <Architecture />
    <Clients />
    <Policies />
    <Flows />
    <Realtime />
    <Environments />
    <SelfHost />
    <Migrate />
  </>;
}
