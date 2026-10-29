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
        : process.env.VISUAL_SCOPE === "landing"
          ? [["landing", ""]]
          : [["landing", ""], ["inspector", "inspect.html?sample=1"], ["next-inspector", "next-inspect.html?sample=7"]];
      for (const [name, suffix] of pages) {
        await page.goto(new URL(suffix, base).href, { waitUntil: "networkidle" });
        if (name === "inspector") await page.waitForFunction(() => document.querySelector("#score").textContent !== "—");
        if (name === "next-inspector") await page.waitForFunction(() => document.querySelector("#streamScore").textContent !== "—");
        const imageSelector = name === "landing"
          ? ".pipeline-hero-motion img, .method-animation img, .feedback-photo img, .scenario-timeline img, .ablation-step-image img, .change-effect img"
          : name === "inspector" ? "#sourceImage, #heatmap" : "#frameImage, #frameHeat";
        const decodeFailures = await page.locator(imageSelector).evaluateAll(async imgs => {
          const failures = [];
          for (const img of imgs) {
            img.loading = "eager";
            try { await img.decode(); } catch { failures.push(img.src); }
          }
          return failures;
        });
        if (decodeFailures.length) throw new Error(`${name} ${viewport.label}: image decode failed: ${decodeFailures.join(", ")}`);
        const audit = await page.evaluate(() => ({
          overflow: document.documentElement.scrollWidth > innerWidth + 1,
          brokenImages: [...document.images].filter(img => img.loading !== "lazy" && img.complete && !img.naturalWidth).map(img => img.src),
        }));
        await page.screenshot({ path: path.join(out, `${name}-${viewport.label}.png`), fullPage: true });
        if (name === "landing") {
          for (const section of ["scenario", "ablation-chart", "ablation-effects", "ablation-gallery"]) {
            await page.locator(`.${section}`).screenshot({ path: path.join(out, `${section}-${viewport.label}.png`) });
          }
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
