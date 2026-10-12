"use strict";

const fs = require("fs");
const path = require("path");
const { chromium } = require("playwright");

(async () => {
  const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROME_PATH || undefined });
  const base = process.env.SITE_URL || "http://127.0.0.1:8766/";
  const out = path.join(__dirname, "..", "out", "visual");
  fs.mkdirSync(out, { recursive: true });
  try {
    for (const viewport of [{ width: 1440, height: 900, label: "desktop" }, { width: 390, height: 844, label: "mobile" }]) {
      const page = await browser.newPage({ viewport });
      for (const [name, suffix] of [["landing", ""], ["inspector", "inspect.html?sample=1"]]) {
        await page.goto(new URL(suffix, base).href, { waitUntil: "networkidle" });
        if (name === "inspector") await page.waitForFunction(() => document.querySelector("#score").textContent !== "—");
        const audit = await page.evaluate(() => ({
          overflow: document.documentElement.scrollWidth > innerWidth + 1,
          brokenImages: [...document.images].filter(img => !img.complete || !img.naturalWidth).map(img => img.src),
        }));
        await page.screenshot({ path: path.join(out, `${name}-${viewport.label}.png`), fullPage: true });
        console.log(`${name} ${viewport.label} ${JSON.stringify(audit)}`);
      }
      await page.close();
    }
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
