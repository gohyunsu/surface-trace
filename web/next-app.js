"use strict";

const $ = id => document.getElementById(id);
const SVG_NS = "http://www.w3.org/2000/svg";
const state = { catalog: null, sample: null, filter: "all", reference: "current" };

function visibleSamples() {
  return state.catalog.samples.filter(sample =>
    state.filter === "all" || sample.label.toLowerCase() === state.filter);
}

function svgNode(name, attributes) {
  const node = document.createElementNS(SVG_NS, name);
  for (const [key, value] of Object.entries(attributes)) node.setAttribute(key, String(value));
  return node;
}

function drawChange(sample) {
  const stream = state.catalog.streams[sample.scenario];
  const chart = $("changeChart");
  chart.replaceChildren();
  const values = stream.change_scores;
  const ends = stream.change_ends;
  const minX = ends[0], maxX = ends[ends.length - 1];
  const maxY = Math.max(...values, stream.change_threshold) * 1.12;
  const x = end => 12 + 396 * (end - minX) / (maxX - minX);
  const y = value => 85 - 70 * value / maxY;
  chart.append(svgNode("line", { x1: 12, y1: y(stream.change_threshold), x2: 408,
    y2: y(stream.change_threshold), class: "change-threshold" }));
  chart.append(svgNode("polyline", {
    points: values.map((value, index) => `${x(ends[index]).toFixed(1)},${y(value).toFixed(1)}`).join(" "),
    class: "change-trace"
  }));
  const index = ends.findIndex(end => end >= sample.frame);
  const markerIndex = index < 0 ? ends.length - 1 : index;
  chart.append(svgNode("line", { x1: x(ends[markerIndex]), y1: 12,
    x2: x(ends[markerIndex]), y2: 88, class: "change-cursor" }));
  chart.append(svgNode("circle", { cx: x(ends[markerIndex]), cy: y(values[markerIndex]),
    r: 5, class: "change-dot" }));
  const alerted = stream.first_alarm !== null && sample.frame >= stream.first_alarm;
  $("changeState").textContent = alerted ? "Change detected" : "No change alert";
  $("changeState").classList.toggle("detected", alerted);
  $("changeNote").textContent = alerted
    ? `First alert at frame ${stream.first_alarm.toLocaleString()}.`
    : "No alert by this frame.";
  chart.setAttribute("aria-label", `Condition-change score for ${stream.title}; ${$("changeState").textContent.toLowerCase()}`);
}

function renderResult() {
  const sample = state.sample;
  const result = sample[state.reference];
  const flagged = result.score >= result.threshold;
  $("frameHeat").src = result.heatmap;
  $("streamScore").textContent = result.score.toFixed(2);
  $("streamStatus").textContent = flagged ? "Review needed" : "Within range";
  $("streamStatus").className = "status " + (flagged ? "review" : "ok");
  $("modelState").textContent = state.reference === "candidate"
    ? "Candidate · held for review" : "Current reference";
  const maximum = Math.max(.72, result.threshold * 1.4);
  $("streamMeterFill").style.width = Math.min(100, result.score / maximum * 100) + "%";
  $("streamThresholdMarker").style.left = result.threshold / maximum * 100 + "%";
  $("streamMeter").classList.toggle("review", flagged);
  $("streamMeter").setAttribute("aria-label",
    `Anomaly score ${result.score.toFixed(2)}; review threshold ${result.threshold.toFixed(2)}`);
  $("streamAssessment").textContent = sample.label === "Defect" && !flagged
    ? "Missed defect in this frame."
    : sample.label === "Normal" && flagged
      ? "False alarm on a labeled normal frame." : "";
  document.querySelectorAll("[data-reference]").forEach(button =>
    button.setAttribute("aria-pressed", button.dataset.reference === state.reference ? "true" : "false"));
}

function renderSamples() {
  const grid = $("streamSamples");
  grid.replaceChildren();
  for (const sample of visibleSamples()) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "stream-sample";
    button.setAttribute("aria-pressed", sample.id === state.sample?.id ? "true" : "false");
    button.setAttribute("aria-label",
      `Sample ${String(sample.id).padStart(2, "0")}, ${sample.label.toLowerCase()}, ${state.catalog.streams[sample.scenario].title}`);
    const image = document.createElement("img");
    image.src = sample.image;
    image.alt = "";
    image.loading = "lazy";
    const info = document.createElement("span");
    info.innerHTML = `<span>SAMPLE ${String(sample.id).padStart(2, "0")}</span><small></small>`;
    info.querySelector("small").textContent = sample.label;
    button.append(image, info);
    button.addEventListener("click", () => selectSample(sample.id));
    grid.append(button);
  }
}

function selectSample(id) {
  const sample = state.catalog.samples.find(item => item.id === id);
  if (!sample) return;
  state.sample = sample;
  $("frameImage").src = sample.image;
  $("frameId").textContent = `Sample ${String(sample.id).padStart(2, "0")}`;
  $("runName").textContent = state.catalog.streams[sample.scenario].title;
  $("frameName").textContent = `Frame ${(sample.frame + 1).toLocaleString()}`;
  $("frameTruth").textContent = `Dataset label: ${sample.label}`;
  const visible = visibleSamples();
  const position = visible.findIndex(item => item.id === id);
  $("framePosition").textContent =
    `${String(position + 1).padStart(2, "0")} / ${String(visible.length).padStart(2, "0")}`;
  $("prevFrame").disabled = position <= 0;
  $("nextFrame").disabled = position >= visible.length - 1;
  renderResult();
  drawChange(sample);
  renderSamples();
  const url = new URL(location.href);
  url.searchParams.set("sample", String(sample.id));
  history.replaceState(null, "", url);
}

function move(delta) {
  const visible = visibleSamples();
  const index = visible.findIndex(item => item.id === state.sample?.id);
  if (visible[index + delta]) selectSample(visible[index + delta].id);
}

$("streamOpacity").addEventListener("input", event => {
  $("frameHeat").style.opacity = event.target.value / 100;
});
$("prevFrame").addEventListener("click", () => move(-1));
$("nextFrame").addEventListener("click", () => move(1));
document.querySelectorAll("[data-reference]").forEach(button =>
  button.addEventListener("click", () => {
    state.reference = button.dataset.reference;
    if (state.sample) renderResult();
  }));
document.querySelectorAll("[data-stream-filter]").forEach(button =>
  button.addEventListener("click", () => {
    state.filter = button.dataset.streamFilter;
    document.querySelectorAll("[data-stream-filter]").forEach(item =>
      item.setAttribute("aria-pressed", item === button ? "true" : "false"));
    selectSample(visibleSamples()[0].id);
  }));

fetch("./next-samples/catalog.json")
  .then(response => {
    if (!response.ok) throw new Error("Sample catalog unavailable");
    return response.json();
  })
  .then(catalog => {
    state.catalog = catalog;
    const requested = Number(new URLSearchParams(location.search).get("sample")) || 7;
    selectSample(catalog.samples.some(sample => sample.id === requested) ? requested : catalog.samples[0].id);
  })
  .catch(() => {
    $("streamStatus").textContent = "Samples unavailable";
    $("streamAssessment").textContent = "Reload this page to try again.";
  });
