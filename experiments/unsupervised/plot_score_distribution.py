"""Draw full-run class-conditional score distributions after metric verification.

Input is produced by export_score_distribution.py, which reproduces the saved
final AP and AUROC before writing. This plotter never reads individual labels.
"""

from __future__ import annotations

import argparse
import json
from pathlib import Path

import matplotlib.pyplot as plt
import numpy as np
from matplotlib.lines import Line2D
from matplotlib.patches import Patch


METHODS = (("handcrafted_source", "Handcrafted"),
           ("source_knn", "DINOv2 + selection"))
NORMAL = "#aeb9c8"
DEFECT = "#574bd2"
BACKGROUND = "#f8f8f6"


def checked_runs(result: dict) -> list[tuple[str, dict]]:
    if result.get("dataset") != "TSFabrics" or len(result.get("runs", {})) != 4:
        raise ValueError("expected four TSFabrics defect recordings")
    edges = np.asarray(result.get("bin_edges"), dtype=float)
    if edges.shape != (21,) or not np.allclose(edges, np.linspace(0, 1, 21)):
        raise ValueError("expected 20 fixed percentile bins")
    runs = list(result["runs"].items())
    for name, run in runs:
        for key, _ in METHODS:
            method = run["methods"][key]
            if not 0 <= method["average_precision"] <= 1 or not 0 <= method["auroc"] <= 1:
                raise ValueError(f"{name}: invalid AP/AUROC")
            for label in ("normal", "defect"):
                item = method["classes"][label]
                values = np.asarray(item["fraction_by_bin"], dtype=float)
                if (values.shape != (20,) or not np.all(np.isfinite(values))
                        or np.any(values < 0) or not np.isclose(values.sum(), 1, atol=1e-6)
                        or item["frames"] != run[f"{label}_frames"] or item["frames"] < 1):
                    raise ValueError(f"{name}: invalid {label} distribution for {key}")
    return runs


def plot_run(run: dict, number: int, output: Path) -> None:
    plt.rcParams.update({"font.family": "DejaVu Sans", "font.size": 11,
                         "svg.hashsalt": "surface-trace-score-distribution"})
    fig, axes = plt.subplots(1, 2, figsize=(11.8, 4.9), sharey=True)
    fig.patch.set_facecolor(BACKGROUND)
    peak = max(max(method["classes"][label]["fraction_by_bin"])
               for key, _ in METHODS for label in ("normal", "defect")
               for method in (run["methods"][key],)) * 100
    edges = np.arange(0, 105, 5)
    for axis, (key, title) in zip(axes, METHODS):
        method = run["methods"][key]
        axis.set_facecolor(BACKGROUND)
        normal = np.asarray(method["classes"]["normal"]["fraction_by_bin"]) * 100
        defect = np.asarray(method["classes"]["defect"]["fraction_by_bin"]) * 100
        axis.stairs(normal, edges, fill=True, color=NORMAL, alpha=.68,
                    linewidth=1.4, label="Normal")
        axis.stairs(defect, edges, fill=True, color=DEFECT, alpha=.21,
                    linewidth=0, label="Defect")
        axis.stairs(defect, edges, color=DEFECT, linewidth=2.2)
        axis.set_title(f"{title}   ·   AP {method['average_precision']:.1%}",
                       loc="left", fontsize=14, color="#202638", pad=16)
        axis.set_xlim(0, 100)
        axis.set_ylim(0, max(10, peak * 1.12))
        axis.set_xticks([0, 25, 50, 75, 100], ["0", "25", "50", "75", "100%"])
        axis.tick_params(length=0, pad=8, colors="#566275")
        axis.grid(axis="y", color="#dde2e9", linewidth=.8)
        axis.set_axisbelow(True)
        for spine in axis.spines.values():
            spine.set_visible(False)
    axes[0].set_ylabel("Share of class (%)", color="#566275", labelpad=10)
    fig.supxlabel("Score percentile within each run and method", y=.112,
                  color="#566275", fontsize=10)
    fig.suptitle(f"Run {number:02d}  /  Score separation", x=.07, y=.975,
                 ha="left", fontsize=21, color="#202638")
    fig.legend(handles=[Patch(facecolor=NORMAL, label="Normal"),
                        Line2D([0], [0], color=DEFECT, linewidth=2.2,
                               label="Defect")], loc="upper right",
               bbox_to_anchor=(.95, .99), ncol=2, frameon=False,
               labelcolor="#566275")
    fig.text(.07, .035,
             f"{run['normal_frames']:,} normal · {run['defect_frames']:,} defect frames"
             "   |   Ranks computed before labels; ambiguous frames omitted from this chart.",
             color="#67738a", fontsize=9)
    fig.subplots_adjust(left=.09, right=.97, top=.77, bottom=.25, wspace=.14)
    output.parent.mkdir(parents=True, exist_ok=True)
    fig.savefig(output, facecolor=BACKGROUND, metadata={"Date": None})
    plt.close(fig)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--result", type=Path, required=True)
    parser.add_argument("--out-dir", type=Path, required=True)
    args = parser.parse_args()
    result = json.loads(args.result.read_text(encoding="utf-8"))
    for number, (name, run) in enumerate(checked_runs(result), 1):
        output = args.out_dir / f"score_distribution_run_{number:02d}.svg"
        plot_run(run, number, output)
        print(f"Run {number:02d}: {name} -> {output}")


if __name__ == "__main__":
    main()
