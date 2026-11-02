"""Frozen change-limit comparison on two additional normal-only recordings."""

from __future__ import annotations

import argparse
import json
from pathlib import Path

import numpy as np

from change_limit_trial import FACTOR, first_alarm, longest_streak
from core import DINOFeatures
from drift import DriftDetector
from tsfabrics import TSFabricsArchive


RUNS = ("T1_S177_I108_1", "T2_S466_I39_1")
PREFIX = 4096
CAL_END = 2048
TEST_START = 2112


def global_features(archive: TSFabricsArchive, name: str, cache: Path,
                    extractor: DINOFeatures | None
                    ) -> tuple[np.ndarray, DINOFeatures | None]:
    rows = archive.scenarios[name][:PREFIX]
    if len(rows) != PREFIX:
        raise ValueError(f"{name}: expected {PREFIX} frames, found {len(rows)}")
    cache.mkdir(parents=True, exist_ok=True)
    array_file = cache / f"{name}.global.npy"
    metadata_file = cache / f"{name}.json"
    image_names = [row["image"] for row in rows]
    if array_file.exists() and metadata_file.exists():
        metadata = json.loads(metadata_file.read_text())
        array = np.load(array_file, mmap_mode="r")
        if metadata["images"] != image_names or array.shape != (PREFIX, 384):
            raise ValueError(f"{name}: stale or incomplete global-feature cache")
        return array, extractor
    if extractor is None:
        extractor = DINOFeatures()
    array = np.empty((PREFIX, 384), dtype=np.float16)
    for offset in range(0, PREFIX, 8):
        images = [archive.read_image(row["image"]) for row in rows[offset:offset + 8]]
        _, encoded = extractor.encode(images)
        array[offset:offset + len(images)] = encoded
        if offset % 256 == 0:
            print(f"{name}: encoded {offset + len(images)}/{PREFIX}", flush=True)
    np.save(array_file, array)
    metadata_file.write_text(json.dumps({"images": image_names}, separators=(",", ":")))
    return array, extractor


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--zip", type=Path, required=True)
    parser.add_argument("--cache", type=Path, required=True)
    parser.add_argument("--out", type=Path, required=True)
    args = parser.parse_args()
    archive = TSFabricsArchive(args.zip)
    output = {
        "protocol": {"runs": list(RUNS), "calibration": [0, CAL_END],
                     "continuation": [TEST_START, PREFIX], "factor": FACTOR,
                     "window": 128, "step": 32, "consecutive": 3,
                     "label_use": "audit-only control selection and outcome interpretation"},
        "runs": {},
    }
    extractor = None
    for name in RUNS:
        features, extractor = global_features(archive, name, args.cache, extractor)
        detector = DriftDetector(np.asarray(features[:CAL_END]))
        ends, scores = detector.sequence_scores(np.asarray(features[TEST_START:PREFIX]))
        original = detector.threshold
        trial = FACTOR * original
        rows = archive.scenarios[name][TEST_START:PREFIX]
        output["runs"][name] = {
            "frames": len(rows), "defect_labels": sum(int(row["label"]) for row in rows),
            "ambiguous_labels": sum(int(row["ambiguous"]) for row in rows),
            "original_limit": original, "trial_limit": trial,
            "window_ends": ends.astype(int).tolist(),
            "window_scores": scores.astype(float).tolist(),
            "original_windows_over": int((scores > original).sum()),
            "trial_windows_over": int((scores > trial).sum()),
            "original_longest_streak": longest_streak(scores, original),
            "trial_longest_streak": longest_streak(scores, trial),
            "original_first_alert": first_alarm(ends, scores, original),
            "trial_first_alert": first_alarm(ends, scores, trial),
        }
        args.out.parent.mkdir(parents=True, exist_ok=True)
        temporary = args.out.with_suffix(args.out.suffix + ".tmp")
        temporary.write_text(json.dumps(output, separators=(",", ":"), allow_nan=False) + "\n")
        temporary.replace(args.out)
        print(name, "original", output["runs"][name]["original_first_alert"],
              "trial", output["runs"][name]["trial_first_alert"], flush=True)


if __name__ == "__main__":
    main()
