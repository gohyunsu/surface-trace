# Recorded-run presentation

Open [the replay](../web/demo.html) and press **Play replay**. The five
chapters take about 32 seconds in the GIF; the arrow buttons and chapter tabs let a
presenter pause at any result. Use the [interval summary](../web/interval.html)
for a longer inspection demonstration.

| Chapter | What appears | What to say |
| --- | --- | --- |
| Patch features | Three curated paired photos rotate: a changed-run normal where handcrafted falsely alerts, a defect where DINOv2 succeeds, and a defect where DINOv2 misses. The complete handcrafted and DINOv2-plus-selection methods have macro frame AP 66.4%→85.4% over four defect-bearing runs, with the latter ahead on two. | “The combined method ranks frames better on average, but neither method wins every run. Here is a counterexample.” |
| Visual shift | Source frame 3136 appears beside real frames 1, 32, 64, 96, and 192 of `T1_S478_I118_2`. The global-feature trace extends with each frame; three windows cross the limit by frame 96 and the signal remains high at frame 192. The two recordings are joined at a known boundary. | “The image distribution changed. Three consecutive windows confirmed an alert at frame 96. The signal still held after the early defect episode; it does not tell us what caused the shift.” |
| Interval scores | The frozen DINOv2 score trace for 2,884 later frames. Two aligned timelines show the eight highest scores clustering and eight requests spaced by at least 16 frames. Only the spaced queue proceeds to review. | “Both rules request eight photos. Spacing avoids using several checks on neighboring frames.” |
| Eight checks | The first two reviewed photos are recorded defects, so the remaining six open. Each selected photo is marked at its actual position in the run; the outcome appears only after it is checked. Once all eight are checked, the recorded result shows six distinct defect episodes versus five for the unspaced top-eight rule. A separately labeled four-run result then shows 15 versus 26 of 90 new episodes; spacing leads in all four defect runs. | “Two checks come first. Because these reveal defects, we continue to eight. Spacing found one more event in this run. Across four defect runs, it found 26 instead of 15 with the same eight checks per run.” |
| Update decision | A **separate** 15-run, later-frame validation reveals each tradeoff in sequence. Normal alerts fall 1,050→0, then flagged defect frames fall 202→153 and detected new episodes 48→40. The final decision keeps the frozen reference. | “We keep the frozen reference. Fewer false alarms alone are not enough to approve a model update.” |

The first chapter is a curated comparison, drawn from two development runs and
one final run. Its AP caption comes from the four defect-bearing final runs.
Chapters two through four use the same recorded TSFabrics run and the saved
`web/unlabeled-demo/manifest.json` queue. The fifth chapter uses
`experiments/unsupervised/results/feedback_validation_final.json`, a distinct
eight-review protocol across 15 runs. The two review queues must not be
presented as one continuous model update. The first four chapters replay
saved model outputs; they do not run DINOv2 in the browser. The final chapter
uses public labels only for retrospective evaluation.

The scope badge above the stage follows this distinction: three selected runs
for the feature examples, one named run for the change and review sequence,
and a separate 15-run update test for the decision.

## Two-minute live presentation

Use the chapter buttons to pause at the evidence. The 32-second GIF is the
uninterrupted fallback for a slide deck; the site provides the slower live
version. Keep the run scope visible while moving between chapters.

| Time | Screen action | Point to make |
| --- | --- | --- |
| 0:00–0:25 | Open `demo.html`, play the three paired photos, then pause on the counterexample. | The DINOv2-plus-selection method has four-run average frame AP of 85.4% versus 66.4% for the handcrafted method, but misses remain. The paired heatmaps are examples; the AP comes from the four final defect runs. |
| 0:25–0:45 | Select **Visual shift** and let the changed-run photos reach frame 96. | The overall appearance changed across two recordings. Three score windows confirm an alert; this does not identify the physical cause. |
| 0:45–1:05 | Select **Interval scores**. Point to the score trace and the two aligned eight-dot timelines. | Every plotted point is a recorded frame score. The upper row clusters around adjacent frames; the lower row spreads eight checks across the run. No defect labels enter this selection. |
| 1:05–1:35 | Select **Limited review** and reveal the first two outcomes, then advance through the remaining six. | Confirmed defects open the rest of this queue and stay out of the normal reference. After all eight checks, the recorded comparison reveals six distinct episodes versus five for Top 8. |
| 1:35–2:00 | Select **Update decision** and allow its three measures to appear in order. | This is a separate 15-run later-frame test. False alerts disappear, but detected defect frames and episodes fall, so the candidate is held. |

If discussion continues, open `interval.html` to show the actual interval
summary and individual review cards. The review outcomes there remain hidden
until a card is checked. Do not describe the five screens as one continuous
model-training run: the last screen uses a separate fixed-budget experiment.
If asked why reviews are 16 frames apart, open **Spacing sensitivity** in the
landing page's review section. The five equal-budget settings found 15, 24,
25, 26, and 26 of 90 new episodes across the final runs; 12 and 16 frames
also tied on development. This is a robustness check on review scheduling,
not a change to the detector.

The landing page shows the four defect-run results directly. Open **Why spacing
helps** only when explaining the adjacent-frame example.

## Evidence and next model gate

The landing page shows a four-cell reference-choice × review-spacing comparison.
With the selected reference, eight highest-score reviews found 15 of 90 new
defect episodes across four defect-bearing final runs; spacing the same eight
requests by at least 16 frames found 26. The four-cell table distinguishes
this from the all-startup reference comparison. The complete DINOv2-plus-selection
method raised macro frame AP from 66.4% to 85.4% over the handcrafted method, while
leading on only two of four runs. This comparison does not isolate the feature
extractor. These figures come from
`results/unlabeled_review_final.json` and
`results/reference_review_factorial_final.json`, and are checked by
`scripts/audit_site_evidence.js`.

The current update test shows that a candidate can remove false alerts by
suppressing defect signals. Keep it in shadow mode. The next experiment should
lock a rule on development runs, then test it on runs absent from all earlier
method choices. An approval gate needs independent later-frame checks for
normal alerts, defect-frame recall, new-episode recall, and change-alert delay.
None of the current public-data results establish rubber-belt performance.
