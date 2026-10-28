# Recorded production-frame examples

These 12 TSFabrics test frames were selected to show correct detections, missed
defects, false alarms, and normal cases. Selection used the public labels for
illustration only. The operational reference, thresholds, change detector, and
candidate reference were built without defect labels. The page replays saved
DINOv2 model outputs; it does not run that model in the browser.

The page groups examples by production run, not by capture time. “Current” uses
the fixed source-run reference and threshold; “Candidate” uses a new reference
and threshold from earlier frames of the selected test run. The candidate is
shown for comparison and is not adopted automatically.
The catalog stores zero-based frame indices; visible frame numbers add one.

Source: Ni et al., *TSFabrics*, Scientific Data (2026),
https://doi.org/10.1038/s41597-026-06748-9; dataset
https://doi.org/10.6084/m9.figshare.29573381 (CC BY 4.0). The photos were
resized/compressed, and the transparent red overlays were generated from model
patch scores. See `experiments/unsupervised/export_site_samples.py` for the
selection and export procedure.
