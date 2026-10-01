import { chromium } from "playwright";
import AxeBuilder from "@axe-core/playwright";
import assert from "node:assert/strict";
import { mkdir, readFile, writeFile } from "node:fs/promises";

const browser = await chromium.launch({ channel: "chrome", headless: true });
const origin = process.env.CHECK_URL || "http://localhost:4173";
const report = [];
await mkdir("artifacts", { recursive: true });
try {
  for (const width of [1440, 768, 390]) {
    for (const theme of ["light", "dark"]) {
      const context = await browser.newContext({ viewport: { width, height: 1000 }, reducedMotion: "reduce" });
      await context.addInitScript(value => localStorage.setItem("pawabase.website.theme", value), theme);
      const page = await context.newPage();
      const errors = [];
      page.on("pageerror", e => errors.push(e.message));
      page.on("console", m => { if (m.type() === "error") errors.push(m.text()); });
      await page.goto(origin, { waitUntil: "networkidle" });
      await page.evaluate(() => document.fonts.ready);
      assert.equal(await page.locator("h1").count(), 1);
      assert.equal(await page.locator(".product-story, footer").count(), 0);
      assert.equal(await page.locator("main section").count(), 2);
      assert.equal(await page.locator(".platform-card").count(), 6);
      assert.equal(await page.getByRole("heading", { name: "One platform for your entire backend." }).count(), 1);
      assert.equal(await page.getByRole("link", { name: /Get started/ }).count(), 1);
      assert.equal(await page.locator("html").getAttribute("data-theme"), theme);
      assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), "Horizontal overflow");
      assert(await page.locator("video").evaluateAll(videos => videos.every(v => v.paused)), "Reduced motion autoplay");
      const copy = await page.locator(".hero-copy").boundingBox();
      const demo = await page.locator(".hero-product").boundingBox();
      assert(demo.y > copy.y + 90, "Demo should sit lower than the copy");
      assert(copy.x + copy.width <= demo.x || copy.y + copy.height <= demo.y, "Copy overlaps demo");
      const hero = await page.locator(".hero").boundingBox();
      const film = await page.locator(".studio-film video").boundingBox();
      assert(demo.x + demo.width > width, "Preview should extend beyond the right edge");
      assert(film.y + film.height > hero.y + hero.height, "Preview should be cropped at the bottom");
      const brokenAnchors = await page.evaluate(() => [...document.querySelectorAll('a[href^="#"]')].filter(a => !document.getElementById(a.getAttribute("href").slice(1))).map(a => a.getAttribute("href")));
      assert.deepEqual(brokenAnchors, []);
      await page.screenshot({ path: `artifacts/hero-${width}-${theme}.png`, fullPage: true });
      const result = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze();
      report.push({ width, theme, errors, accessibility: result.violations.map(v => ({ id: v.id, nodes: v.nodes.map(n => ({ target: n.target, summary: n.failureSummary })) })) });
      await context.close();
    }
  }
  const html = await readFile("dist/index.html", "utf8");
  for (const needle of ["The backend,", "application/ld+json", "og:image", 'rel="canonical"', "twitter:card"]) assert(html.includes(needle), `Missing prerender: ${needle}`);
  await writeFile("artifacts/checks.json", JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
  assert(report.every(r => !r.errors.length && !r.accessibility.length), "Check artifacts/checks.json");
} finally {
  await browser.close();
}
