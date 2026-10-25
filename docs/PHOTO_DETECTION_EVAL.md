# Photo detection evaluation — October 25, 2026

**Decision: photo-detection fix not validated.** None of four candidates met the full acceptance gate. Production keeps the existing 26B MINIMAL single-pass extraction. The shipped change replaces photo follow-up questions that may presume an unproved cause with a neutral verification question. It does not correct false object descriptions or recover missed signs. Photo interpretation remains experimental and requires review.

## Question and frozen comparison

The current 26B pipeline misidentifies exposed wall material as boxes, assigns a kitchen-cabinet indicator to those boxes, and misses a separated downspout. Neutral observations recover the downspout gap but still misidentify the wall material. These are model perception/selection errors: the original image is decoded successfully, source IDs are intact, and the schema validator cannot establish whether the model's object description is true.

A diagnostic with Gemma's documented `HIGH` thinking setting recovered the downspout and retained the staining without the cabinet label. It also took approximately 69 seconds on one image. The candidate for the paired comparison changes only the photo thinking setting; text-only behavior, prompt, image preparation, model ID, output limits, two-call cap and total deadlines stay fixed. No image names, hashes, captions, answers or case-specific rules enter the application prompt.

## Before seeing the additional outputs

The [frozen manifest](../web/benchmarks/vision-cases.json) contains four prior development images and six additional EPA educational photographs. Additional images cover roof pooling, window droplets, pipe discoloration, window flashing, a kitchen hood and marked storage materials. The flashing and hood views are controls; visible construction seams or dated styling alone must not become damage findings. Original EPA 89 is also a control. Captions may contain nonvisual knowledge; expected observations are limited to what is visible.

Run each arm once on each image, alternating arm order by image. Keep all errors and use the same normalized image bytes. No retries outside the application's two-call budget. Record model/prompt/pipeline versions, normalized hashes, usage and latency. The six additional images are held out from prompt selection for this comparison; if subsequent tuning uses their outputs, they cease to be held out. These are selected educational examples, not an independent inspector-labeled field dataset.

Acceptance requires:

- Both known failures become usable observations without the incorrect cabinet label or an invented cause. An honestly unclassified stain is acceptable; falsely naming boxes as installed cabinets is not.
- The candidate does not reduce the number of usable observations on the six additional images and does not introduce unsupported findings on the three controls.
- Service failures, misses, object errors, unsupported claims, latency and token totals are reported separately. Request completion is not detection correctness.
- Follow-up questions are included in semantic review; a question can still presume an unproved cause.
- Retain the 75-second total photo deadline and at most two model calls. Do not silently substitute saved results, enlarge budgets until a run passes, or pick the best of repeated attempts.

Manual development review categories: usable observation/appropriate abstention, missed visible sign, wrong object/indicator, unsupported assertion, or unavailable output. Exact hidden cause, mold identity, wetness outside visible droplets/pools, code compliance, repair necessity and price cannot be established from these photographs.

## Sources and reproducibility

- [Google hosted Gemma controls](https://ai.google.dev/gemma/docs/core/gemma_on_gemini_api): `HIGH` enables thinking; `MINIMAL` disables it.
- [Google image understanding](https://ai.google.dev/gemma/docs/capabilities/vision/image): image observations and object recognition are model capabilities, not guaranteed inspection accuracy.
- [EPA educational image library](https://www.epa.gov/mold/mold-image-library), [archived source credits](https://19january2021snapshot.epa.gov/mold/mold-image-library_.html).

No fine-tuning or weight changes are involved.

## Second candidate, declared after the paired run

The HIGH candidate failed acceptance: it asserted staining from an ambiguous dark region on control EPA 93 (shadow not excluded) and misidentified storage shelving as a basement floor on EPA 99. Do not ship HIGH solely because the original two examples improved. Next evaluate the already-supported 31B model with MINIMAL thinking and the unchanged prompt on all ten images. This is now a development regression set, not held-out evaluation. Require both original failure cases recovered, no unsupported findings on all three controls, no reduction in usable observations, and no service failures. Keep the same budgets; retain all results regardless of outcome.

## Completed 26B comparison

[Raw results](../web/benchmarks/results/vision-comparison-2026-10-25T07-31-38-455Z.json), [manual development review](../web/benchmarks/results/vision-comparison-review.json). Both arms completed 10/10 extractions, one model call each, without service errors. This is not 100% detection accuracy. MINIMAL median/max latency: 3.55/6.47 seconds; HIGH: 31.40/68.26 seconds. Provider-reported total tokens: 27,099 versus 42,821 across ten cases per arm. Wall-clock run duration also includes pacing and host scheduling.

| Image | MINIMAL | HIGH |
|---|---|---|
| epa-17 | usable sign | usable sign |
| epa-32 | wrong object and indicator | usable generic sign |
| epa-29 | miss | usable sign |
| epa-89 | appropriate abstention | appropriate abstention |
| epa-24 | miss | partial: unsupported material |
| epa-71 | miss | miss |
| epa-26 | unsupported indicator | unsupported assertion |
| epa-88 | appropriate abstention | appropriate abstention |
| epa-93 | appropriate abstention | unsupported finding on control |
| epa-99 | miss | wrong object/location |

Decision: reject HIGH alone. This run used pipeline v4 before the neutral visual follow-up guard. Raw questions that presume moisture causes remain in the saved results. Final pipeline v5 replaces visual follow-up questions with a neutral verification question; it does not repair false descriptions. Historical diagnostic files predate per-row normalized image hashes; do not infer missing hashes or rewrite their results. The paired report field `totalPlannedRequests` denotes 20 logical extractions, not an upstream-call limit; recorded diagnostics confirm 20 actual calls. Future runners use clearer field names.

For the second candidate, nonregression means no loss against the original 26B MINIMAL arm: one usable positive sign (EPA 17) and three appropriate control abstentions. Partial observations with unsupported materials, wrong objects/indicators, unverified assertions and misses are not counted as fully usable. In addition, both original failure cases must become usable. The running second-candidate recorder inherits the original manifest split strings; those strings describe historical selection only. All ten cases are development for this second comparison. Future recorder output explicitly separates current and original split.

## Third candidate, declared after the 31B run

31B MINIMAL failed service reliability: only four of ten extractions returned output; four timed out and two returned PROVIDER_UNAVAILABLE. Do not ship it for the demo. Some observed elapsed times greatly exceeded the timer budget, consistent with host scheduling/suspension; this run does not isolate server latency and is retained in full. It also called pooled water persistent without temporal evidence.

Next evaluate 26B MINIMAL with a general visual-review instruction: identify the object before classifying, trace connections and boundaries, consider lighting/perspective alternatives, preserve uncertainty, and cross-check component/sign consistency. No fixture IDs, captions, expected labels or per-image rules are added. Same ten development images, same budgets and original MINIMAL acceptance baseline. All raw results, including failures, remain available.

## Final candidate, declared after the single-pass prompt run

The object-first single-pass prompt failed: it still called EPA 32 boxes and missed EPA 29, and it also lost the EPA 17 observation. It is rejected and removed from production.

The final candidate uses 26B HIGH to generate a provisional extraction, then a separate MINIMAL call to inspect the original images and check the untrusted draft. The second pass may remove, narrow or correct observations and check empty drafts. Only its validated result is returned. Two calls share the original 75-second deadline, with no extra photo retry or draft fallback. Text-only extraction retains MINIMAL and its existing correction/transient-error retry. This is a correlated same-model check, not independent expert verification.

Evaluate all ten development images again against the same baseline and criteria. Count any timeout, unavailable response, unsupported control finding or loss of a previously usable observation as a failure of the full acceptance gate. If this final candidate fails, retain only independently safe improvements and report the remaining detection limitation rather than weakening criteria.

## Final outcome and shipping scope

| Candidate | Decision | Recorded evidence |
|---|---|---|
| 26B HIGH, original prompt | Reject: recovered original signs but added an unsupported control finding | [20 paired extractions](../web/benchmarks/results/vision-comparison-2026-10-25T07-31-38-455Z.json) |
| 31B MINIMAL, original prompt | Reject: six service failures; the run cannot establish an intrinsic model-speed comparison | [10 extractions](../web/benchmarks/results/vision-candidate-2026-10-25T08-05-17-944Z.json) |
| 26B MINIMAL, object-first single-pass prompt | Reject: original errors remained and a previously detected sign was missed | [10 extractions](../web/benchmarks/results/vision-candidate-2026-10-25T08-36-27-787Z.json) |
| 26B HIGH draft → MINIMAL check | Reject: final output still described EPA 32 as cardboard boxes | [5 completed extractions before stopping](../web/benchmarks/results/vision-candidate-2026-10-25T08-40-47-730Z.json) |

The final run was stopped after acceptance had already failed, to avoid further calls. All five completed outputs are retained. The untested remainder is neither a pass nor a failure; no full-set metric is reported. The checked downspout observation succeeded, but that does not compensate for the misread wall photo. The rejected two-pass source is preserved as [nonexecuted experimental evidence](../web/benchmarks/results/rejected-two-pass-implementation.json); it is not loaded by the application.

Only the neutral visual follow-up guard and its regression test ship in application code. The existing model, condition prompt, image preprocessing, 40/75-second budgets, two-call cap and repaired-condition state guard remain unchanged. Unclassified or uncertain photos must not become automatic repair quotes. This does not make the current model dependable enough for an unattended inspection demo.

For the demo, use an inspection-report flow whose outputs have been reviewed and clearly label photo findings as experimental, or obtain better evidence before presenting photo detection as reliable. Do not replace a failed live call with an unlabeled saved result.

## Running future checks

From `web/`, with the ignored key configured:

- `npm run check` verifies code contracts, lint, types and production build; it is not a model-accuracy test.
- `npm run benchmark:vision` compares MINIMAL/HIGH on the current checked-out pipeline. It writes all results and requires a separate semantic review; runner completion is not an accuracy pass.
- `node --env-file=.env.local node_modules/vitest/vitest.mjs run --config vitest.benchmark.config.mts benchmarks/vision-smoke.bench.ts` runs explicit development regressions for the two photos and repaired leak through the actual configured adapter. This is expected to expose the unresolved photo failures; it is intentionally excluded from offline checks.

Future runs record their own prompt/pipeline versions and hashes. Historical result files describe earlier experimental code, not current defaults. The original four-image and new six-image selections are educational development evidence, not independent professional ground truth. Another prompt tuned against these images needs fresh evaluation images before any general accuracy claim.

## Final production verification

[Final live smoke](../web/benchmarks/results/vision-smoke-2026-10-25T08-47-37-710Z.json): all three requests completed. EPA 32 still returned boxes with a cabinet indicator (4.40 s); EPA 29 returned no finding (2.56 s); the resolved leak/dry intact cabinet returned no current repair finding (3.84 s). The visual finding's follow-up was replaced by the neutral question as intended. The smoke command correctly exited with failure because both photo regressions remain unresolved. Do not describe this as a passing detection test.

Final offline verification: 97 tests passed, lint/type checks passed, production build passed. Those results validate the shipped guard and application contracts, separately from the failing live vision regressions.
