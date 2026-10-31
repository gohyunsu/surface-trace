"use strict";

const $ = id => document.getElementById(id);
const svgNS = "http://www.w3.org/2000/svg";
const state = { manifest: null, evaluation: null, featureCases: [], featureIndex: 0, featureTimer: null, scene: 0, reviewIndex: 0, revealed: false, playing: false, timer: null };

function renderFeature(index) {
  state.featureIndex = index % state.featureCases.length;
  const { sample, classic, phase } = state.featureCases[state.featureIndex];
  const defect = sample.label === "Defect";
  const dinoAlert = sample.current.score >= sample.current.threshold;
  const verdict = alert => defect ? alert ? "Defect flagged" : "Defect missed" : alert ? "False alarm" : "Normal retained";
  $("demoFeatureContext").textContent = `${phase} · ${sample.label} · frame ${sample.frame.toLocaleString()}`;
  $("demoFeatureCounter").textContent = `${String(state.featureIndex + 1).padStart(2, "0")} / ${String(state.featureCases.length).padStart(2, "0")}`;
  $("demoClassicPhoto").src = sample.image;
  $("demoDinoPhoto").src = sample.image;
  $("demoClassicMap").src = `./ablation/${classic.overlay}`;
  $("demoDinoMap").src = sample.current.heatmap;
  $("demoClassicPhoto").alt = `${sample.label} textile photo, frame ${sample.frame}`;
  $("demoDinoPhoto").alt = `Same ${sample.label.toLowerCase()} textile photo, frame ${sample.frame}`;
  for (const [id, alert] of [["demoClassicVerdict", classic.alert], ["demoDinoVerdict", dinoAlert]]) {
    const node = $(id);
    node.textContent = verdict(alert);
    node.className = alert === defect ? "is-correct" : "is-error";
  }
}

function rotateFeatures() {
  clearTimeout(state.featureTimer);
  if (!state.playing || state.scene !== 0) return;
  state.featureTimer = setTimeout(() => { renderFeature(state.featureIndex + 1); rotateFeatures(); }, 2050);
}

function svg(parent, tag, attributes, label) {
  const node = document.createElementNS(svgNS, tag);
  for (const [key, value] of Object.entries(attributes)) node.setAttribute(key, String(value));
  if (label) node.textContent = label;
  parent.append(node);
  return node;
}

function trace(parent, points, className) {
  svg(parent, "polyline", { points: points.map(([x, y]) => `${x.toFixed(2)},${y.toFixed(2)}`).join(" "), class: className, pathLength: 100 });
}

function drawChange({ window_ends: ends, window_scores: scores, limit, splice_boundary: boundary, alert }) {
  const chart = $("demoChangeChart");
  chart.replaceChildren();
  const x = frame => 19 + (frame - ends[0]) / (ends.at(-1) - ends[0]) * 601;
  const y = score => 148 - score / (Math.max(...scores, limit) * 1.1) * 119;
  for (const level of [0, .5, 1]) svg(chart, "line", { x1: 19, x2: 620, y1: 148 - level * 119, y2: 148 - level * 119, class: "demo-chart-grid" });
  svg(chart, "line", { x1: 19, x2: 620, y1: y(limit), y2: y(limit), class: "demo-chart-limit" });
  svg(chart, "line", { x1: x(boundary), x2: x(boundary), y1: 25, y2: 148, class: "demo-chart-boundary" });
  trace(chart, scores.map((score, i) => [x(ends[i]), y(score)]), "demo-chart-line");
  const index = ends.indexOf(alert);
  if (index >= 0) svg(chart, "circle", { cx: x(alert), cy: y(scores[index]), r: 5, class: "demo-chart-alert" });
  svg(chart, "text", { x: 19, y: 171 }, "Reference");
  svg(chart, "text", { x: x(boundary) + 6, y: 171 }, "New run");
  svg(chart, "text", { x: 615, y: 171, "text-anchor": "end" }, "Frame 96 alert");
}

function drawScores(manifest) {
  const chart = $("demoScoreChart");
  chart.replaceChildren();
  const groups = [];
  for (let i = 0; i < manifest.scores.length; i += 8) groups.push(Math.max(...manifest.scores.slice(i, i + 8)));
  const low = Math.min(...groups), high = Math.max(...groups);
  const x = index => 18 + index / (groups.length - 1) * 602;
  const y = score => 162 - (score - low) / Math.max(1e-8, high - low) * 132;
  for (const level of [0, .5, 1]) svg(chart, "line", { x1: 18, x2: 620, y1: 162 - level * 132, y2: 162 - level * 132, class: "demo-chart-grid" });
  trace(chart, groups.map((score, index) => [x(index), y(score)]), "demo-chart-line");
  const [first, last] = manifest.evaluation_frames;
  for (const item of manifest.review) {
    const index = Math.min(groups.length - 1, Math.max(0, Math.floor((item.frame - first) / 8)));
    svg(chart, "circle", { cx: x(index), cy: y(groups[index]), r: 4.5, class: "demo-score-marker" });
  }
  svg(chart, "text", { x: 18, y: 192 }, first.toLocaleString());
  svg(chart, "text", { x: 620, y: 192, "text-anchor": "end" }, last.toLocaleString());
}

function drawQueue(review) {
  const queue = $("demoQueue");
  queue.replaceChildren();
  for (const item of review) {
    const cell = document.createElement("div");
    const image = document.createElement("img");
    image.src = item.image;
    image.alt = `Review request ${item.rank}, recorded frame ${item.frame}`;
    const rank = document.createElement("span");
    rank.textContent = `#${String(item.rank).padStart(2, "0")}`;
    cell.append(image, rank);
    queue.append(cell);
  }
}

function updateReview() {
  const item = state.manifest.review[state.reviewIndex];
  $("demoReviewPhoto").src = item.image;
  $("demoReviewPhoto").alt = `Recorded textile frame ${item.frame}`;
  $("demoReviewHeat").src = item.heatmap;
  $("demoReviewHeat").hidden = !state.revealed;
  $("demoReviewRank").textContent = `#${String(item.rank).padStart(2, "0")}`;
  $("demoReviewFrame").textContent = `Frame ${item.frame.toLocaleString()}`;
  $("demoReviewScore").textContent = `Score ${item.score.toFixed(3)}`;
  $("demoCheckCount").textContent = `${state.reviewIndex + Number(state.revealed)} / ${state.manifest.review.length}`;
  const dots = $("demoCheckDots");
  dots.replaceChildren();
  state.manifest.review.forEach((_, index) => {
    const dot = document.createElement("span");
    dot.className = index < state.reviewIndex || index === state.reviewIndex && state.revealed ? "is-done" : index === state.reviewIndex ? "is-current" : "";
    dots.append(dot);
  });
  const outcome = $("demoOutcome");
  outcome.className = "demo-outcome";
  if (state.revealed) {
    const result = state.evaluation.review.find(row => row.frame === item.frame);
    const label = result.ambiguous ? "Uncertain" : result.dataset_label;
    outcome.textContent = label === "Defect" ? "Defect confirmed · exclude from reference" : label === "Normal" ? "Normal confirmed · eligible for trial reference" : "Uncertain · exclude from reference";
    outcome.classList.add(label === "Defect" ? "is-defect" : "is-normal");
    $("demoReveal").textContent = state.reviewIndex === state.manifest.review.length - 1 ? "View update decision →" : "Next photo →";
  } else {
    outcome.textContent = "Result hidden until checked";
    $("demoReveal").textContent = "Check this photo →";
  }
}

function showScene(index) {
  clearTimeout(state.featureTimer);
  state.scene = index;
  state.revealed = false;
  if (index === 3) state.reviewIndex = 0;
  document.querySelectorAll(".demo-stage").forEach((stage, i) => { stage.hidden = i !== index; });
  document.querySelectorAll(".demo-steps button").forEach((button, i) => {
    if (i === index) button.setAttribute("aria-current", "step");
    else button.removeAttribute("aria-current");
  });
  if (index === 3) updateReview();
  $("demoStatus").textContent = ["Patch features", "Visual shift", "Interval scores", "Recorded checks", "Separate validation"][index];
  if (!state.playing) $("demoPlay").textContent = index === 4 ? "Replay recorded run" : "Play recorded run";
  rotateFeatures();
}

function stop() {
  clearTimeout(state.timer);
  clearTimeout(state.featureTimer);
  state.playing = false;
  document.body.classList.remove("is-playing");
  $("demoPlay").textContent = state.scene === 4 ? "Replay recorded run" : "Play recorded run";
}

async function revealReview() {
  if (!state.evaluation) {
    const response = await fetch("./unlabeled-demo/evaluation.json");
    if (!response.ok) throw new Error("Recorded review outcomes could not be loaded.");
    const data = await response.json();
    if (data.run !== state.manifest.run || data.review.length !== state.manifest.review.length) throw new Error("Review outcomes do not match the recorded run.");
    state.evaluation = data;
  }
  state.revealed = true;
  updateReview();
}

async function advance() {
  if (state.scene < 3) showScene(state.scene + 1);
  else if (state.scene === 3) {
    if (!state.revealed) await revealReview();
    else if (state.reviewIndex < state.manifest.review.length - 1) {
      state.reviewIndex++;
      state.revealed = false;
      updateReview();
    } else showScene(4);
  } else showScene(0);
}

function schedule() {
  if (!state.playing) return;
  if (state.scene === 4) { stop(); return; }
  state.timer = setTimeout(async () => {
    try { await advance(); schedule(); }
    catch (error) { stop(); $("demoError").textContent = error.message; $("demoError").hidden = false; }
  }, state.scene === 3 ? state.revealed ? 1100 : 1400 : state.scene === 0 ? 7000 : state.scene === 1 ? 6500 : 7000);
}

async function main() {
  try {
    const responses = await Promise.all(["./unlabeled-demo/manifest.json", "./next-samples/catalog.json", "./ablation/catalog.json"].map(path => fetch(path)));
    if (responses.some(response => !response.ok)) throw new Error("Recorded comparison could not be loaded.");
    const [manifest, nextCatalog, classicCatalog] = await Promise.all(responses.map(response => response.json()));
    if (manifest.run !== "T1_S478_I118_2" || manifest.frame_count !== 2884 || manifest.review.length !== 8) throw new Error("Recorded run data do not match this replay.");
    state.manifest = manifest;
    for (const id of [6, 7, 4]) {
      const sample = nextCatalog.samples.find(item => item.id === id);
      const classic = classicCatalog.find(item => item.id === id);
      if (!sample || !classic || sample.scenario !== classic.scenario || sample.frame !== classic.frame || sample.label !== classic.dataset_label) throw new Error("Paired feature examples do not match.");
      state.featureCases.push({ sample, classic, phase: id === 7 ? "Final" : "Development" });
    }
    renderFeature(0);
    drawChange(manifest.change);
    drawScores(manifest);
    drawQueue(manifest.review);
    showScene(0);
    $("demoPlay").addEventListener("click", () => {
      if (state.playing) { stop(); return; }
      if (state.scene === 4) showScene(0);
      state.playing = true;
      document.body.classList.add("is-playing");
      $("demoPlay").textContent = "Pause replay";
      rotateFeatures();
      schedule();
    });
    $("demoNext").addEventListener("click", async () => { stop(); try { await advance(); } catch (error) { $("demoError").textContent = error.message; $("demoError").hidden = false; } });
    $("demoBack").addEventListener("click", () => {
      stop();
      if (state.scene === 3 && state.reviewIndex > 0) { state.reviewIndex--; state.revealed = false; updateReview(); }
      else showScene(Math.max(0, state.scene - 1));
    });
    $("demoReveal").addEventListener("click", async () => { stop(); try { await advance(); } catch (error) { $("demoError").textContent = error.message; $("demoError").hidden = false; } });
    document.querySelectorAll(".demo-steps button").forEach(button => button.addEventListener("click", () => { stop(); showScene(Number(button.dataset.step)); }));
    document.addEventListener("keydown", event => {
      if (event.target.closest("button,a,input,select,textarea")) return;
      if (event.key === "ArrowRight") $("demoNext").click();
      if (event.key === "ArrowLeft") $("demoBack").click();
    });
  } catch (error) {
    $("demoError").textContent = error.message;
    $("demoError").hidden = false;
    document.querySelectorAll(".demo-controls button,.demo-steps button").forEach(button => { button.disabled = true; });
  }
}

main();
