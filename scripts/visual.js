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
    for (const viewport of [
      { width: 1440, height: 900, label: "desktop" },
      { width: 768, height: 900, label: "tablet" },
      { width: 390, height: 844, label: "mobile" },
      { width: 320, height: 740, label: "compact" },
    ]) {
      const page = await browser.newPage({ viewport });
      const pages = process.env.VISUAL_SCOPE === "summary"
        ? [["next-inspector", "next-inspect.html?sample=7"]]
        : process.env.VISUAL_SCOPE === "demo"
          ? [["demo", "demo.html"]]
        : process.env.VISUAL_SCOPE === "interval"
          ? [["interval", "interval.html"]]
        : process.env.VISUAL_SCOPE === "review"
          ? [["review", "review.html"]]
        : process.env.VISUAL_SCOPE === "landing"
          ? [["landing", ""]]
          : [["landing", ""], ...(viewport.label === "desktop" ? [["inspector", "inspect.html?sample=1"]] : []), ["demo", "demo.html"], ["next-inspector", "next-inspect.html?sample=7"], ["interval", "interval.html"], ["review", "review.html"]];
      for (const [name, suffix] of pages) {
        await page.goto(new URL(suffix, base).href, { waitUntil: "networkidle" });
        if (name === "landing") await page.waitForFunction(() => document.querySelector("#reviewRouting").dataset.ready === "true");
        if (name === "inspector" && viewport.label === "desktop") await page.waitForFunction(() => document.querySelector("#score").textContent !== "—", null, { timeout: 60000 });
        if (name === "inspector") await page.waitForFunction(() => document.querySelector("#sourceImage").naturalWidth > 0, null, { timeout: 60000 });
        if (name === "next-inspector") await page.waitForFunction(() => document.querySelector("#streamScore").textContent !== "—");
        if (name === "interval") await page.waitForFunction(() => document.querySelector(".request-card") !== null);
        if (name === "demo") await page.waitForFunction(() => document.querySelector("#demoChangeChart polyline") !== null);
        const imageSelector = name === "landing"
          ? ".pipeline-hero-motion img, .method-animation img, .feedback-photo img, .ablation-gallery img, .reference-maps img, .change-frames img, .change-graph img, .review-frame-grid img"
          : name === "demo" ? ".shift-photos img"
          : name === "inspector" ? viewport.label === "desktop" ? "#sourceImage, #heatmap" : "#sourceImage" : name === "review" ? "" : name === "interval" ? ".request-card img:not([hidden])" : "#frameImage, #frameHeat";
        const decodeFailures = imageSelector ? await page.locator(imageSelector).evaluateAll(async imgs => {
          const failures = [];
          for (const img of imgs) {
            img.loading = "eager";
            try { await img.decode(); } catch { failures.push(img.src); }
          }
          return failures;
        }) : [];
        if (decodeFailures.length) throw new Error(`${name} ${viewport.label}: image decode failed: ${decodeFailures.join(", ")}`);
        const audit = await page.evaluate(() => ({
          overflow: document.documentElement.scrollWidth > innerWidth + 1,
          brokenImages: [...document.images].filter(img => img.currentSrc && img.loading !== "lazy" && img.complete && !img.naturalWidth).map(img => img.src),
        }));
        await page.screenshot({ path: path.join(out, `${name}-${viewport.label}.png`), fullPage: true });
        if (name === "landing") {
          for (const section of ["foundation", "change", "review", "handoff", "reference"]) {
            await page.locator(`#${section}`).screenshot({ path: path.join(out, `${section}-${viewport.label}.png`) });
          }
        } else if (name === "interval") {
          await page.locator(".request-card").first().getByRole("button", { name: "Show heatmap" }).click();
          await page.locator(".request-card").first().screenshot({ path: path.join(out, `interval-heat-${viewport.label}.png`) });
        } else if (name === "demo") {
          for (let step = 1; step < 5; step++) {
            await page.locator(`.demo-steps button[data-step="${step}"]`).click();
            await page.waitForTimeout(1550);
            if (step === 2) await page.locator("#demoQueue img").evaluateAll(async images => {
              for (const image of images) await image.decode();
            });
            if (step === 3) await page.locator("#demoReviewPhoto").evaluate(image => image.decode());
            await page.screenshot({ path: path.join(out, `demo-${step}-${viewport.label}.png`), fullPage: true });
            if (await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1)) throw new Error(`demo ${step} ${viewport.label}: horizontal overflow`);
          }
        } else if (name === "review") {
          await page.getByRole("button", { name: "Review selected frames" }).click();
          await page.locator("#reviewPhoto").evaluate(image => image.decode());
          await page.screenshot({ path: path.join(out, `review-frame-${viewport.label}.png`), fullPage: true });
          await page.getByRole("button", { name: "Check remaining" }).click();
          const reviewImages = await page.locator(".review-batch-card img").evaluateAll(async images => {
            const failed = [];
            for (const image of images) {
              image.loading = "eager";
              try { await image.decode(); }
              catch {
                image.src = image.src;
                try { await image.decode(); } catch { failed.push(image.src); }
              }
              if (!image.naturalWidth && !failed.includes(image.src)) failed.push(image.src);
            }
            return failed;
          });
          if (reviewImages.length) throw new Error(`Review image decode failed: ${reviewImages.join(", ")}`);
          await page.screenshot({ path: path.join(out, `review-batch-${viewport.label}.png`), fullPage: true });
          await page.getByRole("button", { name: "Compare results" }).click();
          await page.screenshot({ path: path.join(out, `review-result-${viewport.label}.png`), fullPage: true });
          const reviewOverflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1);
          if (reviewOverflow) throw new Error(`review ${viewport.label}: horizontal overflow`);
        } else if (name === "next-inspector") {
          await page.locator(".stream-result-card").screenshot({ path: path.join(out, `stream-result-${viewport.label}.png`) });
          await page.getByRole("button", { name: "Summarize interval" }).click();
          await page.locator("#intervalSelect").selectOption("T1_S164_I36_1");
          await page.locator("#reviewFrames img").evaluateAll(images =>
            Promise.all(images.map(image => image.decode())));
          await page.screenshot({ path: path.join(out, `interval-summary-${viewport.label}.png`) });
          const summaryOverflow = await page.evaluate(() =>
            document.querySelector(".interval-dialog").scrollWidth > document.querySelector(".interval-dialog").clientWidth + 1);
          if (summaryOverflow) throw new Error(`interval summary ${viewport.label}: horizontal overflow`);
          await page.getByRole("button", { name: "Close summary" }).click();
        }
        console.log(`${name} ${viewport.label} ${JSON.stringify(audit)}`);
        if (audit.overflow || audit.brokenImages.length) throw new Error(`${name} ${viewport.label}: layout or image failure`);
      }
      await page.close();
    }
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
