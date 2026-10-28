"""Export paired handcrafted heatmaps for the held-out site sample frames."""

from __future__ import annotations

import json
from pathlib import Path

import numpy as np
from PIL import Image

from classic import ClassicScorer
from export_site_samples import overlay


ROOT = Path(__file__).resolve().parent
SOURCE = "T1_S174_I111_1"
STARTUP = 512
EXPECTED = {
    4: ("Defect", True, False),
    6: ("Normal", True, False),
    7: ("Defect", False, True),
}


def main() -> None:
    catalog = json.loads((ROOT / "site_export" / "catalog.json").read_text())
    results = json.loads((ROOT / "results" / "tsfabrics.json").read_text())
    threshold = float(results["methods"]["classic_8_feature"]["threshold"])
    source = np.load(ROOT / "features" / f"{SOURCE}.classic.npy", mmap_mode="r")
    scorer = ClassicScorer(source[:STARTUP].reshape(STARTUP, -1, 8))
    output = ROOT / "ablation_export"
    output.mkdir(exist_ok=True)
    exported = []

    for sample in catalog["samples"]:
        if sample["id"] not in EXPECTED:
            continue
        scenario, frame = sample["scenario"], int(sample["frame"])
        features = np.load(ROOT / "features" / f"{scenario}.classic.npy", mmap_mode="r")
        scores, maps = scorer.score(features[frame:frame + 1])
        classic_alert = bool(scores[0] >= threshold)
        selected_alert = bool(sample["current"]["score"] >= sample["current"]["threshold"])
        assert (sample["label"], classic_alert, selected_alert) == EXPECTED[sample["id"]]
        original = ROOT / "site_export" / f"sample-{sample['id']:02d}.jpg"
        with Image.open(original) as image:
            size = image.size
        filename = f"sample-{sample['id']:02d}-classic.png"
        overlay(maps[0], threshold, size, output / filename)
        exported.append({
            "id": sample["id"],
            "scenario": scenario,
            "frame": frame,
            "dataset_label": sample["label"],
            "score": float(scores[0]),
            "threshold": threshold,
            "alert": classic_alert,
            "overlay": filename,
        })

    (output / "catalog.json").write_text(json.dumps(exported, indent=2), encoding="utf-8")
    print(json.dumps(exported, indent=2))


if __name__ == "__main__":
    main()
