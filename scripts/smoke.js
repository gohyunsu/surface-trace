"use strict";

const assert = require("assert");
const { chromium } = require("playwright");

(async () => {
  const browser = await chromium.launch({
    headless: true,
    executablePath: process.env.CHROME_PATH || undefined,
  });
  try {
    const page = await browser.newPage();
    const errors = [];
    page.on("pageerror", error => errors.push(error.message));
    const base = process.env.SITE_URL || "http://127.0.0.1:8766/";
    await page.goto(base, { waitUntil: "networkidle" });
    assert((await page.title()).includes("SurfaceTrace"));
    await page.getByRole("link", { name: /Try a real sample/ }).click();
    assert(page.url().includes("inspect.html?sample=1"));
    await page.waitForFunction(() => document.querySelector("#score").textContent !== "—", null, { timeout: 60000 });
    assert.strictEqual(await page.locator(".sample").count(), 64);
    assert.strictEqual(await page.locator('input[type="file"]').count(), 0);
    const score = Number(await page.locator("#score").textContent());
    assert(score > 2.5 && score < 4.5, `Unexpected sample score: ${score}`);
    assert.strictEqual(await page.locator("#status").textContent(), "Review needed");
    const dimensions = await page.evaluate(async () => {
      const source = document.querySelector("#sourceImage");
      const heat = new Image();
      heat.src = document.querySelector("#heatmap").src;
      await heat.decode();
      return { source: [source.naturalWidth, source.naturalHeight], heat: [heat.naturalWidth, heat.naturalHeight] };
    });
    assert(dimensions.source[0] > dimensions.source[1], "Displayed photo is not landscape");
    assert(dimensions.heat[0] > dimensions.heat[1], "Heatmap is not landscape");
    await page.getByRole("button", { name: "Defect", exact: true }).click();
    assert.strictEqual(await page.locator(".sample:not([hidden])").count(), 8);
    await page.getByRole("button", { name: "Normal", exact: true }).click();
    assert.strictEqual(await page.locator(".sample:not([hidden])").count(), 56);
    await page.waitForFunction(() => document.querySelector("#datasetLabel").textContent === "Dataset: Normal" && document.querySelector("#score").textContent !== "—", null, { timeout: 60000 });
    assert.deepStrictEqual(errors, []);
    if (process.env.SCREENSHOT_PATH) await page.screenshot({ path: process.env.SCREENSHOT_PATH, fullPage: true });
    console.log(JSON.stringify({ score, status: "Review needed", samples: 64, dimensions, pageErrors: errors }));
  } finally {
    await browser.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
