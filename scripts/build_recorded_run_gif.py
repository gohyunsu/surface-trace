"""Encode captured 1920x1080 recorded-run frames as a looping GIF."""

from __future__ import annotations

import argparse
import os
import shutil
import subprocess
from pathlib import Path

from PIL import Image


ROOT = Path(__file__).resolve().parents[1]


def ffmpeg_path() -> str:
    configured = os.environ.get("FFMPEG_PATH")
    if configured:
        return configured
    installed = shutil.which("ffmpeg")
    if installed:
        return installed
    try:
        import imageio_ffmpeg

        return imageio_ffmpeg.get_ffmpeg_exe()
    except ImportError as exc:
        raise SystemExit("Install ffmpeg or imageio-ffmpeg, or set FFMPEG_PATH") from exc


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--frames", type=Path, default=ROOT / "out" / "recorded-run-frames")
    parser.add_argument("--output", type=Path, default=ROOT / "web" / "media" / "recorded-run-1080p.gif")
    args = parser.parse_args()
    frames = sorted(args.frames.glob("frame-*.png"))
    if len(frames) < 4:
        raise SystemExit("Expected captured frame-0000.png and subsequent frames")
    with Image.open(frames[0]) as first:
        if first.size != (1920, 1080):
            raise SystemExit(f"Expected 1920x1080 frames; got {first.size}")
    args.output.parent.mkdir(parents=True, exist_ok=True)
    palette = args.frames / "palette.png"
    ffmpeg = ffmpeg_path()
    source = str(args.frames / "frame-%04d.png")
    subprocess.run([
        ffmpeg, "-y", "-hide_banner", "-loglevel", "error", "-framerate", "4",
        "-i", source, "-vf", "palettegen=max_colors=128:stats_mode=diff", str(palette),
    ], check=True)
    subprocess.run([
        ffmpeg, "-y", "-hide_banner", "-loglevel", "error", "-framerate", "4",
        "-i", source, "-i", str(palette), "-filter_complex",
        "[0:v][1:v]paletteuse=dither=bayer:bayer_scale=3:diff_mode=rectangle",
        "-loop", "0", str(args.output),
    ], check=True)
    with Image.open(args.output) as result:
        if result.size != (1920, 1080) or result.n_frames != len(frames):
            raise SystemExit("Encoded GIF does not match its captured frames")
        print(f"{result.size[0]}x{result.size[1]}, {result.n_frames} frames, "
              f"{result.n_frames / 4:.2f}s, {args.output.stat().st_size:,} bytes")


if __name__ == "__main__":
    main()
