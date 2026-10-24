# Demo reliability

## Changes made

- Photos receive a 75-second overall inference deadline; text-only requests retain 40 seconds. The SDK uses the matching modality limit so it cannot prematurely cut off a photo at 40 seconds. At most two model calls share the overall deadline, including correction and one transient-server retry. Client cancellation still stops waiting. This fixes retries being cut off by the text-sized deadline; it does not guarantee provider availability.
- Images precede their source-ID mapping and text evidence. The prompt contains concise researched signs; detailed alternatives, verification and citations are attached by the server.
- Every extraction explicitly labels its condition as current, historical, resolved or unknown. Only current observations can create indicator cards or pattern candidates. A repaired leak with a dry, undamaged cabinet must not generate active leak/damage tags. Remaining swollen wood or a separate current leak is still reportable.
- Historical, resolved and unknown findings do not close current-condition coverage gaps.
- Generic wall staining and disconnected downspouts have distinct researched indicators; uncertain materials can remain unclassified observations.
- Rate-limit responses remain explicit and are not retried. Usage metadata includes provider total and thinking-token counts when supplied. Failed-call usage stays unknown.

Condition state is a model judgment. The server enforces the state-to-card rule, but cannot guarantee the model always chooses the correct state or observes every defect.

## Verification

The final local check passed lint, TypeScript checking, 96 automated tests and a production build. Tests cover the repaired-leak state gate, retained damage after repair, coverage gaps, source attribution, pricing rules, SDK errors, retry limits, cancellation and photo/text deadlines. These controlled tests do not measure vision accuracy.

The live reliability suite runs four attributed EPA photographs twice, seven repaired/historical-condition regressions and three existing roof/electrical/landscaping positive cases. No photo captions or expected answers are supplied to the model. Each request uses the application pipeline and cases are paced sequentially. Photo acceptance is checked automatically; observation correctness requires a separate visual review.

### Live runs, including failures

| Run | Configuration | Observed result |
|---|---|---|
| [Initial targeted suite](../web/benchmarks/results/reliability-2026-10-24T22-20-54-036Z.json) | 26B, prompt v3, state-gate pipeline v2, 7-second pacing | 14/18 passed the original automated checks. Those photo checks only required an accepted response and were too weak: the model missed visible signs in EPA 32/29 and assigned a cabinet label to exposed wall material. This is not 14 correct interpretations. Remaining cabinet damage, a separate current leak and a residual ceiling stain were correctly retained; the original repaired-cabinet case had a provider failure. |
| [Interrupted deadline diagnostic](../web/benchmarks/results/reliability-interrupted-2026-10-24T22-26-33-035Z.json) | 31B, prompt v4, old 40-second total deadline | First photo timed out following an HTTP 500. Stopped to fix the shared photo deadline; one completed case, not a full run. |
| [Larger-model comparison](../web/benchmarks/results/reliability-stopped-2026-10-24T22-28-46-790Z.json) | 31B, prompt v4, pipeline v3, 21-second pacing | Eight photo attempts: four accepted, three exhausted server-error retries, one hit the SDK's separate 40-second limit. The original repaired-cabinet case then passed. Stopped after these nine cases because the larger model had not made photo service dependable; nine other planned text cases were not run. |
| [Final repaired-leak regression](../web/benchmarks/results/2026-10-24T22-38-39-450Z.json) | Configured 26B, prompt v4, final pipeline v4 | 1/1 passed: no findings or active repair tags for the explicitly repaired leak and dry, undamaged cabinet. About five seconds; 2,538 provider total tokens. This targeted regression is not whole-house accuracy. |

In the larger-model comparison, EPA 17 produced a plausible generic wall-stain observation twice (72.7 and 62.8 seconds), EPA 29 correctly described the disconnected downspout once (36.1 seconds), and EPA 89 appropriately returned no findings once (32.2 seconds). The stain follow-up question assumed moisture as its cause; that cause was not established by the image. Source-backed alternatives still explicitly retained uncertainty. This was a development visual comparison, not an independent inspector's review.

The SDK's premature 40-second photo cutoff was subsequently reproduced with a fake transport returning at 50 seconds. The regression failed before the SDK limit change and passed afterward. The outer 75-second limit still covers both attempts together.

The default remains `gemma-4-26b-a4b-it`. The larger-model comparison does not justify a default change or a reliability claim. All dated runs, including failures and interrupted diagnostics, remain in `web/benchmarks/results/`. No failed call is replaced by a cached success.

### Final photo check

[Final dated run](../web/benchmarks/results/photos-2026-10-24T22-39-00-972Z.json): configured 26B, prompt v4, pipeline v4, 31-second pacing. **All four requests completed on their first attempt with no timeouts.** This is request completion, not four correct interpretations.

| Photo | Latency | Development visual comparison |
|---|---:|---|
| EPA 17: wall/ceiling staining | 4.36 s | Reported visible ceiling staining. Broadly consistent with the image; the follow-up question assumes a moisture cause that the photograph cannot confirm. |
| EPA 32: marked exposed wall materials | 4.48 s | Incorrectly described cardboard boxes and attached `cabinet_water_damage`. Wrong object/system and unsupported repair indicator; do not present this as correct detection. |
| EPA 29: disconnected downspout | 2.68 s | Returned no findings. Missed the visible disconnection; no finding is not proof of good condition. |
| EPA 89: lined crawlspace control | 2.59 s | Returned no findings and retained unassessed systems. Reasonable abstention for this limited view. |

The provider reported 10,907 total tokens across these four requests; billed cost was not measured. Four examples do not establish uptime, latency distribution, whole-house vision accuracy or scaling costs. The repaired-condition regression and application timeout fixes pass, but **unreviewed photo detection is not ready to be presented as dependable**. Use a clearly labeled, reviewed demonstration and show the evidence/uncertainty; retain the visible misses and all service failures in evaluation records.

## Reproduce

From `web/`, with a server-only key in ignored `.env.local`:

```sh
npm run check
npm run benchmark:reliability
```

Live benchmarks contact the provider and may consume quota or incur charges. A failed case makes the benchmark exit unsuccessfully and remains in its saved JSON. Never combine overlapping development runs into an independent accuracy score.

For a recorded demonstration, label recorded results as recorded and retain the request, model/prompt/pipeline versions and limitations. A provider failure must appear as unavailable, never as a clean inspection.
