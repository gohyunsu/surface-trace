"use strict";

const assert = require("assert");
const fs = require("fs");
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
    assert.strictEqual(await page.locator(".trial-run-grid section").count(), 3);
    assert((await page.locator(".trial-evaluation").textContent()).includes("40.2% → 6.1%"));
    assert((await page.locator(".trial-evaluation").textContent()).includes(".9873 → .9943"));
    assert((await page.locator(".ablation-chart-labels").textContent()).includes("FRAME 1,264"));
    await page.locator(".ablation-gallery").scrollIntoViewIfNeeded();
    await page.waitForFunction(() => document.querySelector(".ablation-gallery").dataset.ready === "true");
    assert.strictEqual(await page.locator("#pairedCounter").textContent(), "01 / 16");
    assert.strictEqual(await page.locator("#pairedClassicResult").textContent(), "False alarm");
    await page.getByRole("button", { name: "Next photo" }).click();
    assert.strictEqual(await page.locator("#pairedCounter").textContent(), "02 / 16");
    assert.strictEqual(await page.locator("#pairedSelectedResult").textContent(), "Flagged defect");
    await page.waitForFunction(() => document.querySelector("#pairedCounter").textContent === "03 / 16", null, { timeout: 6000 });
    assert.strictEqual(await page.locator("#pairedClassicResult").textContent(), "Flagged defect");
    assert.strictEqual(await page.locator("#pairedSelectedResult").textContent(), "Missed defect");
    for (let i = 0; i < 16; i++) {
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
      assert.strictEqual(await link.getAttribute("target"), null);
    }
    assert(await page.locator(".summary-next .summary-title").getByText("Scores, change, and eight review requests").isVisible());
    assert.strictEqual(await page.locator(".limited-review-grid>div").count(), 4);

    await page.goto(new URL("interval.html", base).href, { waitUntil: "networkidle" });
    assert.strictEqual(await page.locator(".request-card").count(), 8);
    assert.strictEqual(await page.locator("#frameCount").textContent(), "2,884");
    assert.strictEqual(await page.locator("#changeFrame").textContent(), "Frame 96");
    assert((await page.locator("#scoreChart polyline").getAttribute("points")).split(" ").length > 300);
    assert.strictEqual(await page.locator("#changeChart .alert-dot").count(), 1);
    assert(!(await page.locator(".request-panel").textContent()).includes("Defect"));
    await page.locator(".request-card img:not([hidden])").evaluateAll(images =>
      images.forEach(image => { image.loading = "eager"; }));
    await page.waitForFunction(() => [...document.querySelectorAll(".request-card img:not([hidden])")]
      .every(image => image.complete && image.naturalWidth > 0));
    await page.locator(".request-card").first().getByRole("button", { name: "Show heatmap" }).click();
    assert(await page.locator(".request-card").first().locator(".heat").isVisible());
    await page.locator(".request-card").first().locator(".heat").evaluate(image => image.decode());
    await page.locator(".request-card").first().getByRole("button", { name: "Check result" }).click();
    await page.locator(".request-card").first().locator(".request-result").waitFor();
    assert((await page.locator(".request-card").first().textContent()).includes("Recorded result · Defect"));
    assert.strictEqual(await page.locator("#reviewProgress").textContent(), "1 / 8 checked");

    await page.goto(new URL("inspect.html?sample=1", base).href, { waitUntil: "networkidle" });
    await page.waitForFunction(() => document.querySelector("#score").textContent !== "—");
    assert.strictEqual(await page.locator(".sample").count(), 64);
    assert.strictEqual(await page.locator("#status").textContent(), "Review needed");
    assert.strictEqual(await page.locator("#datasetLabel").textContent(), "Dataset label: Defect");

    await page.goto(new URL("next-inspect.html?sample=7", base).href, { waitUntil: "networkidle" });
    await page.waitForFunction(() => document.querySelector("#streamScore").textContent !== "—");
    assert.strictEqual(await page.locator(".stream-sample").count(), 24);
    assert.deepStrictEqual(await page.locator(".stream-sample-group h3").allTextContents(),
      ["Related run", "Changed run · normal", "Larger-shift run"]);
    assert.strictEqual(await page.locator("#streamStatus").textContent(), "Review needed");
    assert.strictEqual(await page.locator("#frameTruth").textContent(), "Dataset label: Defect");
    assert.strictEqual(await page.locator("#frameName").textContent(), "Frame 1,509");
    assert.strictEqual(await page.locator("#changeState").textContent(), "Change alert");
    await page.getByRole("button", { name: "Summarize interval" }).click();
    assert(await page.getByRole("dialog", { name: "Interval summary" }).isVisible());
    assert((await page.locator("#intervalRange").textContent()).includes("2,372 scored"));
    assert.strictEqual(await page.locator(".interval-metrics>div").count(), 2);
    assert.strictEqual(await page.locator("#intervalDialog input[type=file]").count(), 0);
    assert((await page.locator(".interval-signal").textContent()).includes("frame 192"));
    assert.strictEqual(await page.locator(".interval-comparison").count(), 0);
    assert(!/trial candidate|33 → 5|false alarm|missed defect|dataset label/i.test(await page.locator("#intervalDialog").textContent()));
    assert.deepStrictEqual(await page.locator("#intervalSelect option").allTextContents(),
      ["Reference run", "Run 01", "Run 02", "Run 03"]);
    await page.locator("#intervalSelect").selectOption("reference");
    assert.strictEqual(await page.locator(".interval-signal").textContent(), "No change alert");
    assert((await page.locator("#intervalRange").textContent()).includes("1,984 scored"));
    assert((await page.locator(".interval-metrics").textContent()).includes("20"));
    assert(await page.locator("#candidateReview").isHidden());
    await page.locator("#intervalSelect").selectOption("T1_S164_I36_1");
    assert.strictEqual(await page.locator(".interval-case").count(), 1);
    await page.locator(".interval-case").getByRole("button", { name: "Issue" }).click();
    assert((await page.locator(".interval-examples>p").textContent()).includes("1 reviewed"));
    assert.strictEqual(await page.locator(".review-frame").count(), 4);
    assert.deepStrictEqual(await page.locator("#reviewFrames img").evaluateAll(async images => {
      const failed = [];
      for (const image of images) {
        try { await image.decode(); } catch { failed.push(image.src); }
      }
      return failed;
    }), []);
    await page.locator(".review-frame").first().getByRole("button", { name: "Use as normal" }).click();
    assert.strictEqual(await page.locator("#reviewCount").textContent(), "1 / 4 reviewed");
    const reviewDownload = page.waitForEvent("download");
    await page.getByRole("button", { name: "Export summary" }).click();
    const download = await reviewDownload;
    assert(download.suggestedFilename().includes("T1_S164_I36_1"));
    const report = JSON.parse(fs.readFileSync(await download.path(), "utf8"));
    assert.strictEqual(report.flagged_frames, 11);
    assert.strictEqual(report.inspection_reviews[0].decision, "issue");
    assert.strictEqual(report.startup_selection[0].decision, "normal");
    assert.strictEqual(Object.hasOwn(report, "candidate_flagged_frames"), false);
    assert(!Object.keys(report).some(key => /label|ground_truth|false_alarm|missed/i.test(key)));
    await page.getByRole("button", { name: "Close summary" }).click();
    assert.strictEqual(await page.locator("#handcraftedVerdict").textContent(), "Missed");
    assert.strictEqual(await page.locator("#currentVerdict").textContent(), "Flagged");
    await page.locator('[data-reference="handcrafted"]').click();
    assert.strictEqual(await page.locator("#streamStatus").textContent(), "Below threshold");
    await page.locator('[data-reference="current"]').click();
    const currentHeat = await page.locator("#frameHeat").getAttribute("src");
    await page.locator('[data-reference="candidate"]').click();
    assert.strictEqual(await page.locator("#streamStatus").textContent(), "Below threshold");
    assert.strictEqual(await page.locator("#streamAssessment").textContent(), "Missed defect in this frame.");
    assert(await page.locator("#streamAssessment").evaluate(element => element.classList.contains("mismatch")));
    assert.notStrictEqual(await page.locator("#frameHeat").getAttribute("src"), currentHeat);
    await page.getByRole("button", { name: "Normal", exact: true }).click();
    assert.strictEqual(await page.locator(".stream-sample").count(), 14);
    assert.strictEqual(await page.locator("#framePosition").textContent(), "01 / 14");
    assert((await page.locator("#frameTruth").textContent()).includes("Normal"));
    await page.goto(new URL("next-inspect.html?sample=1", base).href, { waitUntil: "networkidle" });
    assert.strictEqual(await page.locator("#changeState").textContent(), "No alert");
    const visiblePoints = (await page.locator("#changeChart polyline").getAttribute("points")).split(" ").length;
    assert(visiblePoints < 100, "Change plot should stop at the selected frame");
    await page.goto(new URL("review.html", base).href, { waitUntil: "networkidle" });
    await page.getByRole("button", { name: "Review selected frames" }).click();
    assert.strictEqual(await page.locator("#reviewTrack button").count(), 24);
    await page.locator("#reviewPhoto").evaluate(image => image.decode());
    await page.getByRole("button", { name: "Check frame", exact: true }).click();
    assert.strictEqual(await page.locator("#reviewLabel").textContent(), "Normal");
    await page.getByRole("button", { name: "Check remaining" }).click();
    assert.strictEqual(await page.locator(".review-batch-card").count(), 24);
    assert((await page.locator("#reviewBatchCount").textContent()).includes("2 corrections"));
    await page.getByRole("button", { name: "Compare results" }).click();
    assert((await page.locator("#reviewMetrics").textContent()).includes("11 → 0"));
    assert((await page.locator("#guardMetric").textContent()).includes("33 → 0 / 82"));
    assert.strictEqual(await page.locator("#guardChart .review-distribution").count(), 4);
    assert((await page.locator("#reviewConclusion").textContent()).includes("Hold the candidate"));
    await page.locator("#reviewRun").selectOption("T1_S478_I118_2");
    await page.getByRole("button", { name: "Review selected frames" }).click();
    await page.getByRole("button", { name: "Check remaining" }).click();
    await page.getByRole("button", { name: "Compare results" }).click();
    assert((await page.locator("#reviewConclusion").textContent()).includes("No confirmed false alerts"));
    assert.deepStrictEqual(errors, []);
    console.log(JSON.stringify({ baselineSamples: 64, newSamples: 24, pairedFrames: 16, candidateMiss: true, pageErrors: errors }));
  } finally {
    await browser.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
