# Live Gemma smoke checks

Run date: October 24, 2026. Synthetic evidence only. These are integration checks, not an accuracy benchmark.

| Check | Model | Attempts | Input tokens | Output tokens | Inference latency | Result |
|---|---|---:|---:|---:|---:|---|
| Listing text | gemma-4-26b-a4b-it | 1 | 1005 | 219 | 5.471s | HTTP 200, validated, review required |
| Synthetic equipment-label PNG | gemma-4-26b-a4b-it | 1 | 1280 | 196 | 6.732s | HTTP 200, validated, review required |

The image result described the installation year visible on the synthetic label and referenced `photo-1`. Roof and other unsupported systems remained unassessed. No private photographs or household finances were sent. `web/fixtures/model-equipment-label.png` is an original synthetic test asset under the project license.

Initial text requests were rejected because the model returned valid JSON enclosed in a Markdown code block. A regression-tested parser now accepts one complete JSON fence; surrounding prose, fabricated quotes and invalid references remain rejected. Results above are the subsequent successful runs, not a claim that every attempt succeeded.

Automated tests use controlled responses and a fake HTTP transport around the actual SDK; they do not consume the live API. A held-out model comparison and inspection-quality evaluation have not been run.

No model weights were changed. The configured key remains in ignored `web/.env.local`; no key or provider raw error is included here.
