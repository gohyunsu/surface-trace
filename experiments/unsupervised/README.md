# Unlabeled line-inspection experiment

This directory is independent of the KolektorSDD browser prototype. Curated
TSFabrics outputs from this experiment appear on the published site; the site
does not run this model or accept new images. The target-domain method sees no
defect labels when choosing its reference bank, review threshold, or change
threshold. Public labels are read only by the audit and evaluation code. The `oracle_normal`
comparison deliberately uses labels and is reported separately.

## TSFabrics: continuous production and change

### Data and protocol

The first executable protocol uses the published TSFabrics ZIP without
extracting all 93k JPEGs. It trains an unlabeled reference on the first 512
frames of `T1_S174_I111_1`, calibrates from frames 512–2047, and holds out
frames 2112–4095. Complete other production scenarios are test streams. An
adaptive candidate is built only from the first 512 target frames, calibrated
on 512–767, and evaluated starting at frame 832. The gaps reduce leakage from
adjacent frames of the same defect episode. Source and target labels are not
passed to the operational model. Scenario selection uses published acquisition
metadata and is fixed before scoring.

The downloaded ZIP contains 93,196 images across 22 scenarios. CSV image labels
and published defect masks disagree on 11 frames. Those frames are excluded
from scored test streams, and the discrepancy is reported in the audit. The
primary startup sequence happens to have zero labeled defects in its first
512 frames. A separate sensitivity experiment uses `T1_S148_I108_2` as source;
its first 512 frames contain 21 defects. This prevents presenting a clean
startup as evidence of robustness to unlabeled contamination.
The second source scenario was added after inspecting the primary experiment,
so it is a sensitivity analysis rather than a pre-registered independent test.

The method is a frozen DINOv2 ViT-S/14 patch extractor, a bounded
mutual-similarity ranking of unlabeled startup frames, and a k-nearest patch
bank. It is inspired by MuSc and AnomalyDINO but is **not** a reproduction of
either paper. Distribution change is scored separately by MMD on global
features. The candidate adaptation is an experiment, not an automatic quality
approval rule. Test AUROC/AP, calibrated false alarms, localization, cutline
errors, reference contamination, and latency are all reported.

The adaptation branch is evaluated as a shadow candidate. A drift alert alone
does not prove that adopting the candidate is safe: fewer false alarms can come
with lower defect recall. The code does not promote it automatically.

Dataset: <https://doi.org/10.6084/m9.figshare.29573381>.
Model code: <https://github.com/facebookresearch/dinov2>.

### LUSITANOv2: raw line-scan preprocessing

The second experiment loads native 4096×1024 RGB TIFFs from an active textile
production line. It compares aspect-preserving letterbox and five overlapping
1024×1024 tiles using the same frozen DINOv2-S/14 backbone and the same source
images. This tests whether the end-to-end preprocessing choice changes detection
and bounding-box localization.

The official validation split supplies 1,020 images: 507 normal and 3 defective
in each of a startup set and a disjoint calibration set, sampled with seed 42.
Validation labels construct this *simulated* 0.59% defect prevalence. The method
receives only image pixels. The official 2,512-image test split is held out for
evaluation. Two reference banks are compared for each input mode: all unlabeled
startup images and a label-free low-novelty selection. Thresholds are the 99.5th
percentile of the separate calibration scores. AUROC, average precision, recall,
false alarms, box hits, and full-image latency are reported. Test prevalence is
close to 50%, so test precision is not a field precision estimate.
The two banks use the same number of reference vectors so bank capacity does
not confound the selection comparison.

An image audit found one zero-byte TIFF in the official test archive
(`20240724_225529_420.tif`). The archive checksum matches Zenodo, so this is
in the released archive. The unreadable frame is excluded and named in the
result JSON; the resulting scored test set has 2,511 images.

The full 17,596-image training archive is not required for this validation/test
experiment. The Zenodo record has an empty license field as of this experiment;
do not redistribute sample images or weights through the public site until the
rights are clarified. This benchmark is textile production, not rubber-belt
production, so it cannot establish field performance on the partner's process.

Dataset: <https://doi.org/10.5281/zenodo.22150068>.
Dataset paper: <https://doi.org/10.3390/electronics15194403>.

## Reproduce on the server

Run from the repository root. Keep `TORCH_HOME`, `XDG_CACHE_HOME`, `HF_HOME`,
and `TMPDIR` inside this directory. The tested Python interpreter on the
server is `/home/hyunsu/miniconda3/envs/autodex_bodex/bin/python` with
PyTorch 2.4.1+cu121. No packages need to be installed globally.

```
python experiments/unsupervised/run_tsfabrics.py audit --zip experiments/unsupervised/data/TSfabrics.zip
python experiments/unsupervised/run_tsfabrics.py extract --zip experiments/unsupervised/data/TSfabrics.zip
python experiments/unsupervised/run_tsfabrics.py evaluate --zip experiments/unsupervised/data/TSfabrics.zip
python experiments/unsupervised/run_tsfabrics.py evaluate --zip experiments/unsupervised/data/TSfabrics.zip --source T1_S148_I108_2 --targets T1_S174_I111_1 T1_S164_I36_1 T1_S478_I118_2 --output experiments/unsupervised/results/tsfabrics_contaminated_source.json
python experiments/unsupervised/run_lusitano.py --mode both
```

The dataset checksum and archive inventory must be verified before using the
results. The ZIP remains outside Git. The first protocol focuses on one source
texture and three held-out conditions, so it does not establish performance on
rubber or all production products.
