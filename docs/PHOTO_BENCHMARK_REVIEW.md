# Educational photo benchmark review

Historical run: the dates, configuration and outcomes below are preserved. See [demo reliability](DEMO_RELIABILITY.md) for subsequent changes and reruns.

Run: 2026-10-24T22:04:29.899Z to 22:08:32.127Z. Gemma `gemma-4-26b-a4b-it`, prompt `whole-home-evidence-v2`, pipeline `bounded-server-retry-v1`. Four source-attributed EPA photographs were submitted without captions or expected answers. Each case retained the application's two-call maximum and 40-second deadline; cases were spaced by 31 seconds.

**Two accepted responses; two timeouts.** This is operational completion on four selected images, not a detection-accuracy score. A timeout is a failed case, not a negative finding or a clean property.

| Photo | Visible expectation | Actual outcome | Development review |
|---|---|---|---|
| [EPA 17](../web/benchmarks/images/epa-17.jpg) | Staining at a wall/ceiling junction | Accepted in 30.95 s, one attempt | Described dark discoloration, line and blotch; did not assert mold, current wetness or a confirmed leak. `ceiling_stain` is consistent with this view. |
| [EPA 32](../web/benchmarks/images/epa-32.jpg) | Tide-like marks on exposed wall materials | TIMEOUT | No accepted output; visible-observation recovery cannot be scored as successful. |
| [EPA 29](../web/benchmarks/images/epa-29.jpg) | Disconnected downspout sections | TIMEOUT | No accepted output; visible-observation recovery cannot be scored as successful. |
| [EPA 89](../web/benchmarks/images/epa-89.jpg) | Lined crawlspace control, no obvious moisture defect in this view | Accepted in 38.22 s, two attempts | No findings, with unassessed categories retained. Appropriate abstention for this limited view; not a certification that the crawlspace is safe or dry. |

This is a development visual comparison, not an independent inspection or expert annotation. The original machine-readable rows retain `humanReviewStatus: pending`. No new expert ground truth, house condition rating, price, address or diagnosis was created.

The accepted extractions recorded 11,344 input and 1,045 output tokens in total, including the correction attempt on EPA 89. Timed-out requests may have consumed additional tokens, so totals are incomplete and cannot establish billed cost. No reliable per-home inference-cost figure is claimed.

## Consequence for the demo

Photo latency is an unresolved usability issue. Keep failures visible; never replace a failed live response with an unlabeled cached answer. A recorded demo may show saved responses only when labeled as recorded. Before relying on live uploads, measure and improve latency on additional permissioned examples. Increasing the deadline alone would not demonstrate better detection or affordable scaling.

This small set exercises moisture/drainage observations and one control. It does not validate roof, kitchen, HVAC, structure or whole-house visual coverage. Source-supported text scenarios test a different capability.

[Original run](../web/benchmarks/results/photos-2026-10-24T22-04-29-899Z.json) · [Photo manifest and checksums](../web/benchmarks/photo-cases.json) · [Credits and permitted use](../web/benchmarks/images/NOTICE.md) · [EPA source library](https://www.epa.gov/mold/mold-image-library)
