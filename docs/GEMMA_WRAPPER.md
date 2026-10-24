# Gemma wrapper

## Status and purpose

Implemented: a server-only hosted-Gemma adapter and `POST /api/analyze`, bounded evidence preparation, a versioned prompt, strict output validation, a shared two-call retry budget, and tests. Live text and image smoke checks succeeded; see [the recorded results](MODEL_SMOKE_RESULTS.md). The buyer-facing upload screen, PDF extraction, financial calculator, persistence and deployment are separate milestones.

This wrapper does **not** train or fine-tune weights. It guides a pretrained model using a checklist and examples, then checks the response. It cannot prove that an image interpretation is correct. Every accepted response has `reviewRequired: true` and every finding requires professional assessment.

The response includes source-backed review cards, coverage gaps and cross-system hypotheses. Every extraction declares conditionState (current, historical, resolved or unknown). Only current observations can create indicator cards or pattern candidates. Noncurrent observations remain context with empty indicator IDs and do not remove coverage gaps. Present damage after a repaired leak can still be current; the application never suppresses an entire property merely because one leak was fixed. See [whole-home research and costs](WHOLE_HOME_RESEARCH.md) and the [detection benchmark](DETECTION_BENCHMARK.md). The cost engine is separate from Gemma.

## Request path and files

```text
POST /api/analyze
  → content/origin/body/concurrency checks
  → strict evidence-only request schema
  → image decode, resize, metadata removal, server-assigned source IDs
  → hosted Gemma request with versioned condition prompt
  → JSON/schema/reference/page/quotation checks
  → at most one correction or bounded transient-server retry
  → observations, unassessed components, source records and usage metadata
```

| File under `web/src/` | Responsibility |
|---|---|
| `app/api/analyze/route.ts` | Node-runtime POST route |
| `server/analysis/handler.ts` | HTTP limits, same-origin browser checks, process-level admission and safe errors |
| `server/evidence/prepare.ts` | Evidence-only parsing, source IDs and actual image decoding |
| `server/model/provider.ts` | Provider interface, separate from orchestration |
| `server/model/gemma.ts` | Google GenAI adapter, fixed Google endpoint, allowed Gemma IDs, server-only key |
| `server/model/prompt.ts` | `whole-home-state-v4` researched whole-property checklist, examples and output schema |
| `server/analysis/extract.ts` | Deadline, bounded retry, attribution checks, review flag and usage |
| `lib/schemas/extraction.ts` | Request and output contracts without household financial fields |
| `lib/schemas/validate-evidence.ts` | Shared unique-ID, source-class, page and quote validation |
| `server/errors.ts` | Stable public errors without upstream bodies or credentials |

## Configuration and a live smoke test

From the repository root, copy `.env.example` to `web/.env.local` and set `GEMMA_API_KEY` to an existing Google AI Studio key. This local file is ignored by Git. Default model: `gemma-4-26b-a4b-it`; `gemma-4-31b-it` is also allowed. No Gemini fallback or arbitrary API URL is accepted.

Run `npm run dev` from `web/`, then in another terminal in `web/`:

```sh
curl --max-time 90 -X POST http://127.0.0.1:3000/api/analyze \
  -H 'Content-Type: application/json' \
  --data-binary @fixtures/model-smoke.json
```

The request is synthetic. A successful HTTP 200 includes validated findings, sources, unassessed components, `reviewRequired`, and metadata: requested model, returned model version (null if omitted by the provider), prompt/pipeline versions, attempt count, observed input/output/thinking/total token counts and latency. Provider total tokens include additional accounting that input plus visible-output tokens alone may miss. Unknown usage stays null. A smoke test proves connectivity and contract handling, not inspection accuracy.

The adapter asks for JSON in the prompt and validates it locally. It accepts either raw JSON or one complete surrounding JSON code fence; it never extracts a convenient substring from surrounding prose. It does not assume provider-enforced structured-output support. The SDK transport timeout is 40 seconds for text-only evidence or 75 seconds with photos. The outer deadline still covers all attempts together; it does not restart on retry. SDK transport retries and automatic continuation are disabled; blocked or truncated output, HTTP 429 and unclassified transport failures return an error without retry. Confirmed SDK HTTP 500/502/503/504 errors may receive one retry after an abortable 800 ms delay. That retry shares the same two-call budget and modality-specific deadline with output correction; failed-call usage stays unknown. A syntactically invalid or unsupported response gets at most one corrective attempt. No fixture replaces a failed request.

Google documents [hosted Gemma models, image input and system instructions](https://ai.google.dev/gemma/docs/core/gemma_on_gemini_api). SDK defaults and controls: [retry options](https://googleapis.github.io/js-genai/release_docs/interfaces/types.HttpRetryOptions.html), [generation configuration](https://googleapis.github.io/js-genai/release_docs/interfaces/types.GenerateContentConfig.html).

## Request contract and limits

```json
{
  "listingText": "Seller reports a heating system installed in 2006.",
  "property": { "yearBuilt": 1985 },
  "reportPages": ["Text extracted from report page one."],
  "images": [{ "mimeType": "image/jpeg", "data": "BASE64_IMAGE_BYTES" }]
}
```

All fields are optional, but at least one evidence source is required. Unknown or extra fields, including budget, income, savings, provider configuration and remote URLs, are rejected. Free-text documents can still contain personal information: users must remove it before upload; the schema is not a personal-data detector.

- HTTP JSON body: 10 MiB measured from actual streamed bytes, with a 10-second body-read timeout.
- Text: at most 16,000 combined characters; at most 20 report pages. Pages must already be text. Raw PDF/scanned-report processing is not implemented.
- Images: at most six, each 1 MiB decoded file bytes, JPEG/PNG/WebP, one frame, at most 4,096 pixels per dimension and 12 million total pixels. Files are decoded and re-encoded as JPEG, resized within 1,568 pixels, with metadata omitted. Fine print can be lost after resizing; use report text for detail-critical evidence.
- Output: at most 20 findings, 4,096 generated tokens per attempt, two attempts maximum. Source text/image limits bound input size; they are not an exact input-token quota.
- Inference deadline: 40 seconds for text-only evidence or 75 seconds when photos are present, shared by both attempts, separate from body reading and image preparation. Client cancellation is forwarded. Provider-side work may still be billed after client cancellation.
- Local process: two active requests and ten admitted requests per minute. This is a demo guard, not a distributed rate limit, per-user quota, or authentication system.

Image byte data is sent inline to the model and is not returned in the response or persisted by this app. The app does not log prompts, images, keys or raw provider errors. Provider retention/usage policies are separate; do not describe the flow as zero retention.

## Checks versus judgment

Checks reject fabricated IDs, incorrect report pages, invented quotes, incompatible evidence classes, duplicate findings, unexpected output fields and invalid JSON. Whitespace is normalized for quote checks; case and punctuation remain significant. Components absent from findings are added to the unassessed list.

These checks do not establish whether a statement is true, whether a quoted statement is actually an instruction, or whether a photo supports a diagnosis. The prompt asks for cautious observations, conflicts and abstentions; human evidence review remains necessary. No model result is an affordability decision or a contractor estimate.

A condition state is still a model interpretation, not semantic proof. The state gate prevents a resolved or historical label from becoming an active repair card; it cannot guarantee the model classifies every sentence correctly.

## Training and evaluation

See [the model development plan](MODEL_DEVELOPMENT.md). Automated tests exercise code with controlled model responses and the real SDK against a fake HTTP transport. They are not vision-accuracy tests. The [development benchmark](DETECTION_BENCHMARK.md) contains 24 constructed text scenarios and four attributed EPA photographs. Saved findings still require semantic review, and neither dataset establishes field accuracy. Do not report model improvement until the basic-prompt comparison and held-out review have actually run.

## Deployment and Firestore

In production, the route returns `DISABLED` unless `ENABLE_ANALYZE_API=true`. Enable it only behind private Cloud Run IAM or equivalent access controls; that environment flag is not authentication. Origin checks prevent ordinary cross-site browser calls, not direct abuse. Add distributed quotas before public deployment.

Firestore remains planned for scoped analysis records, source metadata and revisions; Cloud Storage remains planned for private media. Neither is called here. Server SDK access will require IAM and application-level ownership checks, retention/deletion tests and scoped access. Accounts are deferred. Budget changes should reuse reviewed findings in client state; no cross-user cache or persistent report URLs are implemented.
