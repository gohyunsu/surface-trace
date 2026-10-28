"""Draw the change figure from recorded TSFabrics scores."""

from __future__ import annotations

import json
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "web" / "ablation" / "change-figure.json"
OUT = ROOT / "web" / "ablation"


def y(score: float, top: float, bottom: float) -> float:
    return bottom - (bottom - top) * score


def trace(scores: list[float], left: float, right: float, top: float, bottom: float) -> str:
    return " ".join(
        f"{left + (right - left) * i / (len(scores) - 1):.1f},{y(score, top, bottom):.1f}"
        for i, score in enumerate(scores)
    )


def svg(width: int, height: int, content: str) -> str:
    return f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {width} {height}" role="img" aria-labelledby="title desc">
<title id="title">Visual change across two production runs</title>
<desc id="desc">The reference run's 59 windows stay below the alert limit. Three consecutive windows in a separate changed normal run exceed it, confirming an alert at frame 192. The traces share a zero-to-one score scale.</desc>
<style>
text{{font-family:Segoe UI,Arial,sans-serif}}
.heading{{fill:#59698f;font-size:11px;letter-spacing:1px}}
.axis{{fill:#75829b;font-size:10px}}
.value{{fill:#53617d;font-size:11px}}
.alert{{fill:#ba676c;font-size:10px;letter-spacing:1px}}
</style>
{content}
</svg>
'''


def desktop(source: list[float], target: list[float], limit: float) -> str:
    top, bottom = 57, 180
    xs = (354, 451, 548)
    source_max = max(source)
    max_x = 54 + 230 * source.index(source_max) / (len(source) - 1)
    lines = [
        '<text x="54" y="26" class="heading">REFERENCE RUN</text>',
        '<text x="354" y="26" class="heading">CHANGED RUN · NORMAL</text>',
        '<line x1="319" x2="319" y1="35" y2="210" stroke="#cbd2e1" stroke-dasharray="4 5"/>',
    ]
    for level in (1.0, 0.5, 0.0):
        pos = y(level, top, bottom)
        lines.append(f'<line x1="54" x2="548" y1="{pos:.1f}" y2="{pos:.1f}" stroke="#dce2ef"/>')
        lines.append(f'<text x="43" y="{pos + 3:.1f}" text-anchor="end" class="axis">{level:g}</text>')
    ly = y(limit, top, bottom)
    lines.extend([
        f'<line x1="54" x2="548" y1="{ly:.1f}" y2="{ly:.1f}" stroke="#ba8f71" stroke-width="1.5" stroke-dasharray="5 4"/>',
        f'<text x="54" y="{ly - 8:.1f}" class="axis">ALERT LIMIT · {limit:.3f}</text>',
        f'<polyline points="{trace(source, 54, 284, top, bottom)}" fill="none" stroke="#7788bf" stroke-width="2" stroke-linejoin="round"/>',
        f'<circle cx="{max_x:.1f}" cy="{y(source_max, top, bottom):.1f}" r="3.5" fill="#7788bf"/>',
        f'<text x="284" y="157" text-anchor="end" class="value">MAX {source_max:.3f}</text>',
        '<text x="54" y="201" class="axis">START</text>',
        '<text x="284" y="201" text-anchor="end" class="axis">59 WINDOWS</text>',
        f'<polyline points="{trace(target, xs[0], xs[-1], top, bottom)}" fill="none" stroke="#d98387" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>',
    ])
    for x, end, score in zip(xs, (128, 160, 192), target):
        pos = y(score, top, bottom)
        lines.extend([
            f'<circle cx="{x}" cy="{pos:.1f}" r="5" fill="#d98387"/>',
            f'<text x="{x}" y="{pos - 11:.1f}" text-anchor="middle" class="value">{score:.2f}</text>',
            f'<text x="{x}" y="201" text-anchor="middle" class="axis">{end}</text>',
        ])
    lines.extend([
        f'<circle cx="548" cy="{y(target[-1], top, bottom):.1f}" r="8" fill="none" stroke="#ba676c" stroke-width="1.5"/>',
        '<text x="354" y="225" class="axis">FRAME</text>',
        '<text x="548" y="225" text-anchor="middle" class="alert">ALERT</text>',
    ])
    return svg(600, 238, "\n".join(lines))


def mobile(source: list[float], target: list[float], limit: float) -> str:
    lines = []
    for title, scores, top, bottom, color in (
        ("REFERENCE RUN · 59 WINDOWS", source, 45, 142, "#7788bf"),
        ("CHANGED RUN · NORMAL", target, 213, 310, "#d98387"),
    ):
        lines.extend([
            f'<text x="37" y="{top - 17}" class="heading">{title}</text>',
            f'<line x1="37" x2="274" y1="{top}" y2="{top}" stroke="#dce2ef"/>',
            f'<line x1="37" x2="274" y1="{bottom}" y2="{bottom}" stroke="#dce2ef"/>',
            f'<text x="30" y="{top + 3}" text-anchor="end" class="axis">1</text>',
            f'<text x="30" y="{bottom + 3}" text-anchor="end" class="axis">0</text>',
            f'<line x1="37" x2="274" y1="{y(limit, top, bottom):.1f}" y2="{y(limit, top, bottom):.1f}" stroke="#ba8f71" stroke-width="1.5" stroke-dasharray="5 4"/>',
            f'<polyline points="{trace(scores, 37, 274, top, bottom)}" fill="none" stroke="{color}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>',
        ])
        if len(scores) == 3:
            for x, end, score in zip((37, 155.5, 274), (128, 160, 192), scores):
                lines.extend([
                    f'<circle cx="{x}" cy="{y(score, top, bottom):.1f}" r="4.5" fill="{color}"/>',
                    f'<text x="{x}" y="{y(score, top, bottom) - 10:.1f}" text-anchor="middle" class="value">{score:.2f}</text>',
                    f'<text x="{x}" y="{bottom + 17}" text-anchor="middle" class="axis">{end}</text>',
                ])
            lines.extend([
                f'<circle cx="274" cy="{y(scores[-1], top, bottom):.1f}" r="8" fill="none" stroke="#ba676c" stroke-width="1.5"/>',
                '<text x="274" y="349" text-anchor="middle" class="alert">ALERT</text>',
            ])
        else:
            lines.extend([
                f'<text x="37" y="{y(limit, top, bottom) - 8:.1f}" class="axis">LIMIT {limit:.3f}</text>',
                f'<text x="274" y="{bottom - 12}" text-anchor="end" class="value">MAX {max(scores):.3f}</text>',
            ])
    return svg(300, 362, "\n".join(lines))


def main() -> None:
    data = json.loads(DATA.read_text(encoding="utf-8"))
    source = data["source_holdout"]["scores"]
    target = data["target_start"]["scores"]
    assert len(source) == 59 and data["target_start"]["ends"] == [128, 160, 192]
    assert data["target_start"]["first_alarm"] == 192
    assert max(source) < data["limit"] < min(target)
    (OUT / "change-figure.svg").write_text(desktop(source, target, data["limit"]), encoding="utf-8")
    (OUT / "change-figure-mobile.svg").write_text(mobile(source, target, data["limit"]), encoding="utf-8")
    print("Wrote desktop and mobile change figures")


if __name__ == "__main__":
    main()
