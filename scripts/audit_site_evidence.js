"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const read = name => JSON.parse(fs.readFileSync(path.join(root, name), "utf8"));
// The earlier Python experiment contains bare NaN values in unrelated recall fields.
const readEarlier = name => JSON.parse(fs.readFileSync(path.join(root, name), "utf8").replace(/\bNaN\b|-?\bInfinity\b/g, "null"));
const site = fs.readFileSync(path.join(root, "web", "landing.html"), "utf8");
const demo = fs.readFileSync(path.join(root, "web", "demo.html"), "utf8");
const demoScript = fs.readFileSync(path.join(root, "web", "demo.js"), "utf8");
const galleryScript = fs.readFileSync(path.join(root, "web", "ablation.js"), "utf8");
const inspector = fs.readFileSync(path.join(root, "web", "next-inspector.html"), "utf8");
const final = read("experiments/unsupervised/results/unlabeled_review_final.json");
const referenceFinal = read("experiments/unsupervised/results/reference_selection_final_verified.json");
const factorialFinal = read("experiments/unsupervised/results/reference_review_factorial_final.json");
const fullContinuation = read("experiments/unsupervised/results/source_continuation_full.json");
const earlier = readEarlier("experiments/unsupervised/results/tsfabrics.json");
const feedback = read("experiments/unsupervised/results/feedback_validation_final.json");
const siteCatalog = read("web/next-samples/catalog.json");
const classicCatalog = read("web/ablation/catalog.json");
const manifest = read("web/unlabeled-demo/manifest.json");
const evaluation = read("web/unlabeled-demo/evaluation.json");
const sequentialDevelopment = read("experiments/unsupervised/results/sequential_review_development.json");
const sequentialFinal = read("experiments/unsupervised/results/sequential_review_final.json");
const routing = read("web/ablation/review-routing.json");
const scenarioFrames = read("web/scenario/manifest.json");
const changeFigure = read("web/ablation/change-figure.json");
const development = read("experiments/unsupervised/results/unlabeled_review_development.json");
const average = values => values.reduce((sum, value) => sum + value, 0) / values.length;
const percent = value => `${(value * 100).toFixed(1)}%`;

const defectRuns = Object.values(final.runs).filter(run => run.new_defect_episodes > 0);
assert.equal(defectRuns.length, 4);
const handcraftedAP = average(defectRuns.map(run => run.methods.handcrafted_source.average_precision));
const frozenAP = average(defectRuns.map(run => run.methods.source_knn.average_precision));
const wins = defectRuns.filter(run => run.methods.source_knn.average_precision > run.methods.handcrafted_source.average_precision).length;
assert(site.includes(percent(handcraftedAP)) && site.includes(percent(frozenAP)));
assert(site.includes(`leads in ${wins} of ${defectRuns.length} runs`));
assert(site.includes("4 FINAL DEFECT RUNS") && demo.includes("four final defect runs"));
const apRows = [...site.matchAll(/class="run-ap-row" data-run="([^"]+)" style="--classic:([\d.]+)%;--dino:([\d.]+)%"/g)];
assert.equal(apRows.length, defectRuns.length);
for (const [, name, classic, dino] of apRows) {
  const run = final.runs[name];
  assert(run && run.new_defect_episodes > 0, `Unexpected AP chart run: ${name}`);
  assert.equal(classic, (run.methods.handcrafted_source.average_precision * 100).toFixed(1));
  assert.equal(dino, (run.methods.source_knn.average_precision * 100).toFixed(1));
  const rowStart = site.indexOf(`class="run-ap-row" data-run="${name}"`);
  const rowEnd = site.indexOf('class="run-ap-row"', rowStart + 1);
  const row = site.slice(rowStart, rowEnd < 0 ? undefined : rowEnd);
  assert(row.includes(`<strong>${classic} <small>/</small> ${dino}</strong>`));
}
assert.equal(new Set(apRows.map(row => row[1])).size, defectRuns.length);
assert.equal(siteCatalog.source, final.protocol.source);
assert.equal(siteCatalog.source, earlier.protocol.source);
const featuredMatch = galleryScript.match(/const featured = \[([^\]]+)\]/);
assert(featuredMatch, "Paired gallery has no featured-frame list");
const featured = featuredMatch[1].split(",").map(value => Number(value.trim()));
assert.equal(featured.length, 16);
assert.equal(new Set(featured).size, featured.length);
assert.equal(new Set(siteCatalog.samples.map(item => item.id)).size, siteCatalog.samples.length);
assert.equal(new Set(classicCatalog.map(item => item.id)).size, classicCatalog.length);
assert.equal(siteCatalog.samples.length, classicCatalog.length);
const illustrated = featured.map(id => {
  const sample = siteCatalog.samples.find(item => item.id === id);
  const classic = classicCatalog.find(item => item.id === id);
  assert(sample && classic, `Missing paired gallery case ${id}`);
  assert.equal(sample.scenario, classic.scenario);
  assert.equal(sample.frame, classic.frame);
  assert.equal(sample.label, classic.dataset_label);
  assert(siteCatalog.streams[sample.scenario]?.title, `Missing stream title for case ${id}`);
  assert.equal(sample.current.threshold, earlier.methods.mutual.threshold);
  assert.equal(classic.threshold, earlier.methods.classic_8_feature.threshold);
  assert.equal(classic.alert, classic.score >= classic.threshold);
  for (const asset of [sample.image, sample.current.heatmap, `./ablation/${classic.overlay}`]) {
    assert(asset.startsWith("./"), `Unexpected asset path for case ${id}: ${asset}`);
    assert(fs.existsSync(path.join(root, "web", asset.slice(2))), `Missing gallery asset: ${asset}`);
  }
  return sample;
});
assert.deepEqual(illustrated.slice(0, 3).map(sample => final.protocol.targets.includes(sample.scenario)), [false, true, false]);
const verdicts = new Set(illustrated.map(sample => {
  const classic = classicCatalog.find(item => item.id === sample.id);
  return `${sample.label}:${classic.alert}:${sample.current.score >= sample.current.threshold}`;
}));
assert.equal(verdicts.size, 8, "Gallery no longer shows every normal/defect outcome pair");
assert(demo.includes('id="demoScope">THREE RUNS · EXAMPLES'));
assert(demoScript.includes('15 RUNS · UPDATE TEST'));
const normalShift = "T1_S164_I36_1";
const selectedSource = earlier.methods.mutual.targets[normalShift].frozen;
const allSource = earlier.methods.all_unlabeled.targets[normalShift].frozen;
const selectedHoldout = earlier.methods.mutual.source_heldout;
const allHoldout = earlier.methods.all_unlabeled.source_heldout;
assert.equal(selectedSource.fp + selectedSource.tn, 975);
assert.equal(allSource.fp + allSource.tn, 975);
assert.equal(selectedSource.fp, 11);
assert.equal(allSource.fp, 971);
assert.equal(selectedHoldout.fp, 20);
assert.equal(allHoldout.fp, 7);
assert.equal(selectedHoldout.fp + selectedHoldout.tn, 1984);
assert.equal(allHoldout.fp + allHoldout.tn, 1984);
const referencePanel = site.match(/<article class="improvement improvement-adaptation"[\s\S]*?<\/article>/)?.[0];
assert(referencePanel?.includes("REFERENCE × REVIEW RULE · 16 RECORDED RUNS"));
assert(referencePanel.includes("sample-06-all.png"));
assert(referencePanel.includes("sample-06-current.png"));
assert(!referencePanel.includes("sample-06-candidate.png"));
assert(referencePanel.includes("DEVELOPMENT EXAMPLE · ONE NORMAL PHOTO"));
assert.deepEqual(referenceFinal.protocol.targets, final.protocol.targets);
assert.equal(referenceFinal.protocol.equal_bank_vectors, referenceFinal.source.bank_vectors);
const referenceRuns = Object.values(referenceFinal.runs);
assert.equal(referenceRuns.length, 16);
const referenceDefectRuns = referenceRuns.filter(run => run.methods.selected.defect_frames > 0);
const referenceAP = method => average(referenceDefectRuns.map(run => run.methods[method].average_precision));
const selectedAP = referenceAP("selected"), allAP = referenceAP("all");
const referenceWins = referenceDefectRuns.filter(run => run.methods.selected.average_precision > run.methods.all.average_precision).length;
const referenceSum = (method, field) => referenceRuns.reduce((value, run) => value + run.methods[method][field], 0);
const referenceCounts = {
  normal: referenceSum("selected", "normal_frames"), defect: referenceSum("selected", "defect_frames"),
  allFP: referenceSum("all", "fp"), selectedFP: referenceSum("selected", "fp"),
  allTP: referenceSum("all", "tp"), selectedTP: referenceSum("selected", "tp"),
  allReviews: referenceSum("all", "review_episodes"), selectedReviews: referenceSum("selected", "review_episodes"),
  episodes: referenceSum("selected", "new_episodes"),
};
assert.deepEqual(referenceCounts, { normal: 26088, defect: 883, allFP: 19153, selectedFP: 1449,
  allTP: 851, selectedTP: 313, allReviews: 19, selectedReviews: 26, episodes: 90 });
assert.equal(referenceWins, 1);
assert.equal(referenceRuns.filter(run => run.methods.selected.fp < run.methods.all.fp).length, 15);
assert.equal(percent(allAP), "70.3%");
assert.equal(percent(selectedAP), "85.4%");
assert.deepEqual(factorialFinal.protocol.targets, referenceFinal.protocol.targets);
const factorialRuns = Object.values(factorialFinal.runs);
assert.equal(factorialRuns.length, 16);
for (const reference of ["all", "selected"]) for (const queue of ["top8", "spaced8"]) {
  const count = factorialRuns.reduce((total, run) => total + run.methods[reference][queue].new_episodes, 0);
  assert(referencePanel.includes(`data-reference="${reference}" data-queue="${queue}">${count}</td>`));
}
for (const [metric, before, after, population] of [
  ["normal", referenceCounts.allFP, referenceCounts.selectedFP, `${referenceCounts.normal.toLocaleString("en-US")} normal frames`],
  ["defect", referenceCounts.allTP, referenceCounts.selectedTP, `${referenceCounts.defect} defect frames`],
]) {
  const start = referencePanel.indexOf(`class="reference-audit-row" data-metric="${metric}"`);
  assert(start >= 0, `Missing source-reference audit row: ${metric}`);
  const row = referencePanel.slice(start, referencePanel.indexOf("</small></div>", start) + 14);
  assert(row.includes(`${before.toLocaleString("en-US")} <i>→</i> ${after.toLocaleString("en-US")}`));
  assert(row.includes(`/ ${population}`));
  const widths = [...row.matchAll(/style="width:([\d.]+)%"/g)].map(match => Number(match[1]));
  assert.equal(widths.length, 2);
  assert(Math.abs(widths[0] - before / Math.max(before, after) * 100) < .06);
  assert(Math.abs(widths[1] - after / Math.max(before, after) * 100) < .06);
}
assert(referencePanel.includes("REFERENCE_SELECTION_RESULTS_VERIFIED.md"));
assert(inspector.includes("Frozen DINOv2") && inspector.includes("Run-local trial"));
assert(!inspector.includes("trial update on the same photo"));

const coverage = queue => average(defectRuns.map(run => run.methods.source_knn.queues[queue].new_episodes / run.new_defect_episodes));
const adjacent = coverage("top8"), spaced = coverage("spaced8");
assert.equal(percent(adjacent), "41.8%");
assert.equal(percent(spaced), "71.1%");
assert(spaced > adjacent);
const topEpisodes = defectRuns.reduce((total, run) => total + run.methods.source_knn.queues.top8.new_episodes, 0);
const spacedEpisodes = defectRuns.reduce((total, run) => total + run.methods.source_knn.queues.spaced8.new_episodes, 0);
assert(site.includes(`<small>Top 8</small><strong>${topEpisodes}</strong><i aria-hidden="true">→</i><small>Spaced 8</small><strong>${spacedEpisodes}</strong>`));
assert(site.includes(`of ${referenceCounts.episodes} episodes · same scores and eight checks per run`));
const coverageRows = [...site.matchAll(/class="review-coverage-row" data-run="([^"]+)" style="--top:([\d.]+)%;--spaced:([\d.]+)%"/g)];
assert.equal(coverageRows.length, defectRuns.length);
for (const [, name, topWidth, spacedWidth] of coverageRows) {
  const run = final.runs[name];
  assert(run && run.new_defect_episodes > 0, `Unexpected review chart run: ${name}`);
  const topCount = run.methods.source_knn.queues.top8.new_episodes;
  const spacedCount = run.methods.source_knn.queues.spaced8.new_episodes;
  assert(Math.abs(Number(topWidth) - topCount / run.new_defect_episodes * 100) < .06);
  assert(Math.abs(Number(spacedWidth) - spacedCount / run.new_defect_episodes * 100) < .06);
  const rowStart = site.indexOf(`class="review-coverage-row" data-run="${name}"`);
  const rowEnd = site.indexOf('class="review-coverage-row"', rowStart + 1);
  const row = site.slice(rowStart, rowEnd < 0 ? undefined : rowEnd);
  assert(row.includes(`${run.new_defect_episodes} episodes`));
  assert(row.includes(`<strong>${topCount} <small>→</small> ${spacedCount}</strong>`));
}
assert.equal(new Set(coverageRows.map(row => row[1])).size, defectRuns.length);
assert(defectRuns.every(run => run.methods.source_knn.queues.spaced8.new_episodes > run.methods.source_knn.queues.top8.new_episodes));
const changedRuns = Object.values(final.runs).filter(run => run.operational_summary.change_alert != null).length;
assert.equal(changedRuns, 15);
assert(site.includes(`${changedRuns} / ${Object.keys(final.runs).length}`));
assert.equal(final.protocol.source_continuation_alarm, null);
assert.equal(fullContinuation.source, final.protocol.source);
assert.deepEqual(fullContinuation.prior_test_frames, final.protocol.source_continuation);
assert.equal(fullContinuation.test_frames[0], fullContinuation.prior_test_frames[0]);
assert.equal(fullContinuation.test_frames[1], fullContinuation.source_frames);
assert.equal(fullContinuation.window_scores.length, fullContinuation.window_count);
assert.equal(fullContinuation.window_end_frames.length, fullContinuation.window_count);
assert(fullContinuation.window_end_frames.every((end, i, ends) => i === 0 || end - ends[i - 1] === 32));
assert.equal(fullContinuation.windows_above_limit,
  fullContinuation.window_scores.filter(score => score > fullContinuation.threshold).length);
assert.equal(fullContinuation.windows_above_limit, 0);
assert.equal(fullContinuation.first_confirmed_alert_frame, null);
const sourceLaterFrames = fullContinuation.test_frames[1] - fullContinuation.test_frames[0];
assert(site.includes(`No alert across ${sourceLaterFrames.toLocaleString("en-US")} later frames of the same reference recording.`));
assert(site.includes("/SOURCE_CONTINUATION_FULL_RESULTS.md"));

const selected = Object.values(feedback.runs).filter(run => run.status === "evaluated");
assert.equal(selected.length, 15);
const sum = (method, field) => selected.reduce((value, run) => value + method(run)[field], 0);
const frozen = run => run.source;
const candidate = run => run.strategies.spaced8.candidate;
const counts = {
  normal: sum(frozen, "normal_frames"), defect: sum(frozen, "defect_frames"),
  frozenFP: sum(frozen, "fp"), candidateFP: sum(candidate, "fp"),
  frozenTP: sum(frozen, "tp"), candidateTP: sum(candidate, "tp"),
  frozenEpisodes: sum(frozen, "detected_episodes"), candidateEpisodes: sum(candidate, "detected_episodes"),
};
assert.deepEqual(counts, { normal: 20273, defect: 642, frozenFP: 1050, candidateFP: 0,
  frozenTP: 202, candidateTP: 153, frozenEpisodes: 48, candidateEpisodes: 40 });
for (const [before, after] of [[counts.frozenFP, counts.candidateFP], [counts.frozenTP, counts.candidateTP], [counts.frozenEpisodes, counts.candidateEpisodes]]) {
  const change = `${before.toLocaleString("en-US")} <em>→</em> ${after.toLocaleString("en-US")}`;
  assert(demo.includes(change), `Demo missing validated pair: ${change}`);
  const phaseValue = `${before.toLocaleString("en-US")} → ${after.toLocaleString("en-US")}`;
  assert(demoScript.includes(phaseValue), `Demo reveal missing validated pair: ${phaseValue}`);
}
const decisionRows = [...site.matchAll(/<div class="decision-metric"><div><span>([^<]+)<\/span><strong>([\s\S]*?)<\/strong><\/div><div class="decision-pair"[^>]*><span><i style="width:100%"><\/i><\/span><span><i style="width:([\d.]+)%"><\/i><\/span><\/div><\/div>/g)];
assert.equal(decisionRows.length, 3);
for (const [label, before, after] of [
  ["Normal-frame alerts", counts.frozenFP, counts.candidateFP],
  ["Defect frames flagged", counts.frozenTP, counts.candidateTP],
  ["New defect episodes found", counts.frozenEpisodes, counts.candidateEpisodes],
]) {
  const row = decisionRows.find(([, rowLabel]) => rowLabel === label);
  assert(row, `Missing landing comparison: ${label}`);
  assert.equal(row[2], `${before.toLocaleString("en-US")} <i>→</i> ${after.toLocaleString("en-US")}`);
  assert(Math.abs(Number(row[3]) - after / before * 100) < .06, `Incorrect comparison bar: ${label}`);
}
assert(site.includes(`Same later frames · ${counts.normal.toLocaleString("en-US")} normal · ${counts.defect} defect`));

assert.equal(manifest.run, "T1_S478_I118_2");
assert.equal(manifest.frame_count, manifest.scores.length);
assert.deepEqual(manifest.evaluation_frames,
  [final.protocol.target_evaluation_start + 1, Math.min(final.protocol.target_cap, final.runs[manifest.run].frames)]);
assert.equal(manifest.evaluation_frames[1] - manifest.evaluation_frames[0] + 1, manifest.frame_count);
const orderedScores = [...manifest.scores].sort((a, b) => a - b);
const quantile = q => {
  const position = (orderedScores.length - 1) * q;
  const low = Math.floor(position), high = Math.ceil(position);
  return orderedScores[low] + (orderedScores[high] - orderedScores[low]) * (position - low);
};
const expectedQuantiles = final.runs[manifest.run].methods.source_knn.score_quantiles;
for (const [index, key] of ["p50", "p90", "p99"].entries()) {
  assert(Math.abs(quantile([0.5, 0.9, 0.99][index]) - expectedQuantiles[index]) < 2e-6,
    `Replay ${key} differs from the saved evaluation`);
  assert(Math.abs(manifest.score_quantiles[key] - expectedQuantiles[index]) < 2e-6,
    `Displayed replay ${key} differs from the saved evaluation`);
}
assert.equal(manifest.scores.filter(score => score >= earlier.methods.mutual.threshold).length,
  final.runs[manifest.run].methods.source_knn.source_threshold_exceedances);
assert.deepEqual(manifest.review.map(item => item.frame), final.runs[manifest.run].methods.source_knn.queues.spaced8.frames);
assert.deepEqual(evaluation.review.map(item => item.frame), manifest.review.map(item => item.frame));
assert(manifest.review.slice(0, 2).every(item => {
  const outcome = evaluation.review.find(row => row.frame === item.frame);
  return outcome && !outcome.ambiguous && outcome.dataset_label === "Defect";
}));
assert(demoScript.includes("Defect found in first two · six more checks opened"));
const timelines = [...site.matchAll(/class="review-timeline-track is-(top|spaced)" data-queue="(top8|spaced8)"[^>]*>(.*?)<\/div>/gs)];
assert.equal(timelines.length, 2, "Landing page needs both review timelines");
const [firstFrame, lastFrame] = manifest.evaluation_frames;
for (const [, style, queue, markup] of timelines) {
  assert.equal(style === "top" ? "top8" : "spaced8", queue);
  const markers = [...markup.matchAll(/data-frame="(\d+)" style="left:([\d.]+)%/g)];
  const expectedFrames = final.runs[manifest.run].methods.source_knn.queues[queue].frames.slice().sort((a, b) => a - b);
  assert.deepEqual(markers.map(match => Number(match[1])), expectedFrames);
  const expectedPositions = expectedFrames.map(frame =>
    Math.round((frame - firstFrame) / (lastFrame - firstFrame) * 1000) / 10);
  assert.deepEqual(markers.map(match => Number(match[2])), expectedPositions);
  const discovered = final.runs[manifest.run].methods.source_knn.queues[queue].new_episodes;
  assert(site.includes(`</div><strong>${discovered} found</strong></div>`));
}
assert.equal(manifest.change.alert - manifest.change.splice_boundary, 96);
const sceneFrame = (file, run, frame, label = "Normal") => {
  const entry = scenarioFrames.find(item => item.file === file);
  assert(entry, `Missing scenario provenance: ${file}`);
  assert.equal(entry.scenario, run);
  assert.equal(entry.display_frame, frame);
  assert.equal(entry.dataset_label, label);
  assert(fs.existsSync(path.join(root, "web", "scenario", file)));
};
const chartEnd = changeFigure.source_holdout_start + changeFigure.source_holdout.ends.at(-1);
sceneFrame(`source-${chartEnd - 1}.jpg`, changeFigure.source, chartEnd - 1);
sceneFrame(`source-${chartEnd}.jpg`, changeFigure.source, chartEnd);
assert(site.includes(`scenario/source-${chartEnd - 1}.jpg`));
assert(site.includes(`scenario/source-${chartEnd}.jpg`));
const spliceSourceEnd = final.protocol.source_continuation[0] + manifest.change.splice_boundary;
sceneFrame(`source-${spliceSourceEnd}.jpg`, manifest.source, spliceSourceEnd);
for (const [frame, label] of [[1, "Normal"], [32, "Defect"], [64, "Normal"], [96, "Normal"], [192, "Normal"]]) {
  sceneFrame(`demo-${String(frame).padStart(3, "0")}.jpg`, manifest.run, frame, label);
}
const shiftFrames = demoScript.match(/const shiftFrames = \[([^\]]+)\]/)?.[1].split(",").map(Number);
assert.deepEqual(shiftFrames, [1, 32, 64, 96, 192]);
for (const frame of [32, 64, 96, 192]) {
  const end = manifest.change.splice_boundary + frame;
  assert(manifest.change.window_scores[manifest.change.window_ends.indexOf(end)] > manifest.change.limit);
}
assert(demo.includes(`scenario/source-${spliceSourceEnd}.jpg`));
assert(demo.includes("scenario/demo-001.jpg"));
assert.equal(changeFigure.target_start.first_alarm, 192);
assert(Object.hasOwn(development.runs, changeFigure.target));
assert(!Object.hasOwn(final.runs, changeFigure.target));
assert(site.includes("16 FINAL RUNS · KNOWN SWITCH"));
assert(site.includes("Development example · alert at new-run frame 192."));
sceneFrame("target-192.jpg", changeFigure.target, changeFigure.target_start.first_alarm);
assert.notDeepEqual(manifest.review.map(item => item.frame), feedback.runs[manifest.run].strategies.spaced8.review_frames,
  "The demonstration and the separate update validation use different review queues");

for (const phase of [sequentialDevelopment, sequentialFinal]) {
  const fixed = phase.summary.methods.fixed8, pilot = phase.summary.methods.pilot2;
  assert.equal(pilot.episodes_found, fixed.episodes_found);
  assert.equal(pilot.runs_losing_episodes.length, 0);
  assert(pilot.requests < fixed.requests);
  assert(pilot.normal_reviews < fixed.normal_reviews);
  for (const run of Object.values(phase.runs)) {
    assert.deepEqual(run.pilot2.frames, run.fixed8.frames.slice(0, run.pilot2.requests));
    assert(run.pilot2.requests === 2 || run.pilot2.requests === 8);
  }
}
assert.equal(sequentialFinal.summary.methods.fixed8.requests, 128);
assert.equal(sequentialFinal.summary.methods.pilot2.requests, 56);
assert.deepEqual(routing.runs, Object.entries(sequentialFinal.runs)
  .map(([run, result]) => ({ run, requests: result.pilot2.requests })));
assert.equal(routing.runs.filter(run => run.requests === 2).length, 12);
assert.equal(routing.runs.filter(run => run.requests === 8).length, 4);
assert(site.includes("<strong>128</strong>") && site.includes("<strong>56</strong>"));
assert(site.includes("12 stopped at 2") && site.includes("4 continued to 8"));
assert(site.includes("26 / 90 in both"));

console.log(JSON.stringify({ handcraftedAP: percent(handcraftedAP), frozenAP: percent(frozenAP), wins,
  referenceCounts, referenceAP: [percent(allAP), percent(selectedAP)], referenceWins,
  adjacentCoverage: percent(adjacent), spacedCoverage: percent(spaced), changedRuns,
  feedbackRuns: selected.length, counts, replayFrames: manifest.frame_count, reviewRequests: manifest.review.length,
  sequentialRequests: [sequentialFinal.summary.methods.fixed8.requests, sequentialFinal.summary.methods.pilot2.requests] }));
