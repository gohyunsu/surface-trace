"use strict";

// Capture the real recorded-run page for a 1920 x 1080 presentation GIF.
// Run against a local build served over HTTP. Frames stay under out/.

const fs = require("fs");
const path = require("path");
const { chromium } = require("playwright");

const base = process.env.SITE_URL || "http://127.0.0.1:8766/";
const frameDir = path.resolve(process.argv[2] || "out/recorded-run-frames");
const fps = 4;

(async () => {
  fs.mkdirSync(frameDir, { recursive: true });
  const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROME_PATH || undefined });
  try {
    const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
    await page.clock.install();
    await page.goto(new URL("demo.html", base).href, { waitUntil: "networkidle" });
    await page.waitForFunction(() => document.querySelector("#demoChangeChart polyline") !== null);
    await page.addStyleTag({ content: `
      .site-header,.site-footer,.demo-source{display:none!important}
      .demo-main{width:min(1680px,calc(100% - 120px));padding:52px 0 0}
      .demo-intro{margin-bottom:24px}
      .demo-intro h1{font-size:66px}
      .demo-steps button{font-size:16px;padding:14px 21px}
      .demo-stage{min-height:690px;grid-template-columns:minmax(0,.78fr) minmax(0,1.22fr)}
      .demo-copy{padding:65px}
      .demo-copy h2{font-size:55px}
      .demo-copy>p:not(.demo-kicker){font-size:19px}
      .demo-kicker{font-size:13px}
      .demo-callout strong{font-size:50px}
      .demo-callout span,.demo-visual-note,.shift-photos figcaption{font-size:15px}
      .demo-visual{padding:45px}
      .check-visual{padding:40px 60px}
      .demo-check-photo{max-height:380px}
      .demo-outcome{font-size:25px}
      .decision-visual{padding:55px}
      .decision-row>span{font-size:17px}
      .decision-row strong{font-size:27px}
      .demo-controls{margin-top:15px}
    ` });
    const save = async index => {
      await page.screenshot({ path: path.join(frameDir, `frame-${String(index).padStart(4, "0")}.png`), animations: "allow" });
    };
    let index = 0;
    for (let i = 0; i < fps * 2; i++) await save(index++);
    await page.getByRole("button", { name: "Play recorded run" }).click();
    for (let elapsed = 0; elapsed < 45 * fps; elapsed++) {
      await page.clock.runFor(1000 / fps);
      await save(index++);
      if (await page.locator('.demo-stage[data-scene="3"]').isVisible() &&
          !await page.locator("body").evaluate(node => node.classList.contains("is-playing"))) break;
    }
    for (let i = 0; i < fps * 2; i++) await save(index++);
    const final = await page.evaluate(() => ({
      scene: document.querySelector('.demo-steps button[aria-current="step"]')?.dataset.step,
      width: innerWidth,
      height: innerHeight,
      error: document.querySelector("#demoError")?.textContent,
    }));
    if (final.scene !== "3" || final.width !== 1920 || final.height !== 1080 || final.error) {
      throw new Error(`Capture stopped in an unexpected state: ${JSON.stringify(final)}`);
    }
    console.log(JSON.stringify({ frames: index, fps, resolution: "1920x1080", directory: frameDir }));
  } finally {
    await browser.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
