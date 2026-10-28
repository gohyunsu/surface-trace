# Paired TSFabrics heatmaps

The three transparent `sample-XX-classic.png` overlays come from the
handcrafted eight-feature pipeline re-run on the same held-out TSFabrics frames
used by the change-aware sample explorer. Their scores, source-calibrated
threshold, and frame identities are recorded in `catalog.json`. The DINOv2
selected-reference overlays are the matching `web/next-samples/*-current.png`
files. Both sets use the same rendering rule relative to each method's own
threshold; their raw scores have different units.

`sample-06-all.png` is the frozen DINOv2 pipeline using all startup frames at
the same reference-bank capacity as the selected-reference method. It shows
the same normal frame as the three-step false-alarm chart. Its score, threshold,
and result are recorded under `all_unlabeled` in `catalog.json`.

The cases shown on the site are a changed normal frame cleared by the selected
reference, a large-shift defect flagged only by the selected reference, and a
related-run defect flagged only by the handcrafted method. They were selected
from the existing 12 public-site sample frames and show both gains and misses.

Regenerate the handcrafted overlays with
`experiments/unsupervised/export_ablation_comparison.py` on the experiment
machine, after the TSFabrics feature cache and site sample export are present.
The source images are TSFabrics (CC BY 4.0); retain the dataset credit in the
site footer.
