# Change-limit stability check across additional recordings

The 75% DINOv2 MMD alert-limit trial improved detection of known joins between
recordings, but its only long continuity control was the original source run.
This follow-up tests whether lowering the limit creates sustained alerts during
other recorded runs. It is a post-hoc stability check, not a new blind test or
an annotated within-run change benchmark.

## Fixed protocol

- Controls: `T1_S177_I108_1` and `T2_S466_I39_1`. The saved final audit reports
  4,096 frames and zero defect frames for each. They are the two other
  normal-only final recordings with at least 4,096 evaluated frames. Published
  labels choose these negative controls for the *audit*; the detector never
  receives them.
- Encode each run's first 4,096 frames with the same frozen DINOv2-S/14 global
  features and preprocessing as the current change experiment. Validate a
  cached feature array against the archive image names before reuse.
- Fit an independent `DriftDetector` on frames `[0,2048)` of each run, as for
  the original source. Skip `[2048,2112)`. Score the ordered continuation
  `[2112,4096)` with 128-frame windows and 32-frame steps.
- Compare each run's own calibrated limit and **0.75 × that limit**. Require three
  consecutive over-limit windows for an alert. Record thresholds, each window
  score, over-limit counts, longest streak, and first confirmed alert as an
  absolute frame number within its recording. Feature extraction resumes from
  the last flushed batch if interrupted.
- Do not change the 75% factor, run list, calibration length, windowing, or
  confirmation rule after seeing either control's scores. Report both runs.

If the 75% limit adds any confirmed alert in either normal-only continuation,
do not promote it. If it adds none, retain its **trial** status: two additional
recordings with 1,984 continuation frames each still cannot establish a
general field false-alert rate or validate unannounced process changes.

Run `change_stability_controls.py` with the original TSFabrics archive, a
project-local feature-cache directory, and an output path. This check changes
no active site threshold.
