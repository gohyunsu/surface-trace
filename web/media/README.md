# Recorded-run GIF

`recorded-run-1080p.gif` is a 1920 x 1080 capture of the site's recorded-data
replay, not live camera inference. It uses saved TSFabrics photos and model
outputs. The first scene compares three curated photos from development and
final runs, including one where
the handcrafted method flags a defect that DINOv2 misses. The visual-change
scene advances through real frames 1, 32, 64, 96, and 192 from one recorded
run as its saved feature-distribution trace grows; the alert is confirmed at
frame 96. The middle scenes follow that run; the final update-decision screen
summarizes a separate 15-run validation. Dataset images are CC BY 4.0: Ni et
al. (2026),
https://doi.org/10.6084/m9.figshare.29573381.

To regenerate, build and serve `docs/` at `http://127.0.0.1:8766/`, then run
`node scripts/capture_recorded_run.js` and
`python scripts/build_recorded_run_gif.py`. The encoder needs ffmpeg on PATH,
`FFMPEG_PATH`, or the `imageio-ffmpeg` Python package. The captures remain in
the ignored `out/` directory.
