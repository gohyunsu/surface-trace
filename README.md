# SurfaceTrace

[Live site](https://gohyunsu.github.io/surface-trace/) · Industrial surface anomaly review demo by ISM × RIKU

SurfaceTrace now presents two separate inspection pipelines. The working MVP analyzes **KolektorSDD metal surface photos in the browser**. The newer research pipeline replays recorded DINOv2 anomaly and condition-change results on **TSFabrics production sequences**. Neither dataset is rubber-belt imagery. Anomaly scores are distances, not defect probabilities or production quality decisions. The daily review summary is planned, not implemented.

## Repository layout

| Path | Purpose |
| --- | --- |
| `web/` | Editable site source, both sample explorers, pipeline animations, and packaged photos |
| `model/` | CPU reference model, saved normal patch bank, browser calibration, and Python evaluation |
| `experiments/unsupervised/` | TSFabrics and LUSITANOv2 experiment code, results, and site sample exporters |
| `scripts/` | Static site build, calibration, and browser checks |
| `data/ksdd/` | Reproducible item-group split; full dataset images are downloaded separately |
| `docs/` | Generated static site served by GitHub Pages from `main` / `docs` |
| `notes/experiment.md` | Experiment protocol, metrics, and limitations |

Edit `web/` or the model source, then run `python scripts/build_site.py`. Commit the resulting `docs/` changes with the source changes. The baseline sample page runs inference in the browser; the new sample page displays recorded experiment outputs. Neither page accepts arbitrary image uploads.

## Run locally

The checked-in model and held-out test photos are enough to rebuild and test the site without downloading the full dataset:

```bash
python -m pip install -r requirements.txt
python scripts/build_site.py
python -m http.server 8766 --bind 127.0.0.1 --directory docs
```

Open `http://127.0.0.1:8766/`. To run the browser checks, install Node dependencies with `npm install` and a browser with `npx playwright install chromium`, then use `npm run smoke` or `npm run visual`. Set `SITE_URL` to test a deployed site; otherwise the scripts use the local server. Set `CHROME_PATH` to an installed Chrome executable if desired.

To refresh the packaged samples from the original KolektorSDD dataset, run `python scripts/prepare_samples.py` before building. It keeps each original JPEG for model input and creates a landscape copy for display.

Each pipeline has six looping method animations. The baseline assets live in `web/method/`; the new TSFabrics assets and their attribution live in `web/next-method/`. Their short explanations remain in the page. The favicon is `web/favicon.svg`.

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

The new animation and sample photos are adapted from [TSFabrics by Ni et al. (2026)](https://doi.org/10.1038/s41597-026-06748-9), [dataset DOI](https://doi.org/10.6084/m9.figshare.29573381), released under [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/). See [animation attribution](web/next-method/README.md) and [experiment results](experiments/unsupervised/EXPERIMENT_RESULTS.md) for scope and limitations.

