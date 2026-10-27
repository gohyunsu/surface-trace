"""Build the GitHub Pages site in docs/ from the editable web/ source."""

from __future__ import annotations

import json
import shutil
import sys
import tempfile
from pathlib import Path

import numpy as np

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "model"))
from model import DATA, MODEL  # noqa: E402
from sample_catalog import test_rows  # noqa: E402


WEB = ROOT / "web"
OUT = ROOT / "docs"


def build(out: Path) -> tuple[int, int]:
    if not MODEL.exists():
        raise SystemExit("Train the reference model with model.py first")
    for directory in ("samples", "landscape", "method", "next-method", "next-samples"):
        (out / directory).mkdir(parents=True, exist_ok=True)
    for source, target in [
        ("landing.html", "index.html"),
        ("inspector.html", "inspect.html"),
        ("next-inspector.html", "next-inspect.html"),
        ("site.css", "site.css"),
        ("pipeline.css", "pipeline.css"),
        ("next-app.js", "next-app.js"),
        ("favicon.svg", "favicon.svg"),
    ]:
        shutil.copyfile(WEB / source, out / target)
    (out / ".nojekyll").touch()
    shutil.copyfile(WEB / "app.js", out / "app.js")
    for asset in (WEB / "method").iterdir():
        if asset.suffix in {".gif", ".png"}:
            shutil.copyfile(asset, out / "method" / asset.name)
    for asset in (WEB / "next-method").iterdir():
        if asset.suffix in {".gif", ".png"}:
            shutil.copyfile(asset, out / "next-method" / asset.name)
    for asset in (WEB / "next-samples").iterdir():
        if asset.suffix in {".jpg", ".png", ".json"}:
            shutil.copyfile(asset, out / "next-samples" / asset.name)

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
    (out / "normal_reference.json").write_text(json.dumps(payload, separators=(",", ":")), encoding="utf-8")

    samples = test_rows(DATA / "manifest.csv")
    catalog = []
    for i, row in enumerate(samples, 1):
        name = f"sample-{i:02d}.jpg"
        original = WEB / "samples" / name
        landscape = WEB / "landscape" / name
        if not original.exists() or not landscape.exists():
            raise SystemExit(f"Run scripts/prepare_samples.py before building: {name}")
        shutil.copyfile(original, out / "samples" / name)
        shutil.copyfile(landscape, out / "landscape" / name)
        catalog.append({
            "id": i,
            "label": "Defect" if row["is_anomaly"] == "1" else "Normal",
            "model": f"./samples/{name}",
            "display": f"./landscape/{name}",
        })
    (out / "samples.json").write_text(json.dumps(catalog, separators=(",", ":")), encoding="utf-8")
    for sample in ("01", "04"):
        shutil.copyfile(WEB / "demo_assets" / f"sample-{sample}-heat.png", out / "samples" / f"sample-{sample}-heat.png")
    return len(payload["bank"]), len(samples)


def main() -> None:
    # docs/ is generated output. Build completely before replacing it.
    if OUT.is_symlink() or OUT.resolve() != ROOT.resolve() / "docs":
        raise SystemExit("Refusing to replace a site directory outside this repository")
    with tempfile.TemporaryDirectory(prefix="surface-trace-site-", dir=ROOT) as staging:
        feature_count, sample_count = build(Path(staging))
        if OUT.exists():
            shutil.rmtree(OUT)
        shutil.copytree(staging, OUT)
    print(f"Built {OUT}")
    print(f"Static model: {feature_count} feature values, {sample_count} held-out samples")


if __name__ == "__main__":
    main()
