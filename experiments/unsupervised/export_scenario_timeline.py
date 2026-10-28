"""Export real, time-ordered frames for the landing-page run-boundary illustration."""

from __future__ import annotations

import json
from pathlib import Path

from PIL import Image

from tsfabrics import TSFabricsArchive


ROOT = Path(__file__).resolve().parent
OUT = ROOT / "scenario_export"
RUNS = {
    "source": ("T1_S174_I111_1", (508, 509, 510, 511)),
    "target": ("T1_S164_I36_1", (0, 63, 127, 191)),
}


def main() -> None:
    if not hasattr(Image, "Resampling"):
        Image.Resampling = Image
    archive = TSFabricsArchive(ROOT / "data" / "TSfabrics.zip")
    OUT.mkdir(exist_ok=True)
    frames = []
    for role, (scenario, indices) in RUNS.items():
        rows = archive.scenarios[scenario]
        for index in indices:
            row = rows[index]
            if row["label"] or row["ambiguous"]:
                raise ValueError(f"expected an unambiguous normal frame: {scenario}/{index}")
            filename = f"{role}-{index + 1:03d}.jpg"
            image = archive.read_image(row["image"]).convert("RGB")
            image.resize((400, 320), Image.Resampling.LANCZOS).save(
                OUT / filename, quality=86, optimize=True
            )
            frames.append({"file": filename, "scenario": scenario, "index": index,
                           "display_frame": index + 1, "dataset_label": "Normal"})
    (OUT / "manifest.json").write_text(json.dumps(frames, indent=2), encoding="utf-8")
    print(json.dumps(frames, indent=2))


if __name__ == "__main__":
    main()
