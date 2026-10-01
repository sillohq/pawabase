// Read-only capture. Credentials are read locally, never saved into media or logs.
// Run from this directory: node scripts/capture.mjs
import { chromium } from "playwright";
import { readFile, mkdir } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import sharp from "sharp";
const env = await readFile("../../.env", "utf8");
const value = (key) =>
  env
    .match(new RegExp(`^${key}=(.*)$`, "m"))?.[1]
    ?.trim()
    .replace(/^["']|["']$/g, "");
const origin = process.env.CAPTURE_STUDIO_URL || "http://localhost:8090";
const captureTheme = process.env.CAPTURE_THEME === "dark" ? "dark" : "light";
const browser = await chromium.launch({ channel: "chrome", headless: true });
try {
  const auth = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    colorScheme: captureTheme,
  });
  const login = await auth.newPage();
  await login.goto(`${origin}/login`);
  await login.locator("input[type=email]").fill(value("PAWABASE_ADMIN_EMAIL"));
  await login
    .locator("input[type=password]")
    .fill(value("PAWABASE_ADMIN_PASSWORD"));
  await login.getByRole("button", { name: "Sign in", exact: true }).click();
  await login.locator('a[href^="/projects/"]').first().waitFor();
  const project = await login
    .locator('a[href^="/projects/"]')
    .first()
    .getAttribute("href");
  const state = await auth.storageState();
  const base = `${origin}${project}/development`;
  const recordings = [
    ["overview", ""],
    ["resources", "/resources"],
    ["flows", "/flows"],
    ["observability", "/observability"],
  ];
  await mkdir("artifacts/raw", { recursive: true });
  await mkdir("public/media", { recursive: true });
  for (const [name, path] of recordings) {
    if (process.env.CAPTURE_ONLY && process.env.CAPTURE_ONLY !== name) continue;
    const context = await browser.newContext({
      storageState: state,
      viewport: { width: 1440, height: 900 },
      colorScheme: captureTheme,
      recordVideo: { dir: "artifacts/raw", size: { width: 1440, height: 900 } },
    });
    // Hide operator identity for the entire capture, before the page paints.
    await context.addInitScript((theme) => {
      localStorage.setItem("pawabase.theme", theme);
      const style = document.createElement("style");
      style.textContent = ".sidebar-foot{visibility:hidden!important}";
      const observer = new MutationObserver(() => {
        if (document.head && !style.isConnected) {
          document.head.append(style);
          observer.disconnect();
        }
      });
      observer.observe(document, { childList: true, subtree: true });
    }, captureTheme);
    const page = await context.newPage();
    await page.goto(base + path);
    await page.waitForTimeout(1800);
    if (name === "flows") {
      const flow = page.locator("tbody tr").first();
      await flow.click();
      await page.waitForTimeout(1500);
    }
    await page.screenshot({ path: `artifacts/${name}.png` });
    const start = Date.now();
    if (name === "overview") {
      const range = page.getByRole("button", { name: "7d", exact: true });
      if (await range.count()) await range.click();
      await page.waitForTimeout(1200);
      await page.mouse.move(930, 520, { steps: 30 });
      await page.waitForTimeout(1000);
      await page.mouse.move(1070, 520, { steps: 30 });
    } else if (name === "flows") {
      const nodes = page.locator(".react-flow__node");
      console.log(`Flow nodes available: ${await nodes.count()}`);
      if (await nodes.count()) {
        await nodes.first().click();
        await page.waitForTimeout(1400);
        if ((await nodes.count()) > 1) await nodes.nth(1).click();
      }
    } else if (name === "resources") {
      const search = page.locator('input[placeholder*="Search"]');
      if (await search.count()) {
        await search.first().fill("product");
        await page.waitForTimeout(1300);
        await search.first().fill("");
      } else {
        await page.mouse.move(1070, 550);
        await page.mouse.wheel(0, 360);
      }
    } else {
      const search = page.getByPlaceholder("Search path");
      if (await search.count()) {
        await search.fill("/rest");
        await page.waitForTimeout(1400);
        await search.fill("");
      }
    }
    await page.waitForTimeout(Math.max(1000, 6500 - (Date.now() - start)));
    const video = page.video();
    await context.close();
    const raw = await video.path();
    // Keep only the interaction at the end; no login, loading screen, or cookie UI.
    execFileSync(
      "ffmpeg",
      [
        "-y",
        "-sseof",
        "-6.5",
        "-i",
        raw,
        "-an",
        "-c:v",
        "libx264",
        "-preset",
        "slow",
        "-crf",
        "27",
        "-pix_fmt",
        "yuv420p",
        "-movflags",
        "+faststart",
        `public/media/${name}.mp4`,
      ],
      { stdio: "ignore" },
    );
    await sharp(`artifacts/${name}.png`)
      .webp({ quality: 82 })
      .toFile(`public/media/${name}.webp`);
    console.log(`Captured ${name}`);
  }
  await auth.close();
} finally {
  await browser.close();
}
