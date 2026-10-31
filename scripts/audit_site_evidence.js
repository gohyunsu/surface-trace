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
const inspector = fs.readFileSync(path.join(root, "web", "next-inspector.html"), "utf8");
const final = read("experiments/unsupervised/results/unlabeled_review_final.json");
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
assert.equal(siteCatalog.source, final.protocol.source);
assert.equal(siteCatalog.source, earlier.protocol.source);
const illustrated = [6, 7, 4].map(id => {
  const sample = siteCatalog.samples.find(item => item.id === id);
  const classic = classicCatalog.find(item => item.id === id);
  assert(sample && classic && sample.scenario === classic.scenario && sample.frame === classic.frame);
  assert.equal(sample.current.threshold, earlier.methods.mutual.threshold);
  assert.equal(classic.threshold, earlier.methods.classic_8_feature.threshold);
  assert.equal(classic.alert, classic.score >= classic.threshold);
  return sample;
});
assert.deepEqual(illustrated.map(sample => final.protocol.targets.includes(sample.scenario)), [false, true, false]);
assert(demo.includes("Feature examples span runs"));
const normalShift = "T1_S164_I36_1";
const selectedSource = earlier.methods.mutual.targets[normalShift].frozen;
const allSource = earlier.methods.all_unlabeled.targets[normalShift].frozen;
assert.equal(selectedSource.fp + selectedSource.tn, 975);
assert.equal(allSource.fp + allSource.tn, 975);
assert.equal(selectedSource.fp, 11);
assert.equal(allSource.fp, 971);
const referencePanel = site.match(/<article class="improvement improvement-adaptation"[\s\S]*?<\/article>/)?.[0];
assert(referencePanel?.includes("SOURCE REFERENCE SELECTION"));
assert(referencePanel.includes("sample-06-all.png"));
assert(referencePanel.includes("sample-06-current.png"));
assert(!referencePanel.includes("sample-06-candidate.png"));
assert(inspector.includes("Frozen DINOv2") && inspector.includes("Run-local trial"));
assert(!inspector.includes("trial update on the same photo"));

const coverage = queue => average(defectRuns.map(run => run.methods.source_knn.queues[queue].new_episodes / run.new_defect_episodes));
const adjacent = coverage("top8"), spaced = coverage("spaced8");
assert(site.includes(percent(adjacent)) && site.includes(percent(spaced)));
assert(spaced > adjacent);
const changedRuns = Object.values(final.runs).filter(run => run.operational_summary.change_alert != null).length;
assert.equal(changedRuns, 15);
assert(site.includes(`${changedRuns} / ${Object.keys(final.runs).length}`));

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
}

assert.equal(manifest.run, "T1_S478_I118_2");
assert.equal(manifest.frame_count, manifest.scores.length);
assert.deepEqual(manifest.review.map(item => item.frame), final.runs[manifest.run].methods.source_knn.queues.spaced8.frames);
assert.deepEqual(evaluation.review.map(item => item.frame), manifest.review.map(item => item.frame));
const timeline = site.match(/class="review-timeline-track"[^>]*>(.*?)<\/div>/s)?.[1];
assert(timeline, "Landing page is missing the review timeline");
const timelinePositions = [...timeline.matchAll(/left:([\d.]+)%/g)].map(match => Number(match[1]));
const [firstFrame, lastFrame] = manifest.evaluation_frames;
const expectedPositions = manifest.review.map(item => item.frame).sort((a, b) => a - b)
  .map(frame => Math.round((frame - firstFrame) / (lastFrame - firstFrame) * 1000) / 10);
assert.deepEqual(timelinePositions, expectedPositions);
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
  adjacentCoverage: percent(adjacent), spacedCoverage: percent(spaced), changedRuns,
  feedbackRuns: selected.length, counts, replayFrames: manifest.frame_count, reviewRequests: manifest.review.length,
  sequentialRequests: [sequentialFinal.summary.methods.fixed8.requests, sequentialFinal.summary.methods.pilot2.requests] }));
