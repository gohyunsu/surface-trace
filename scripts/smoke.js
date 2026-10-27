"use strict";

const assert = require("assert");
const { chromium } = require("playwright");

(async () => {
  const browser = await chromium.launch({
    headless: true,
    executablePath: process.env.CHROME_PATH || undefined,
  });
  const errors = [];
  const base = process.env.SITE_URL || "http://127.0.0.1:8766/";
  try {
    const page = await browser.newPage();
    page.on("pageerror", error => errors.push(error.message));
    await page.goto(base, { waitUntil: "networkidle" });
    assert((await page.title()).includes("SurfaceTrace"));
    assert.strictEqual(await page.locator("#baseline .method-card").count(), 6);
    assert.strictEqual(await page.locator("#next .method-card").count(), 6);
    for (const [section, destination] of [["baseline", "inspect.html"], ["next", "next-inspect.html"]]) {
      const link = page.locator(`#${section} .method-foot a`);
      assert((await link.getAttribute("href")).endsWith(destination));
      assert.strictEqual(await link.getAttribute("target"), "_blank");
    }
    assert(await page.getByRole("heading", { name: "Daily review summary", exact: true }).isVisible());

    await page.goto(new URL("inspect.html?sample=1", base).href, { waitUntil: "networkidle" });
    await page.waitForFunction(() => document.querySelector("#score").textContent !== "—");
    assert.strictEqual(await page.locator(".sample").count(), 64);
    assert.strictEqual(await page.locator("#status").textContent(), "Review needed");
    assert.strictEqual(await page.locator("#datasetLabel").textContent(), "Dataset label: Defect");

    await page.goto(new URL("next-inspect.html?sample=7", base).href, { waitUntil: "networkidle" });
    await page.waitForFunction(() => document.querySelector("#streamScore").textContent !== "—");
    assert.strictEqual(await page.locator(".stream-sample").count(), 12);
    assert.strictEqual(await page.locator("#streamStatus").textContent(), "Review needed");
    assert.strictEqual(await page.locator("#frameTruth").textContent(), "Dataset label: Defect");
    assert.strictEqual(await page.locator("#changeState").textContent(), "Change alert");
    const currentHeat = await page.locator("#frameHeat").getAttribute("src");
    await page.getByRole("button", { name: "Candidate", exact: true }).click();
    assert.strictEqual(await page.locator("#streamStatus").textContent(), "Within range");
    assert.strictEqual(await page.locator("#streamAssessment").textContent(), "Missed defect in this frame.");
    assert.notStrictEqual(await page.locator("#frameHeat").getAttribute("src"), currentHeat);
    await page.getByRole("button", { name: "Normal", exact: true }).click();
    assert.strictEqual(await page.locator(".stream-sample").count(), 6);
    assert.strictEqual(await page.locator("#framePosition").textContent(), "01 / 06");
    assert((await page.locator("#frameTruth").textContent()).includes("Normal"));
    await page.goto(new URL("next-inspect.html?sample=1", base).href, { waitUntil: "networkidle" });
    assert.strictEqual(await page.locator("#changeState").textContent(), "No alert");
    const visiblePoints = (await page.locator("#changeChart polyline").getAttribute("points")).split(" ").length;
    assert(visiblePoints < 100, "Change plot should stop at the selected frame");
    assert.deepStrictEqual(errors, []);
    console.log(JSON.stringify({ baselineSamples: 64, newSamples: 12, candidateMiss: true, pageErrors: errors }));
  } finally {
    await browser.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
