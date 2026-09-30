import { readFile, writeFile } from "node:fs/promises";
import { render } from "../.prerender/render.js";
const origin = process.env.SITE_URL
  ? new URL(process.env.SITE_URL).origin
  : "http://localhost:4173";
const live = !new URL(origin).hostname.match(/^(localhost|127\.0\.0\.1)$/);
const title = "Pawabase — One backend, already connected.";
const description =
  "One backend for the data, identity, storage, realtime, automation and operations behind your application.";
const escape = (s) =>
  s.replaceAll("&", "&amp;").replaceAll('"', "&quot;").replaceAll("<", "&lt;");
const meta = `<link rel="canonical" href="${escape(origin)}/" />
${!live ? '<meta name="robots" content="noindex, nofollow" />' : ""}
<meta property="og:type" content="website" /><meta property="og:site_name" content="Pawabase" />
<meta property="og:title" content="${title}" /><meta property="og:description" content="${description}" />
<meta property="og:url" content="${escape(origin)}/" /><meta property="og:image" content="${escape(origin)}/media/social.png" />
<meta property="og:image:alt" content="Pawabase — your backend, already connected" />
<meta name="twitter:card" content="summary_large_image" /><meta name="twitter:title" content="${title}" />
<meta name="twitter:description" content="${description}" /><meta name="twitter:image" content="${escape(origin)}/media/social.png" />
<script type="application/ld+json">${JSON.stringify({ "@context": "https://schema.org", "@type": "SoftwareApplication", name: "Pawabase", applicationCategory: "DeveloperApplication", operatingSystem: "Self-hosted", url: origin, description, codeRepository: "https://github.com/sillohq/pawabase" }).replaceAll("<", "\\u003c")}</script>`;
const html = (await readFile("dist/index.html", "utf8"))
  .replace("<!--seo-->", meta)
  .replace("<!--app-->", await render());
await writeFile("dist/index.html", html);
await writeFile(
  "dist/robots.txt",
  `User-agent: *\n${live ? "Allow: /" : "Disallow: /"}\nSitemap: ${origin}/sitemap.xml\n`,
);
await writeFile(
  "dist/sitemap.xml",
  `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><url><loc>${escape(origin)}/</loc></url></urlset>`,
);
console.log(
  `Prerendered homepage for ${origin}${live ? "" : " (preview: noindex)"}`,
);
