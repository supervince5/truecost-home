# Detection benchmark

Two distinct evaluations run through the actual evidence-preparation, Gemma adapter, output validation and review pipeline. Neither trains model weights.

## Constructed text scenarios

[cases.json](../web/benchmarks/cases.json) contains 24 author-written scenarios grounded in technical references. They include positive indicators across property systems, six cross-system combinations, cosmetic-only and repaired-condition controls, missing information and prompt injection. They are not actual inspection reports or expert-labeled homes. Source IDs explain the technical rationale; those references do not independently certify our expected labels.

The scorer counts expected labels recovered, missed labels, unsupported extra labels, missing/unexpected relationships and lost coverage gaps. Provider/contract errors count as failed cases. A successful runner means the evaluation ran; it does not mean every detection case passed. Read the report.

Tag scoring does not validate free-text diagnoses, causal explanations, urgency, visual accuracy or prices. All model findings are saved for semantic review. Tests of the scorer include missed defects, invented tags, absent links, missing gaps and failed requests. This is a development benchmark rather than an independent, blinded holdout; do not claim an accuracy improvement over the previous prompt without a separate controlled comparison.

## Real educational photographs

[photo-cases.json](../web/benchmarks/photo-cases.json) tracks four EPA photographs, their URLs, credits, checksums, visible-observation expectations and prohibited inferences. The original bytes are checked before the application decodes and re-encodes them. Only the photo goes to Gemma; the source caption and expected answer do not. Three show visible issues; one is a control without an obvious moisture defect in that view.

These images are used under EPA's educational/presentation terms, not the repository MIT license. See [image attribution](../web/benchmarks/images/NOTICE.md). They are not Redfin houses. No address, owner, price, inspection history or confirmed repair bill is available. The original source descriptions can include knowledge unavailable from pixels; the benchmark must not demand that Gemma infer those hidden facts.

The photo runner saves findings for manual comparison. Four selected photographs cannot establish whole-house accuracy or performance on real estate listing photos. A separate set of permissioned property photos paired with professional findings and real quotes remains necessary before those claims.

## Run

Use Node 24.22.1, run `npm ci` in `web/`, and place the server-only key in ignored `.env.local`. Normal `npm test` is offline. These explicit commands use the provider and may consume quota:

```sh
npm run benchmark:live
npm run benchmark:photos
npm run benchmark:reliability
```

Run sequentially. Each case has the same extraction deadline (40 seconds text-only, 75 seconds with photos) and at most two model calls as the API. A malformed response can use the second call for correction; a confirmed provider HTTP 500/502/503/504 can use it after an abortable 800 ms delay. Both share the same deadline and call budget. Rate-limit errors are not retried. Text and photo cases are spaced by 31 seconds; provider limits and failures can still occur. To rerun one text case, set `BENCHMARK_CASE` to its ID before `npm run benchmark:live`. Every run is dated and records its selected case IDs and pacing. Full text suites use `latest.json`; filtered runs use `latest-subset.json` and a separate subset document. These are convenience copies, not a substitute for the original run.

Results include prompt/model versions, prompt and fixture hashes, token counts where available and latency. Failed requests may lack token accounting. Tokens are not dollars; no provider pricing or free-tier guarantee is assumed. Raw errors and credentials are never written. Avoid adding private reports to this committed benchmark: result files intentionally contain the public/synthetic model findings.

## Targeted demo reliability suite

`benchmark:reliability` repeats all four photos twice, checks seven resolved/historical/current text variations, and reruns roof, electrical and landscaping controls. It preserves each dated run, fails its process on failed automated cases, and never substitutes cached app results. Photo checks require an observation for positive examples and abstention for the control; descriptions and tags still require visual review. Cases are spaced by 21 seconds. This suite was developed against known failures and is not a held-out accuracy test. Current evidence and remaining limits are recorded in [demo reliability](DEMO_RELIABILITY.md).
