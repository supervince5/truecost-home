# How the model improves

## What we are doing now

We use a pretrained Gemma model through Google's API. Its weights are unchanged. `server/model/prompt.ts` supplies a researched library of 49 condition indicators across 27 property-system categories and examples at request time (in-context guidance). The wrapper validates the model's output and asks once for corrected extraction if needed. This improves enforceable structure and evidence attribution; it does not, by itself, demonstrate improved visual recognition.

Example: if a photo contains a stain, the desired response describes discoloration and asks for an assessment. It must not jump straight to a mold diagnosis or a roof-replacement estimate. Financial calculations and cost records belong in separate deterministic code and sourced datasets.

## Next: evaluate before claiming an improvement

1. Collect consented or licensed examples: clear and blurred photos, missing views, readable labels, normal surfaces, ambiguous defects, and text-based reports.
2. Have an inspector review observable findings, supported evidence, unknowns and useful follow-up questions. Keep disagreements visible. An LLM labeling its own answers is not ground truth.
3. Keep development examples separate from held-out evaluation properties. Split by property/report rather than individual image so the same house cannot leak across groups.
4. Run a basic prompt and the complete wrapper with the same model on those held-out inputs. Record raw responses separately from accepted findings; rejecting a bad output is different from recognizing the image better.
5. Report false unsupported findings, missed visible findings, evidence attribution, correct abstentions, correction rate, latency, usage and failures. Show counts and denominators; a tiny test set is not field validation.

The [development benchmark](DETECTION_BENCHMARK.md) now includes 24 constructed report scenarios and four licensed educational photographs with source manifests. Live results are recorded separately from offline code tests. These author-designed scenarios are not independent expert ground truth, and no controlled before/after improvement has been demonstrated. Automated unit tests prove specific code behavior, not the model's inspection skill.

## Fine-tuning, if evidence warrants it later

Fine-tuning actually changes weights. If evaluation reveals repeatable failures that prompts and evidence preparation cannot resolve, build a reviewed, licensed training dataset and a separate validation/test split. Use a supported Gemma training workflow, investigate parameter-efficient adapters such as LoRA, and compare the tuned model against the same baseline. Hosting a tuned checkpoint would be a separate inference/deployment decision; this hosted adapter does not automatically fine-tune or serve custom weights.

For the hackathon, spend effort on evidence quality, a useful buyer workflow and measured validation. Do not claim that we trained a home inspector or can replace on-site assessment.

References: [Gemma tuning guidance](https://ai.google.dev/gemma/docs/tune), [hosted Gemma API](https://ai.google.dev/gemma/docs/core/gemma_on_gemini_api).
