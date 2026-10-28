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
    assert(await page.getByRole("heading", { name: "Find unusual areas. Track change." }).isVisible());
    assert.strictEqual(await page.locator(".hero .hero-visual-grid").count(), 0);
    assert.strictEqual(await page.locator(".pipeline-hero-motion img").evaluate(image => image.complete && image.naturalWidth > 0), true);
    assert.strictEqual(await page.locator(".feedback-photo img").evaluate(image => image.complete && image.naturalWidth > 0), true);
    const heroImage = page.locator(".pipeline-hero-motion img");
    const firstFrame = await heroImage.screenshot();
    await page.waitForTimeout(3100);
    assert.notDeepStrictEqual(await heroImage.screenshot(), firstFrame, "Hero animation should advance automatically");
    assert.strictEqual(await page.locator("#baseline .method-card").count(), 6);
    assert.strictEqual(await page.locator("#next .method-card").count(), 6);
    assert(await page.getByRole("heading", { name: "How each method handled the shift." }).isVisible());
    assert.strictEqual(await page.locator(".ablation-step").count(), 4);
    assert((await page.locator(".ablation-chart-labels").textContent()).includes("FRAME 1,264"));
    await page.locator(".ablation-gallery").scrollIntoViewIfNeeded();
    await page.waitForFunction(() => document.querySelector(".ablation-gallery").dataset.ready === "true");
    assert.strictEqual(await page.locator("#pairedCounter").textContent(), "01 / 12");
    assert.strictEqual(await page.locator("#pairedClassicResult").textContent(), "False alarm");
    await page.getByRole("button", { name: "Next photo" }).click();
    assert.strictEqual(await page.locator("#pairedCounter").textContent(), "02 / 12");
    assert.strictEqual(await page.locator("#pairedSelectedResult").textContent(), "Flagged defect");
    await page.waitForFunction(() => document.querySelector("#pairedCounter").textContent === "03 / 12", null, { timeout: 6000 });
    assert.strictEqual(await page.locator("#pairedClassicResult").textContent(), "Flagged defect");
    assert.strictEqual(await page.locator("#pairedSelectedResult").textContent(), "Missed defect");
    for (let i = 0; i < 12; i++) {
      const failures = await page.locator("#pairedCase img").evaluateAll(async images => {
        const failed = [];
        for (const image of images) {
          try { await image.decode(); } catch { failed.push(image.src); }
        }
        return failed;
      });
      assert.deepStrictEqual(failures, [], "Each paired photo and heatmap should load");
      await page.getByRole("button", { name: "Next photo" }).click();
    }
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
    assert.deepStrictEqual(await page.locator(".stream-sample-group h3").allTextContents(),
      ["Related run", "Changed run · normal", "Larger-shift run"]);
    assert.strictEqual(await page.locator("#streamStatus").textContent(), "Review needed");
    assert.strictEqual(await page.locator("#frameTruth").textContent(), "Dataset label: Defect");
    assert.strictEqual(await page.locator("#frameName").textContent(), "Frame 1,509");
    assert.strictEqual(await page.locator("#changeState").textContent(), "Change alert");
    const currentHeat = await page.locator("#frameHeat").getAttribute("src");
    await page.getByRole("button", { name: "Candidate", exact: true }).click();
    assert.strictEqual(await page.locator("#streamStatus").textContent(), "Below threshold");
    assert.strictEqual(await page.locator("#streamAssessment").textContent(), "Missed defect in this frame.");
    assert(await page.locator("#streamAssessment").evaluate(element => element.classList.contains("mismatch")));
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
