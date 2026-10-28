"""Draw the landing-page change figure from recorded TSFabrics scores."""

from __future__ import annotations

import json
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "web" / "ablation" / "change-figure.json"
OUT = ROOT / "web" / "ablation" / "change-figure.svg"
BOTTOM = 171
HEIGHT = 126


def y(score: float) -> float:
    return BOTTOM - HEIGHT * score


def main() -> None:
    data = json.loads(DATA.read_text(encoding="utf-8"))
    source_max = max(data["source_holdout"]["scores"])
    target_ends = data["target_start"]["ends"]
    target_scores = data["target_start"]["scores"]
    assert target_ends == [128, 160, 192]
    assert source_max < data["limit"] < min(target_scores)

    limit_y = y(data["limit"])
    bars = []
    for x, end, score in zip((282, 377, 472), target_ends, target_scores):
        top = y(score)
        bars.extend([
            f'<rect x="{x}" y="{top:.1f}" width="54" height="{BOTTOM - top:.1f}" rx="4" fill="#d98387"/>',
            f'<text x="{x + 27}" y="{top + 20:.1f}" text-anchor="middle" class="bar-value">{score:.2f}</text>',
            f'<text x="{x + 27}" y="193" text-anchor="middle" class="frame-label">{end}</text>',
        ])
    source_top = y(source_max)
    svg = f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 216" role="img" aria-labelledby="title desc">
<title id="title">Visual change across separate production runs</title>
<desc id="desc">The maximum change score over 59 source holdout windows is {source_max:.3f}, below the alert limit {data['limit']:.3f}. The first three changed-run windows ending at frames 128, 160, and 192 score {target_scores[0]:.2f}, {target_scores[1]:.2f}, and {target_scores[2]:.2f}, all above the limit. The third consecutive crossing confirms the alert.</desc>
<style>
text{{font-family:Segoe UI,Arial,sans-serif}}
.group{{fill:#59698f;font-size:10px;letter-spacing:1.3px}}
.note{{fill:#687791;font-size:11px}}
.frame-label{{fill:#53617d;font-size:11px}}
.bar-value{{fill:white;font-size:11px;font-weight:500}}
</style>
<text x="28" y="23" class="group">REFERENCE RUN</text>
<text x="282" y="23" class="group">CHANGED RUN · NORMAL</text>
<line x1="246" x2="246" y1="14" y2="202" stroke="#cbd2e1" stroke-dasharray="4 5"/>
<line x1="28" x2="572" y1="{limit_y:.1f}" y2="{limit_y:.1f}" stroke="#bf8e71" stroke-width="1.5" stroke-dasharray="5 5"/>
<rect x="27" y="{limit_y - 20:.1f}" width="104" height="17" rx="3" fill="#eef1f9"/>
<text x="32" y="{limit_y - 8:.1f}" class="note">ALERT LIMIT</text>
<rect x="153" y="{source_top:.1f}" width="54" height="{BOTTOM - source_top:.1f}" rx="2" fill="#7988be"/>
<circle cx="180" cy="{source_top:.1f}" r="4" fill="#7988be"/>
<text x="180" y="{source_top - 10:.1f}" text-anchor="middle" class="note">{source_max:.3f}</text>
<text x="180" y="193" text-anchor="middle" class="frame-label">MAX · 59 WINDOWS</text>
{''.join(bars)}
<path d="M282 38 H526" fill="none" stroke="#d98387" stroke-width="1.5"/>
<text x="404" y="34" text-anchor="middle" class="note">3 IN A ROW</text>
<text x="499" y="210" text-anchor="middle" class="group">ALERT</text>
</svg>
'''
    OUT.write_text(svg, encoding="utf-8")
    print(f"Wrote {OUT}")


if __name__ == "__main__":
    main()
