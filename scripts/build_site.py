"""Build a static GitHub Pages package from the local BeltGuard prototype."""

from __future__ import annotations

import csv
import json
import shutil
import sys
from pathlib import Path

import numpy as np

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "model"))
from model import DATA, MODEL  # noqa: E402


WEB = ROOT / "web"
OUT = ROOT / "docs"
SAMPLES = [
    "raw/kos07/Part1.jpg",
    "raw/kos15/Part3.jpg",
    "raw/kos02/Part6.jpg",
    "raw/kos02/Part0.jpg",
    "raw/kos02/Part1.jpg",
    "raw/kos02/Part2.jpg",
]


def main() -> None:
    if not MODEL.exists():
        raise SystemExit("Train the reference model with model.py first")
    OUT.mkdir(exist_ok=True)
    (OUT / "samples").mkdir(exist_ok=True)
    for source, target in [
        ("landing.html", "index.html"),
        ("inspector.html", "inspect.html"),
        ("site.css", "site.css"),
    ]:
        shutil.copyfile(WEB / source, OUT / target)
    (OUT / ".nojekyll").touch()
    shutil.copyfile(WEB / "app.js", OUT / "app.js")

    saved = np.load(MODEL)
    calibration_file = ROOT / "model" / "browser_calibration.json"
    calibration = json.loads(calibration_file.read_text(encoding="utf-8")) if calibration_file.exists() else None
    payload = {
        "bank": saved["bank"].astype(np.float32).reshape(-1).tolist(),
        "center": saved["center"].tolist(),
        "scale": saved["scale"].tolist(),
        "normal_scores": calibration["normal_scores"] if calibration else saved["normal_scores"].tolist(),
        "threshold": calibration["threshold"] if calibration else float(saved["threshold"]),
        "bank_rows": int(saved["bank"].shape[0]),
        "feature_count": int(saved["bank"].shape[1]),
    }
    (OUT / "normal_reference.json").write_text(json.dumps(payload, separators=(",", ":")), encoding="utf-8")

    rows = {r["image"]: r for r in csv.DictReader((DATA / "manifest.csv").open(encoding="utf-8"))}
    for i, path in enumerate(SAMPLES, 1):
        if rows[path]["split"] != "test":
            raise SystemExit(f"Sample is not in the test split: {path}")
        source = WEB / "samples" / f"sample-{i:02d}.jpg"
        if not source.exists():
            source = DATA / path
        shutil.copyfile(source, OUT / "samples" / f"sample-{i:02d}.jpg")
    for sample in ("01", "04"):
        shutil.copyfile(WEB / "demo_assets" / f"sample-{sample}-heat.png", OUT / "samples" / f"sample-{sample}-heat.png")
    print(f"Built {OUT}")
    print(f"Static model: {len(payload['bank'])} feature values, {len(SAMPLES)} samples")


if __name__ == "__main__":
    main()
