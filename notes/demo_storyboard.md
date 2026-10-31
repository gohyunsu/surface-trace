# Recorded-run presentation

Open [the replay](../web/demo.html) and press **Play recorded run**. The five
chapters take about 29 seconds in the GIF; the arrow buttons and chapter tabs let a
presenter pause at any result. Use the [interval summary](../web/interval.html)
for a longer inspection demonstration.

| Chapter | What appears | What to say |
| --- | --- | --- |
| Patch features | Three curated paired photos rotate: a changed-run normal where handcrafted falsely alerts, a defect where DINOv2 succeeds, and a defect where DINOv2 misses. The macro frame AP is 66.4%→85.4% over four defect-bearing runs, with DINOv2 ahead on two. | “The foundation features improve average ranking, but neither method wins every run. Here is a counterexample.” |
| Visual shift | A source-run photo, a later photo from `T1_S478_I118_2`, and the recorded global-feature trace. The source and target recordings are joined at the experimental boundary. | “The appearance changed. The signal held above its limit, so the first alert was confirmed 96 frames into the new run.” |
| Interval scores | The frozen DINOv2 score trace for 2,884 later frames and eight ranked, 16-frame-spaced candidates. | “We start with two photos. A defect or uncertain result opens the rest of the queue.” |
| Eight checks | This run's first photo is a defect, so review continues to eight. Each recorded outcome appears only after its photo is checked. | “The outcome becomes available after review; confirmed defects never enter the normal reference.” |
| Update decision | A **separate** 15-run, later-frame validation compares the frozen reference with a trial reference built from reviewed normals. Normal alerts fall 1,050→0, while flagged defect frames fall 202→153 and detected new episodes 48→40. | “We keep the frozen reference. Fewer false alarms alone are not enough to approve a model update.” |

The first chapter is a curated comparison, drawn from three TSFabrics runs.
Chapters two through four use the same recorded TSFabrics run and the saved
`web/unlabeled-demo/manifest.json` queue. The fifth chapter uses
`experiments/unsupervised/results/feedback_validation_final.json`, a distinct
eight-review protocol across 15 runs. The two review queues must not be
presented as one continuous model update. The first four chapters replay
saved model outputs; they do not run DINOv2 in the browser. The final chapter
uses public labels only for retrospective evaluation.

## Evidence and next model gate

The landing page uses one-factor comparisons where possible. For the active
frozen DINOv2 scorer, eight adjacent top-score reviews found 41.8% of new
defect episodes on average across four defect-bearing final runs; adding the
16-frame spacing rule found 71.1% with the same scorer and budget. DINOv2
raised macro frame AP from 66.4% to 85.4% over handcrafted features, while
leading on only two of four runs. These figures come from
`results/unlabeled_review_final.json` and are checked by
`scripts/audit_site_evidence.js`.

The current update test shows that a candidate can remove false alerts by
suppressing defect signals. Keep it in shadow mode. The next experiment should
lock a rule on development runs, then test it on runs absent from all earlier
method choices. An approval gate needs independent later-frame checks for
normal alerts, defect-frame recall, new-episode recall, and change-alert delay.
None of the current public-data results establish rubber-belt performance.
