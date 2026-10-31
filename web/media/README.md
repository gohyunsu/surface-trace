# Recorded-run GIF

`recorded-run-1080p.gif` is a 1920 x 1080 capture of the site's recorded-data
replay, not live camera inference. It uses saved TSFabrics photos and model
outputs; the final update-decision screen summarizes a separate 15-run
validation. Dataset images are CC BY 4.0: Ni et al. (2026),
https://doi.org/10.6084/m9.figshare.29573381.

To regenerate, build and serve `docs/` at `http://127.0.0.1:8766/`, then run
`node scripts/capture_recorded_run.js` and
`python scripts/build_recorded_run_gif.py`. The encoder needs ffmpeg on PATH,
`FFMPEG_PATH`, or the `imageio-ffmpeg` Python package. The captures remain in
the ignored `out/` directory.
