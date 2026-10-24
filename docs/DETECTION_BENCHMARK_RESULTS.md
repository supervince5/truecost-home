# Detection benchmark results

Historical run: the dates, configuration and outcomes below are preserved. See [demo reliability](DEMO_RELIABILITY.md) for subsequent changes and reruns.

## What actually ran

All runs used Gemma `gemma-4-26b-a4b-it` and prompt `whole-home-evidence-v2`. These are constructed text scenarios and a small educational-photo check, not independent inspection ground truth. No before/after accuracy improvement has been measured.

| Run | Scope | Automated outcome | Interpretation |
|---|---|---|---|
| [Initial full suite](../web/benchmarks/results/2026-10-24T21-50-06-214Z.json) | All 24 text cases | 12/24 passed; 12 provider failures | 16 expected tags found, 13 missed including unavailable responses, 0 unexpected tags |
| [Single diagnostic](../web/benchmarks/results/2026-10-24T21-56-10-417Z.json) | Roof/ceiling case | 1/1 passed | Targeted retry, not overall performance |
| [Selected-case rerun](../web/benchmarks/results/2026-10-24T21-57-22-155Z.json) | 11 previously failed cases | 9/11 passed; 1 provider failure and 1 incorrect tag | 9 expected tags found, 2 missed, 1 unexpected tag |

The rerun captured HTTP 500 INTERNAL, establishing an upstream server failure for that case. Other initial failures lack HTTP diagnostics; do not assume every initial failure had the same cause. Slower pacing alone did not remove all failures. The initial full suite paced cases at 7 seconds; subsequent runs use 31 seconds.

**Known detection error:** the repaired-leak control described a cabinet as currently dry and undamaged. Gemma's prose preserved that qualification, but its `cabinet_water_damage` tag was unsupported. That tag could still create an unnecessary review card. It cannot automatically generate a priced repair because cost estimation requires a separately confirmed scope and quantity. This remains a model limitation, not a passing case.

Do not merge these overlapping runs into an apparent independent accuracy score. Machine-readable [latest full suite](../web/benchmarks/results/latest.json) and [latest selected subset](../web/benchmarks/results/latest-subset.json) are separate. Original dated results are retained unchanged.

## Reliability change after the text runs

The application now retries a confirmed provider HTTP 500/502/503/504 once after an abortable 800 ms delay. That retry shares the existing two-call, 40-second budget with output correction. HTTP 429 and unclassified failures do not trigger retries. Five added offline SDK-boundary cases check this behavior, cancellation, the shared budget and unknown usage. No post-change full text-suite score is claimed.

## Usage and review limits

The initial full suite recorded 49,502 input and 5,942 output tokens on accepted extractions. The selected rerun recorded 38,882 input and 4,049 output tokens on accepted extractions. Failed-call usage is unavailable; these are incomplete token totals, not billed cost or a per-home cost estimate.

Free-text findings were inspected during development, including the incorrect repaired-leak tag. This was not independent professional review. Automated tag checks do not establish diagnostic correctness, photo accuracy, calibrated confidence, severity, hidden conditions or market value. Original machine-readable rows retain their pending-human-review flag until independent annotation is available.

The separate four-photo run accepted two responses and timed out on two. The stain observation and control abstention were reasonable in a development visual comparison; this does not validate whole-house vision.

See [benchmark design and commands](DETECTION_BENCHMARK.md) and [photo review](PHOTO_BENCHMARK_REVIEW.md) for the separate image evaluation.
