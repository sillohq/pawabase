import { chromium } from "playwright";
import AxeBuilder from "@axe-core/playwright";
import assert from "node:assert/strict";
import { mkdir, readFile, writeFile } from "node:fs/promises";
const browser = await chromium.launch({ channel: "chrome", headless: true });
await mkdir("artifacts", { recursive: true });
const report = [];
const origin = process.env.CHECK_URL || "http://localhost:4173";
try {
  for (const width of [1440, 768, 390]) {
    const context = await browser.newContext({
      viewport: { width, height: 1000 },
      reducedMotion: "reduce",
    });
    const page = await context.newPage();
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    page.on("console", (m) => {
      if (m.type() === "error") errors.push(m.text());
    });
    page.on("response", (r) => {
      if (r.status() >= 400 && r.url().startsWith(origin))
        errors.push(`${r.status()} ${r.url()}`);
    });
    await page.goto(origin, { waitUntil: "networkidle" });
    await page.evaluate(() => document.fonts.ready);
    assert.equal(await page.locator("h1").count(), 1);
    assert.equal(await page.locator("main section").count(), 1);
    assert.equal(await page.locator("video").count(), 1);
    assert.equal(await page.locator("button, header, footer").count(), 0);
    assert(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
      `Overflow at ${width}`,
    );
    assert(
      await page
        .locator("video")
        .evaluateAll((vs) => vs.every((v) => v.paused)),
      "Reduced motion must not autoplay",
    );
    await page.screenshot({
      path: `artifacts/home-${width}.png`,
      fullPage: true,
    });
    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
      .analyze();
    report.push({
      width,
      errors,
      accessibility: results.violations.map((v) => ({
        id: v.id,
        impact: v.impact,
        nodes: v.nodes.map((n) => ({
          target: n.target,
          summary: n.failureSummary,
        })),
      })),
    });
    await context.close();
  }
  const page = await browser.newPage({
    viewport: { width: 1440, height: 1000 },
  });
  await page.goto(origin);
  await page.locator("video").first().waitFor();
  await page.waitForFunction(() => {
    const v = document.querySelector("video");
    return v && !v.paused && v.currentTime > 0;
  });
  assert.equal(await page.locator("video[controls]").count(), 0);
  assert.equal(await page.locator("button").count(), 0);
  report.push({ videoPlayback: "passed", controls: "absent" });
  const html = await readFile("dist/index.html", "utf8");
  for (const needle of [
    "<h1",
    "application/ld+json",
    "og:image",
    'rel="canonical"',
    "twitter:card",
  ])
    assert(html.includes(needle), `Missing prerendered SEO: ${needle}`);
  report.push({ prerender: "passed", seo: "passed" });
  await writeFile("artifacts/checks.json", JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
  assert(
    report.every((r) => !r.errors?.length && !r.accessibility?.length),
    "Fix issues in artifacts/checks.json",
  );
} finally {
  await browser.close();
}
