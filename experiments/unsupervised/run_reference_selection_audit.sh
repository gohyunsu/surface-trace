#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/../.."

export TORCH_HOME="$PWD/.cache/torch"
export XDG_CACHE_HOME="$PWD/.cache/xdg"
export HF_HOME="$PWD/.cache/hf"
export TMPDIR="$PWD/.cache/tmp"
export PYTHONDONTWRITEBYTECODE=1
mkdir -p "$TMPDIR"

python3 -c 'import numpy, PIL, torch; assert torch.cuda.is_available(), "CUDA GPU required"'

python3 experiments/unsupervised/reference_selection_audit.py \
  --zip experiments/unsupervised/data/TSfabrics.zip \
  --cache experiments/unsupervised/features \
  --baseline experiments/unsupervised/results/unlabeled_review_development.json \
  --phase development \
  --out experiments/unsupervised/results/reference_selection_development_verified.json

python3 experiments/unsupervised/reference_selection_audit.py \
  --zip experiments/unsupervised/data/TSfabrics.zip \
  --cache experiments/unsupervised/features \
  --baseline experiments/unsupervised/results/unlabeled_review_final.json \
  --phase final \
  --out experiments/unsupervised/results/reference_selection_final_verified.json

python3 experiments/unsupervised/summarize_reference_selection.py \
  --development experiments/unsupervised/results/reference_selection_development_verified.json \
  --final experiments/unsupervised/results/reference_selection_final_verified.json \
  --out experiments/unsupervised/REFERENCE_SELECTION_RESULTS_VERIFIED.md
