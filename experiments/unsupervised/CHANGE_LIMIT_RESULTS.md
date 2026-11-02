# Lower change-alert limit: fixed extended-run result

The candidate MMD limit was fixed at **75% of the original source limit**
after inspecting the missed development join. It passed the five-run
[development gate](CHANGE_LIMIT_DEVELOPMENT.md), which was committed before
the sixteen extended recordings were scored. The same DINOv2 global features,
MMD windows, 32-frame step, and three-window confirmation rule were retained.
No defect labels enter either change signal.

| Known-boundary comparison | Original limit | 75% trial limit |
| --- | ---: | ---: |
| Development joins alerted | 4 / 5 | **5 / 5** |
| Extended joins alerted | 15 / 16 | **16 / 16** |
| Median delay on alerted extended joins | 96 frames | 96 frames |
| Alerts before the known join, extended recordings | 0 | 0 |
| Confirmed alerts on 16,518 later frames of the source recording | 0 | 0 |
| Source-continuation windows above limit | 0 / 513 | 2 / 513 |

The previously missed extended join, `T1_S177_I108_1`, now confirms an
alert at new-run frame 192. Two other extended joins alert earlier:
`T1_S148_I108_1` moves from frame 224 to 192, and `T1_S174_I108_1`
from frame 288 to 192. The remaining thirteen retain their original first
alert. Both over-limit windows on the long source continuation are isolated;
the longest streak is one, below the required three.

Every recomputed original alert matched the earlier saved result exactly.
The candidate was applied to all sixteen extended recordings; none was
discarded for a late or missing alert. Machine-readable windows and scores
are in [`results/change_limit_final.json`](results/change_limit_final.json).

**Interpretation.** This fixed rule improves sensitivity on the measured
joins between existing recordings without increasing *confirmed* alerts on
the one long source continuation. It does not identify the true time of an
unannounced within-recording process change, and it does not establish a
field false-alert rate. The 75% factor was chosen using a known development
join, while these public recordings had also been inspected for other
project questions. The result is a follow-up sensitivity check, not an
untouched external test. Keep the originally source-calibrated limit as the
active site result until broader stable-run and partner-camera controls can
assess the lower limit.

Protocol and code: [CHANGE_LIMIT_PROTOCOL.md](CHANGE_LIMIT_PROTOCOL.md),
[`change_limit_trial.py`](change_limit_trial.py). The fixed candidate was
committed as `4ed4a68` and the passed development gate as `9bcb342` before
the extended run.
