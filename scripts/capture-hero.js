// Captures a hero screenshot of the running app for the landing page.
// Usage: node scripts/capture-hero.js [url] [out]
const puppeteer = require("puppeteer-core");
const fs = require("fs");

const url = process.argv[2] || "http://localhost:3000";
const out = process.argv[3] || "docs/assets/app-hero.png";
const chrome = ["/usr/bin/google-chrome", "/usr/bin/chromium", "/root/bin/chromium"].find(fs.existsSync);

(async () => {
  const browser = await puppeteer.launch({ executablePath: chrome, headless: "new", args: ["--no-sandbox", "--disable-gpu"] });
  const page = await browser.newPage();
  await page.setViewport({ width: 1600, height: 1000, deviceScaleFactor: 1 });
  await page.goto(url, { waitUntil: "networkidle2", timeout: 90000 });
  await new Promise((r) => setTimeout(r, 2500));
  if (process.argv[4] === "close-splash") {
    const btn = await page.$('[data-testid="splash-get-started"]');
    if (btn) { await btn.click(); await new Promise((r) => setTimeout(r, 800)); }
  }
  fs.mkdirSync(require("path").dirname(out), { recursive: true });
  await page.screenshot({ path: out, type: "png" });
  await browser.close();
  console.log("saved", out);
})();
