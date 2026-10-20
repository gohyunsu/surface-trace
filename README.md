# SurfaceTrace

[Live site](https://gohyunsu.github.io/surface-trace/) · Industrial surface anomaly review demo by ISM×RIKU

SurfaceTrace highlights regions unlike normal reference photos and gives an operator a review cue. The current data is **KolektorSDD metal surface imagery**, not rubber belt imagery. The anomaly score is a distance, not a defect probability or a production quality decision.

## Repository layout

| Path | Purpose |
| --- | --- |
| `web/` | Editable HTML, CSS, JavaScript, six method GIFs, held-out photos, landscape display copies, and example heatmaps |
| `model/` | CPU reference model, saved normal patch bank, browser calibration, and Python evaluation |
| `scripts/` | Static site build, calibration, and browser checks |
| `data/ksdd/` | Reproducible item-group split; full dataset images are downloaded separately |
| `docs/` | Generated static site served by GitHub Pages from `main` / `docs` |
| `notes/experiment.md` | Experiment protocol, metrics, and limitations |

Edit `web/` or the model source, then run `python scripts/build_site.py`. Commit the resulting `docs/` changes with the source changes. The site runs inference in the browser on packaged held-out test photos; it has no upload feature.

## Run locally

The checked-in model and held-out test photos are enough to rebuild and test the site without downloading the full dataset:

```bash
python -m pip install -r requirements.txt
python scripts/build_site.py
python -m http.server 8766 --bind 127.0.0.1 --directory docs
```

Open `http://127.0.0.1:8766/`. To run the browser checks, install Node dependencies with `npm install` and a browser with `npx playwright install chromium`, then use `npm run smoke` or `npm run visual`. Set `SITE_URL` to test a deployed site; otherwise the scripts use the local server. Set `CHROME_PATH` to an installed Chrome executable if desired.

To refresh the packaged samples from the original KolektorSDD dataset, run `python scripts/prepare_samples.py` before building. It keeps each original JPEG for model input and creates a landscape copy for display.

The six method animations use actual split-specific photos and model intermediates. They live in `web/method/`; the frames contain no labels, while the short explanations remain in the page. The favicon is `web/favicon.svg`.

## Reproduce the model and evaluation

Download the [original KolektorSDD images and pixel masks](https://www.vicos.si/resources/kolektorsdd/) into `data/ksdd/raw/kosXX/`, preserving the source folder names. The downloaded files are ignored by Git. The checked-in `manifest.csv` records our project split; `python data/ksdd/make_manifest.py` regenerates it. The model commands are:

```bash
python model/model.py
python scripts/build_site.py
python model/evaluate.py
npm run calibrate
python scripts/build_site.py
```

`npm run calibrate` needs the local static server running and the full dataset. It measures scores through the browser Canvas path and writes `model/browser_calibration.json`; rebuilding then embeds its threshold. See [experiment notes](notes/experiment.md) for the exact split and held-out results.

## Deployment

This repository is the single source for both code and the GitHub Pages site. Pages publishes from branch `main`, folder `/docs`. A push containing rebuilt `docs/` files updates the site. The personal homepage repository does not contain this project.

## Data attribution

The demo photos and reference model are derived from [KolektorSDD by ViCoS Lab / Kolektor Group](https://www.vicos.si/resources/kolektorsdd/), associated with [Tabernik et al. (2019)](https://doi.org/10.1007/s10845-019-01476-x). The dataset is [CC BY-NC-SA 4.0](https://creativecommons.org/licenses/by-nc-sa/4.0/); check the source terms before commercial use. No license for the original project code is granted by this README.

