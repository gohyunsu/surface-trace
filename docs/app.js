"use strict";

// Browser-only version of the small hand-crafted reference model in model.py.
// It is a demo baseline, not PatchCore and not a calibrated failure probability.
const $ = id => document.getElementById(id);
const W = 256, H = 640, B = 8, GRID_W = W / B, GRID_H = H / B;
const samplePaths = Array.from({ length: 6 }, (_, i) => `./samples/sample-${String(i + 1).padStart(2, "0")}.jpg`);
// Dataset labels for the fixed sample order in build_pages.py (verified against manifest.csv).
const sampleLabels = ["Defect", "Defect", "Defect", "Normal", "Normal", "Normal"];
let objectUrl = null;
let requestId = 0;
const modelPromise = fetch("./normal_reference.json").then(response => {
  if (!response.ok) throw new Error("Could not load the reference model.");
  return response.json();
}).then(model => {
  model.bank = Float32Array.from(model.bank);
  model.center = Float32Array.from(model.center);
  model.scale = Float32Array.from(model.scale);
  model.normal_scores = Float32Array.from(model.normal_scores);
  return model;
});

function percentile(values, p) {
  const sorted = Array.from(values).sort((a, b) => a - b);
  const index = (sorted.length - 1) * p;
  const lo = Math.floor(index), hi = Math.ceil(index);
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (index - lo);
}

function morphPass(input, horizontal, maximum) {
  const output = new Float32Array(input.length);
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      let value = maximum ? -Infinity : Infinity;
      for (let offset = -3; offset <= 3; offset++) {
        const xx = horizontal ? Math.max(0, Math.min(W - 1, x + offset)) : x;
        const yy = horizontal ? y : Math.max(0, Math.min(H - 1, y + offset));
        const v = input[yy * W + xx];
        value = maximum ? Math.max(value, v) : Math.min(value, v);
      }
      output[y * W + x] = value;
    }
  }
  return output;
}

function makeFeatures(raw) {
  const rawSorted = Float32Array.from(raw).sort();
  const median = (rawSorted[rawSorted.length / 2 - 1] + rawSorted[rawSorted.length / 2]) / 2;
  let meanRaw = 0;
  for (const v of raw) meanRaw += v;
  meanRaw /= raw.length;
  let variance = 0;
  for (const v of raw) variance += (v - meanRaw) ** 2;
  const spread = Math.sqrt(variance / raw.length);
  const gray = new Float32Array(raw.length);
  for (let i = 0; i < raw.length; i++) gray[i] = Math.max(-4, Math.min(4, (raw[i] - median) / Math.max(spread, .06)));

  const dilated = morphPass(morphPass(raw, true, true), false, true);
  const closed = morphPass(morphPass(dilated, true, false), false, false);
  const dark = new Float32Array(raw.length);
  for (let i = 0; i < raw.length; i++) dark[i] = Math.max(0, closed[i] - raw[i]);

  const features = new Float32Array(GRID_W * GRID_H * 8);
  for (let by = 0; by < GRID_H; by++) {
    for (let bx = 0; bx < GRID_W; bx++) {
      const intensity = [], gaps = [];
      let sum = 0, sumSq = 0, darkSum = 0, gxSum = 0, gySum = 0;
      for (let dy = 0; dy < B; dy++) {
        const y = by * B + dy;
        for (let dx = 0; dx < B; dx++) {
          const x = bx * B + dx, i = y * W + x, v = gray[i];
          intensity.push(v); gaps.push(dark[i]);
          sum += v; sumSq += v * v; darkSum += dark[i];
          gxSum += x ? Math.abs(v - gray[i - 1]) : 0;
          gySum += y ? Math.abs(v - gray[i - W]) : 0;
        }
      }
      intensity.sort((a, b) => a - b);
      gaps.sort((a, b) => a - b);
      const quantile = (arr, p) => {
        const index = 63 * p, lo = Math.floor(index), hi = Math.ceil(index);
        return arr[lo] + (arr[hi] - arr[lo]) * (index - lo);
      };
      const mean = sum / 64, at = (by * GRID_W + bx) * 8;
      features[at] = mean;
      features[at + 1] = Math.sqrt(Math.max(0, sumSq / 64 - mean * mean));
      features[at + 2] = quantile(intensity, .10);
      features[at + 3] = quantile(intensity, .90);
      features[at + 4] = darkSum / 64;
      features[at + 5] = quantile(gaps, .95);
      features[at + 6] = gxSum / 64;
      features[at + 7] = gySum / 64;
    }
  }
  return features;
}

function nearestScores(features, model) {
  const scores = new Float32Array(GRID_W * GRID_H);
  const q = new Float32Array(8);
  for (let patch = 0; patch < scores.length; patch++) {
    const at = patch * 8;
    for (let k = 0; k < 8; k++) q[k] = (features[at + k] - model.center[k]) / model.scale[k];
    let best = Infinity;
    for (let row = 0; row < model.bank_rows; row++) {
      const bankAt = row * 8;
      let d = 0;
      for (let k = 0; k < 8; k++) {
        const delta = q[k] - model.bank[bankAt + k];
        d += delta * delta;
      }
      if (d < best) best = d;
    }
    scores[patch] = Math.sqrt(best);
  }
  return scores;
}

async function infer(blob, model) {
  const bitmap = await createImageBitmap(blob);
  const originalWidth = bitmap.width, originalHeight = bitmap.height;
  const canvas = document.createElement("canvas"); canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  ctx.drawImage(bitmap, 0, 0, W, H);
  bitmap.close();
  const rgba = ctx.getImageData(0, 0, W, H).data;
  const raw = new Float32Array(W * H);
  for (let i = 0; i < raw.length; i++) {
    const at = i * 4;
    raw[i] = Math.round(.299 * rgba[at] + .587 * rgba[at + 1] + .114 * rgba[at + 2]) / 255;
  }
  const scores = nearestScores(makeFeatures(raw), model);
  const score = percentile(scores, .995);
  let below = 0;
  for (const normalScore of model.normal_scores) if (normalScore <= score) below++;

  const heat = document.createElement("canvas"); heat.width = GRID_W; heat.height = GRID_H;
  const hctx = heat.getContext("2d");
  const pixels = hctx.createImageData(GRID_W, GRID_H);
  for (let i = 0; i < scores.length; i++) {
    const alpha = Math.max(0, Math.min(1, (scores[i] - model.threshold * .35) / Math.max(model.threshold * .9, .01)));
    pixels.data[i * 4] = 244;
    pixels.data[i * 4 + 1] = 64;
    pixels.data[i * 4 + 2] = 54;
    pixels.data[i * 4 + 3] = Math.round(alpha * 200);
  }
  hctx.putImageData(pixels, 0, 0);
  const ratio = originalWidth / originalHeight;
  return {
    score, threshold: model.threshold,
    normal_percentile: below / model.normal_scores.length * 100,
    comparable: ratio >= .32 && ratio <= .50 && Math.min(originalWidth, originalHeight) >= 200,
    heatmap: heat.toDataURL("image/png"),
  };
}

const setStatus = (label, type = "") => { $("status").textContent = label; $("status").className = "status " + type; };
const steps = list => { $("actions").replaceChildren(...list.map(text => { const li = document.createElement("li"); li.textContent = text; return li; })); };

async function analyze(blob, label, datasetLabel = null) {
  const thisRequest = ++requestId;
  $("datasetLabel").hidden = !datasetLabel;
  $("datasetLabel").textContent = datasetLabel ? `Dataset label: ${datasetLabel}` : "";
  if (blob.size > 15_000_000) { setStatus("File is too large", "unknown"); return; }
  if (objectUrl) URL.revokeObjectURL(objectUrl);
  objectUrl = URL.createObjectURL(blob);
  $("sourceImage").src = objectUrl;
  $("heatmap").removeAttribute("src");
  $("filename").textContent = label;
  $("empty").style.display = "none";
  $("imageWrap").style.display = "block";
  $("score").textContent = "—";
  $("meterFill").style.width = "0";
  setStatus("Analyzing");
    $("assessment").textContent = "Analyzing the photo…";
  try {
    const model = await modelPromise;
    await new Promise(resolve => requestAnimationFrame(resolve));
    const result = await infer(blob, model);
    if (thisRequest !== requestId) return;
    $("heatmap").src = result.heatmap;
    $("score").textContent = result.score.toFixed(2);
    $("threshold").textContent = "Review threshold " + result.threshold.toFixed(2);
    $("meterFill").style.width = Math.min(100, result.score / Math.max(result.threshold * 1.5, .01) * 100) + "%";
    if (!result.comparable) {
      setStatus("Photo setup differs", "unknown");
      $("assessment").textContent = "The photo does not match the reference framing. Use the highlight as a visual cue only.";
      steps(["Check highlighted areas", "Retake with matching framing"]);
    } else if (result.score >= result.threshold) {
      setStatus("Review needed", "review");
      $("assessment").textContent = datasetLabel === "Normal"
        ? "Above the review threshold, although the dataset labels this photo normal. Check this false alarm."
        : "Above the review threshold. Inspect the red areas.";
      steps(["Inspect highlighted areas", "Retake the same area", "Record against site criteria"]);
    } else {
      setStatus("Within range", "ok");
      $("assessment").textContent = datasetLabel === "Defect"
        ? "Below the review threshold, despite the dataset defect label. This sample was not flagged."
        : "Within the review threshold.";
      steps(["Check any highlighted areas", "Record the result if clear"]);
    }
  } catch (error) {
    if (thisRequest !== requestId) return;
    setStatus("Analysis failed", "unknown");
    $("assessment").textContent = error.message;
    steps(["Check the file type and size, then try again"]);
  }
}

$("fileInput").addEventListener("change", e => { const file = e.target.files[0]; if (file) analyze(file, file.name); });
async function loadSample(index) {
  const response = await fetch(samplePaths[index]);
  if (!response.ok) { setStatus("Could not load the sample", "unknown"); return; }
  for (const [i, button] of sampleButtons.entries()) button.setAttribute("aria-pressed", i === index ? "true" : "false");
  analyze(await response.blob(), `Sample ${String(index + 1).padStart(2, "0")}`, sampleLabels[index]);
}

$("trySample").addEventListener("click", () => loadSample(0));
$("opacity").addEventListener("input", e => { $("heatmap").style.opacity = e.target.value / 100; });
$("viewer").addEventListener("dragover", e => e.preventDefault());
$("viewer").addEventListener("drop", e => { e.preventDefault(); const file = e.dataTransfer.files[0]; if (file) analyze(file, file.name); });
const sampleButtons = [];
for (const [i, path] of samplePaths.entries()) {
  const name = `Sample ${String(i + 1).padStart(2, "0")}`;
  const button = document.createElement("button"); button.type = "button"; button.className = "sample";
  button.setAttribute("aria-pressed", "false");
  button.setAttribute("aria-label", `${name}, dataset label: ${sampleLabels[i]}`);
  const image = document.createElement("img"); image.src = path; image.alt = "";
  const meta = document.createElement("span"); meta.className = "sample-meta";
  const label = document.createElement("span"); label.className = "sample-name"; label.textContent = name;
  const truth = document.createElement("span"); truth.className = "sample-truth"; truth.textContent = `Dataset: ${sampleLabels[i]}`;
  meta.append(label, truth);
  button.append(image, meta);
  button.addEventListener("click", () => loadSample(i));
  $("samples").append(button);
  sampleButtons.push(button);
}

const selectedSample = Number(new URLSearchParams(location.search).get("sample"));
if (Number.isInteger(selectedSample) && selectedSample >= 1 && selectedSample <= samplePaths.length) loadSample(selectedSample - 1);
