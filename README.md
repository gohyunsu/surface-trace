# SurfaceTrace

[Live site](https://gohyunsu.github.io/surface-trace/) · [Baseline samples](https://gohyunsu.github.io/surface-trace/inspect.html) · [Change-aware samples](https://gohyunsu.github.io/surface-trace/next-inspect.html) · [Interval summary](https://gohyunsu.github.io/surface-trace/interval.html) · [Earlier review study](https://gohyunsu.github.io/surface-trace/review.html)

SurfaceTrace is an industrial image-review research project by ISM × RIKU. It presents a working browser baseline and a separate, change-aware experiment. KolektorSDD depicts cracks in the plastic embedding of electrical commutators; TSFabrics depicts textile production. Anomaly scores are not calibrated defect probabilities.

## What is implemented

| Pipeline | Data and method | Site behavior |
| --- | --- | --- |
| Baseline | KolektorSDD; handcrafted patch features compared with a normal reference bank | Runs inference in the browser on 64 packaged, held-out photos |
| Change-aware | TSFabrics; frozen DINOv2 patch features, label-free reference selection, visual-change alarms, and a shadow adaptation candidate | Shows same-stream method comparisons and paired heatmaps; replays saved results on 24 selected frames, with no browser inference |
| Interval summary | Four recorded, time-ordered evaluation intervals with saved inspection-alert counts and visual-change alarms | Opens from the sample page; operators can mark flagged previews, review startup photos after a change alert, and export their decisions |
| Reviewed update | TSFabrics post-alert cases selected without labels; published labels revealed after selection; verified-normal false alerts correct a shadow memory bank | Replays the recorded review and shows later-frame score distributions and a separate defect-sensitivity check |
| Run-scoped reference (research) | A new reference from confirmed-normal frames after each visual-change alert; separate patch-bank and PCA candidates; eight additional calibration reviews | Evaluated offline on five production runs; no automatic model promotion or site claim of improved defect detection |
| Interval feedback (research) | Normal-only threshold calibration, threshold-boundary/disagreement/audit reviews, and a PCA refit from confirmed normal false alerts | Offline shadow comparison on later frames; not yet part of the site summary |
| Unlabeled limited review | TSFabrics; DINOv2 source and local patch references, separate MMD visual-change score, eight temporally spaced review requests | Compares all 16 remaining runs offline; replays one recorded run in a separate interval-summary page |

The sample pages replay packaged images. The shadow candidate is displayed for research comparison and is **never promoted automatically**: the measured reduction in false alarms can also reduce defect recall.

The interval summary follows an unlabeled operating view: it reports frames scored, frames flagged, and visual-change alarms. Reviewers can mark available flagged photos as issues or dismiss them. After a change alert, they can review available buffered photos for a future candidate reference and export the interval report as JSON. Ground-truth labels, false-alarm/miss metrics, and offline candidate scores appear only in the separate research evaluation, not in this handoff.

The [review page](https://gohyunsu.github.io/surface-trace/review.html) uses preselected post-alert frames and reveals their published TSFabrics labels. The candidate scores were computed on later, disjoint frames before packaging the site. On the normal-shift run, 24 reviewed cases yielded two false-alert corrections and reduced later normal alerts from **11/975 to 0/975**. Applying that same candidate to a separate defect-bearing run reduced flagged defects from **33/82 to 0/82**, so it is **held back**. This is an offline dataset-label replay, not a field review or a live model update. See the [reviewed-update protocol](experiments/unsupervised/REVIEWED_UPDATE.md).

The newer [run-scoped reference experiment](experiments/unsupervised/CONDITION_REFERENCE.md) keeps the source reference frozen, isolates each changed run, and uses reviewed normals to build a local candidate. It compares balanced, random, and high-score review selection, a PCA-residual candidate, and the old global-union update. Results show improved score ranking on several runs but unreliable thresholds when unlabeled calibration frames contain defects. The eight-case calibration check caught the two contaminated windows; the candidate remains a review aid, not an automatic replacement for the active detector.

The [interval-feedback experiment](experiments/unsupervised/FEEDBACK_LOOP.md) replaces unlabeled target calibration with 64 prespecified, normal-only reviews. A later interval summary requests 24 boundary, disagreement, and random-audit decisions; only confirmed normal false alerts refit the shadow PCA reference. On one development interval, candidate false alarms fell **14 → 1** while detected defect frames fell **91 → 89**. On a later interval within a second run, false alarms fell **41 → 24** at **587/588** defect frames detected before and after review. Both comparisons use the same later frames, and neither demonstrates a production-ready threshold or an additional detected defect episode on the later interval.

The newer [unlabeled limited-review benchmark](experiments/unsupervised/UNLABELED_REVIEW_PROTOCOL.md) fixes five development runs before testing all 16 remaining TSFabrics runs. With eight review requests spaced by at least 16 frames, a selected local DINO patch bank and the frozen DINO source each found **26/90** new defect episodes across the four defect-bearing final runs (**71.1% macro episode coverage**). A time-spread local bank reached **45.7%**; the local selection did not outperform the frozen source. Spacing increased the selected bank's macro coverage from **37.3% to 71.1%** at the same review budget. The MMD signal alerted after a known synthetic run switch in **15/16** runs and had no alert on the source continuation. See [full results](experiments/unsupervised/UNLABELED_REVIEW_RESULTS.md). The [fixed interval-summary page](https://gohyunsu.github.io/surface-trace/interval.html) keeps the frozen source as its active reference and shows observed scores, change, and eight review photos without labels until a recorded result is checked. It does not update the reference.

The baseline's grouped test split produced image AUROC **0.879**, **5/8** defect photos flagged, and **7/56** normal false alarms. On one shifted TSFabrics test stream, the selected-reference DINOv2 method produced image AUROC **0.987**, **33/82** defects flagged, and **0/2,290** normal false alarms. These are different datasets and protocols, so the numbers are not a direct comparison. See the [baseline protocol](notes/experiment.md) and [research results](experiments/unsupervised/EXPERIMENT_RESULTS.md) for splits, other conditions, comparison methods, and limitations.

The landing page's method comparison re-runs the handcrafted method on the **same TSFabrics streams** as DINOv2. Its four-row chart uses one normal frame and actual heatmaps for each method, including the rejected trial update; the paired defect examples show both gains and misses. The scenario timeline uses real time-ordered frames from two separate production runs, with their experimental boundary marked explicitly. See [comparison provenance](web/ablation/README.md), [scenario provenance](web/scenario/README.md), and the [export script](experiments/unsupervised/export_ablation_comparison.py).

The trial reference has its own retrospective evaluation on all three target runs: defect recall, false alarms, and image AUROC are reported beside the frozen reference. This trial changes both the reference bank and calibration threshold, so its score difference is not a selection-only ablation.

## Repository map

| Path | Role |
| --- | --- |
| `web/` | Editable HTML, CSS, JavaScript, animation assets, and packaged sample images |
| `docs/` | Generated GitHub Pages output; commit it with the source changes |
| `model/` | KolektorSDD baseline, saved reference bank, calibration, and evaluation |
| `experiments/unsupervised/` | Independent TSFabrics and LUSITANOv2 research code, protocols, and results |
| `data/ksdd/` | Fixed item-group split; downloaded raw images are excluded from Git |
| `scripts/` | Site build, sample preparation, calibration, and browser checks |

`web/` is the source of truth for the site. `scripts/build_site.py` packages it with the checked-in baseline model and selected research outputs into `docs/`. Large source datasets and experimental caches stay outside Git. TSFabrics site assets are attributed in [web/next-method/README.md](web/next-method/README.md).

## Run and check the site locally

Use Python with the root requirements and Node.js 20 or newer with pnpm. From the repository root:

```bash
python -m pip install -r requirements.txt
pnpm install --frozen-lockfile
pnpm exec playwright install chromium
python scripts/build_site.py
python -m http.server 8766 --bind 127.0.0.1 --directory docs
```

Open <http://127.0.0.1:8766/>. With the server running, use a second terminal:

```bash
pnpm run smoke
pnpm run visual
```

The smoke check exercises both sample explorers. The visual check tests desktop, tablet, and mobile widths for overflow and missing images; screenshots go to the ignored `out/visual/` directory. Set `SITE_URL` to check another served copy or `CHROME_PATH` to use an installed Chrome binary.

## Reproduce the experiments

**KolektorSDD baseline.** Download the [original dataset](https://www.vicos.si/resources/kolektorsdd/) into `data/ksdd/raw/kosXX/`, preserving its group names. The checked-in `data/ksdd/manifest.csv` fixes the split; `python data/ksdd/make_manifest.py` regenerates it. Then run:

```bash
python model/model.py
python scripts/prepare_samples.py
python scripts/build_site.py
python model/evaluate.py
```

For the browser-specific threshold, leave the local site server running, run `pnpm run calibrate`, and rebuild `docs/`. Calibration uses the validation photos and browser Canvas preprocessing. `pnpm run heatmaps` regenerates baseline example overlays when needed. The full dataset is required for retraining and recalibration, but **not** for the local site build or browser checks. To store the dataset elsewhere, set `KSDD_DATA_DIR` to a directory containing `manifest.csv` and `raw/`.

**Unlabeled production-image experiments.** Follow [experiments/unsupervised/README.md](experiments/unsupervised/README.md) for the GPU environment, dataset checks, fixed time-ordered splits, and run commands. Its dependency list is separate from the lightweight site build. The LUSITANOv2 images remain off the public site because redistribution rights were not stated on the dataset record when checked.

## Publishing workflow

1. Edit `web/`, the relevant model code, or experiment documentation.
2. Run `python scripts/build_site.py` after site-source or packaged-asset changes.
3. Run the browser checks and commit both source and generated `docs/` changes.
4. Push to `main`. GitHub Pages serves `main` / `docs` at the [live site](https://gohyunsu.github.io/surface-trace/).

The [site checks](.github/workflows/site-checks.yml) rebuild `docs/` in CI and fail if the committed output is stale. They also run the browser and responsive-layout checks. The personal homepage repository is not used for this project.

## Data rights and scope

KolektorSDD imagery and the derived baseline reference use [CC BY-NC-SA 4.0](https://creativecommons.org/licenses/by-nc-sa/4.0/); see [ViCoS Lab](https://www.vicos.si/resources/kolektorsdd/) and [Tabernik et al. (2019)](https://doi.org/10.1007/s10845-019-01476-x). TSFabrics imagery is [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/); see [Ni et al. (2026)](https://doi.org/10.1038/s41597-026-06748-9) and the [dataset](https://doi.org/10.6084/m9.figshare.29573381). These licenses apply to the source datasets and their derived images, not automatically to this repository's code. No separate code license is granted here.

Results on these public datasets do not establish performance on Dongil rubber-belt images. A field evaluation needs company images, defect criteria, and a held-out split by production period or acquisition condition.
