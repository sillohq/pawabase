import { chromium } from "playwright";
const browser = await chromium.launch({ channel: "chrome", headless: true });
try {
  const page = await browser.newPage({
    viewport: { width: 1200, height: 630 },
    deviceScaleFactor: 1,
  });
  await page.goto("http://localhost:4173");
  // A code-native social card using the real product image and existing brand.
  await page.setContent(
    `<html><head><style>@font-face{font-family:Jakarta;src:url(http://localhost:4173/fonts/jakarta.woff2)}*{box-sizing:border-box}body{margin:0;background:#f6f4fa;color:#1f1b2e;font-family:Jakarta,sans-serif;padding:55px;overflow:hidden}.brand{display:flex;align-items:center;gap:12px;font-size:30px;font-weight:800}.brand img{width:44px}h1{font-size:64px;letter-spacing:-4px;line-height:1.06;margin:70px 0 0;max-width:700px;font-weight:650}h1 span{color:#6d5bd0}.product{position:absolute;left:790px;top:155px;width:720px;border-radius:26px;box-shadow:0 15px 60px #1f1b2e20}</style></head><body><div class="brand"><img src="http://localhost:4173/favicon.svg"/>pawabase</div><h1>One backend. Every system your application needs,<span> already working together.</span></h1><img class="product" src="http://localhost:4173/media/overview.webp"/></body></html>`,
  );
  await page.evaluate(() => document.fonts.ready);
  await page.locator(".product").evaluate((img) => img.decode());
  await page.screenshot({ path: "public/media/social.png" });
} finally {
  await browser.close();
}
