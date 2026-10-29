# SurfaceTrace

[Live site](https://gohyunsu.github.io/surface-trace/) · [Baseline samples](https://gohyunsu.github.io/surface-trace/inspect.html) · [Change-aware samples](https://gohyunsu.github.io/surface-trace/next-inspect.html)

SurfaceTrace is an industrial image-review research project by ISM × RIKU. It presents a working browser baseline and a separate, change-aware experiment. KolektorSDD depicts cracks in the plastic embedding of electrical commutators; TSFabrics depicts textile production. Anomaly scores are not calibrated defect probabilities.

## What is implemented

| Pipeline | Data and method | Site behavior |
| --- | --- | --- |
| Baseline | KolektorSDD; handcrafted patch features compared with a normal reference bank | Runs inference in the browser on 64 packaged, held-out photos |
| Change-aware | TSFabrics; frozen DINOv2 patch features, label-free reference selection, visual-change alarms, and a shadow adaptation candidate | Shows same-stream method comparisons and paired heatmaps; replays saved results on 24 selected frames, with no browser inference |
| Interval summary | Four recorded, time-ordered evaluation intervals with saved inspection-alert counts and visual-change alarms | Opens from the sample page; operators can mark flagged previews, review startup photos after a change alert, and export their decisions |

The baseline sample page does not accept uploads. The change-aware summary can accept local photos for a human review draft; it does not score them or rebuild the reference in the browser. The shadow candidate is displayed for comparison and is **never promoted automatically**: the measured reduction in false alarms can also reduce defect recall.

The interval summary follows an unlabeled operating view: it reports frames scored, frames flagged, and visual-change alarms. Reviewers can mark packaged flagged photos as issues or dismiss them. After a change alert, they can review startup photos for a future candidate reference and export the interval report as JSON. Ground-truth labels and false-alarm/miss metrics appear only in the separate research evaluation, not in this handoff.

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
