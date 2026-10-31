"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const read = name => JSON.parse(fs.readFileSync(path.join(root, name), "utf8"));
const site = fs.readFileSync(path.join(root, "web", "landing.html"), "utf8");
const demo = fs.readFileSync(path.join(root, "web", "demo.html"), "utf8");
const final = read("experiments/unsupervised/results/unlabeled_review_final.json");
const feedback = read("experiments/unsupervised/results/feedback_validation_final.json");
const manifest = read("web/unlabeled-demo/manifest.json");
const evaluation = read("web/unlabeled-demo/evaluation.json");
const average = values => values.reduce((sum, value) => sum + value, 0) / values.length;
const percent = value => `${(value * 100).toFixed(1)}%`;

const defectRuns = Object.values(final.runs).filter(run => run.new_defect_episodes > 0);
assert.equal(defectRuns.length, 4);
const handcraftedAP = average(defectRuns.map(run => run.methods.handcrafted_source.average_precision));
const frozenAP = average(defectRuns.map(run => run.methods.source_knn.average_precision));
const wins = defectRuns.filter(run => run.methods.source_knn.average_precision > run.methods.handcrafted_source.average_precision).length;
assert(site.includes(percent(handcraftedAP)) && site.includes(percent(frozenAP)));
assert(site.includes(`leads in ${wins} of ${defectRuns.length} runs`));

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
assert.equal(manifest.change.alert - manifest.change.splice_boundary, 96);
assert.notDeepEqual(manifest.review.map(item => item.frame), feedback.runs[manifest.run].strategies.spaced8.review_frames,
  "The demonstration and the separate update validation use different review queues");

console.log(JSON.stringify({ handcraftedAP: percent(handcraftedAP), frozenAP: percent(frozenAP), wins,
  adjacentCoverage: percent(adjacent), spacedCoverage: percent(spaced), changedRuns,
  feedbackRuns: selected.length, counts, replayFrames: manifest.frame_count, reviewRequests: manifest.review.length }));
