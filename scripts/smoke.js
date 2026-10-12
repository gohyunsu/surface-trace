"use strict";

// Run with Playwright installed to smoke-test the GitHub Pages package.
const assert = require("assert");
const path = require("path");
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
    assert(await page.getByRole("link", { name: /Try a real sample/ }).count());
    await page.getByRole("link", { name: /Try a real sample/ }).click();
    assert(page.url().includes("inspect.html?sample=1"));
    await page.waitForFunction(() => document.querySelector("#score").textContent !== "—", null, { timeout: 60000 });
    const score = Number(await page.locator("#score").textContent());
    const status = await page.locator("#status").textContent();
    const heatmap = await page.locator("#heatmap").getAttribute("src");
    assert(score > 2.5 && score < 4.5, `Unexpected sample score: ${score}`);
    assert.strictEqual(status, "Review needed");
    assert(heatmap.startsWith("data:image/png;base64,"), "Missing heatmap");
    assert.deepStrictEqual(errors, []);
    if (process.env.SCREENSHOT_PATH) await page.screenshot({ path: process.env.SCREENSHOT_PATH, fullPage: true });
    await page.locator("#fileInput").setInputFiles(path.join(__dirname, "..", "docs", "samples", "sample-04.jpg"));
    await page.waitForFunction(() => document.querySelector("#filename").textContent === "sample-04.jpg" && document.querySelector("#score").textContent !== "—", null, { timeout: 60000 });
    console.log(JSON.stringify({ sampleScore: score, sampleStatus: status, uploadScore: await page.locator("#score").textContent(), uploadStatus: await page.locator("#status").textContent(), pageErrors: errors }));
  } finally {
    await browser.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
