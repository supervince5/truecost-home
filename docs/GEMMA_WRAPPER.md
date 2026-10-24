# Gemma wrapper: the next implementation milestone

## What the wrapper does

The wrapper is our server-side code around the hosted Gemma model. A prompt is one part. The rest controls which evidence reaches the model, how responses become validated observations, how errors are handled, and what the UI is allowed to display. It is not fine-tuning and it does not automatically make the model better at detecting defects.

Status: planned. Steps 1–3 implement shared evidence contracts; no provider is called yet. Before integration, verify the actual account-accessible model ID and its image/structured-output support. Do not silently substitute Gemini and describe it as Gemma.

```text
Browser: listing/photos/report + property facts
  → POST /api/analyze (server-only request validation and limits)
  → prepare sources (IDs, image checks, numbered report text)
  → focused condition checklist + evidence
  → Gemma provider adapter (timeout, token cap, usage tracking)
  → parse response + validate extraction schema
  → validate evidence references, pages and quotes
  → return observations + unknowns for buyer review

Reviewed findings + buyer-entered budget
  → sourced repair scenarios + deterministic TypeScript calculator
  → result with explicit evidence and assumptions
```

## Where it will live

| Planned file | Responsibility |
|---|---|
| `web/src/app/api/analyze/route.ts` | Validate the request, enforce limits, call the pipeline, return stable error codes. No provider secrets reach the browser. |
| `web/src/server/model/provider.ts` | Server-only adapter interface and provider configuration. Return raw content plus actual model ID, usage, and latency. |
| `web/src/server/model/gemma.ts` | Hosted Gemma SDK call. Use verified capabilities; structured JSON is still validated even when the provider supports a schema. |
| `web/src/server/model/prompt.ts` | Versioned inspection checklist, examples, allowed evidence classes, uncertainty instructions, output format. |
| `web/src/server/evidence/prepare.ts` | Bound inputs and build source IDs/page text. Reject unsupported files; do not fetch arbitrary listing URLs. |
| `web/src/server/analysis/extract.ts` | Assemble evidence-only request, parse/validate response, check references, enforce retry budget. |
| `web/src/lib/schemas/extraction.ts` | Separate extraction request/result contracts. These exclude household income, savings and budget. |
| `web/tests/model/` | Small evaluation set with expected observations, unknowns and evidence attribution. |

These are planned paths, not empty placeholder modules. The existing shared contracts will be reused where appropriate. Put `import "server-only"` in provider and secret-reading modules. Use a local ignored `web/.env.local` during integration and Google Secret Manager on Cloud Run later. No key is needed for today's scaffold.

## Bounded pipeline behavior

1. Validate image signatures, decoded dimensions, counts and bytes before inference. Bound report pages and text length; scanned PDFs remain unsupported until OCR is implemented.
2. Assign source IDs in our code. Send listing/property evidence only. Treat instruction-like text inside documents as data, never as authority.
3. Ask for visible observations, reported facts, missing views, and follow-up questions. Age is not a diagnosis; discoloration is not proof of mold. No exact remaining-life claims.
4. Validate the output with Zod and check that every source ID, page and quoted passage exists. Report structural errors separately from interpretation uncertainty. A valid reference does not prove the claim.
5. Permit at most one corrective retry for invalid output, within one request deadline and token budget. Otherwise return an explicit failure. No silent synthetic replacement. Add transport retry rules only within that same bounded attempt budget.
6. Show findings and evidence for user correction. Calculate money and choose result flags in TypeScript, never by trusting model arithmetic or a model's verdict.
7. Track request ID, model/prompt versions, latency, usage and error category without logging raw private inputs. Reuse validated extraction within the active session when only budget values change.

## How we measure whether it helps

First prove one real image/text request. Then compare a simple prompt with the full pipeline using the same model and held-out examples: missing roof view, ambiguous staining, blurred photo, readable equipment label, quoted inspection, contradictory facts, and embedded instructions. Measure false claims, missed findings, attribution errors, abstentions, user corrections, latency and tokens. Validation may catch errors without improving recognition; report those separately.

## Firestore boundary

Firestore will hold scoped analysis records, source metadata and revisions once saving is implemented. Cloud Storage holds private media. Keep persistence behind server-only repository functions such as `saveAnalysis` and `loadAnalysis`; do not expose unrestricted collection reads to the browser. Before saving real data, implement session ownership/access checks, least-privilege IAM, deletion/retention behavior and tests. Server SDK access relies on IAM and application authorization, not browser Firestore rules. User accounts may follow later; skipping accounts does not mean allowing public access to saved reports.

For now: in-memory demo state, no database calls, no Firestore SDK, and no durable report URLs. This is staged implementation of the chosen architecture, not a database change.
