# Build roadmap

Status: foundation steps 1–3, the bounded Gemma wrapper, a whole-property indicator library and a sourced repair-cost API are implemented locally. The repaired-condition state gate and aligned photo deadlines are implemented and regression-tested. Live development runs include successes, provider failures and visual misses; see [demo reliability](docs/DEMO_RELIABILITY.md). Financial calculations, buyer-facing review screens, persistence and deployment remain planned.

## 0. Understand and agree

Read the architecture guide. Agree together on the initial user journey, budget semantics, and first demo scenario before implementation.

## 1. Build the Gemma wrapper and prove the model path

Implemented: [the wrapper](docs/GEMMA_WRAPPER.md), server adapter, evidence preparation, output validation, request limits and bounded retry policy. Remaining: measured held-out model evaluation and buyer-facing evidence review.

Send one representative image and listing excerpt to an actual Gemma 4 endpoint. Record the exact provider, model ID, supported request format, response, latency, and usage. Validate structured output and failure handling. Do not substitute a Gemini call and label it Gemma.

Acceptance: one successful, inspectable image analysis with real evidence references; unavailable or malformed responses remain explicit.

## 2. Build and test the cash-flow engine

Implement pure TypeScript calculations against synthetic fixtures before wiring the UI.

Acceptance: zero-interest mortgage, no loan, immediate shortfall, late repair, protected cash, monthly budget overrun, missing material costs, and unapproved assistance cases behave as documented.

## 3. Agree on API contracts

Initial property, budget, finding, source-reference, reviewed-analysis, extraction and result contracts are implemented in `web/src/lib/schemas/`. Remaining work: full timeline scenarios and route/UI integration. `/api/analyze` and `/api/estimate` are implemented.

Acceptance: invalid or missing material fields are rejected or represented as unknown; the same sample payload works for frontend and backend development.

## 4. Build evidence preparation and one end-to-end flow

Support listing text, bounded photos, and text-based inspection PDFs with preserved page numbers. Scanned PDFs remain explicitly unsupported until OCR is implemented.

Intake → prepare evidence → focused Gemma extraction → validate references and claims → review/correct → sourced scenarios → deterministic calculation → evidence-linked result.

Acceptance: adjusting savings updates the cash gap without a new image-analysis call; source evidence can be opened; an unobserved roof remains unassessed.

## 5. Add sourced costs and assistance routes

Implemented: 15 published planning scopes, source dates and exclusions, explicit geography/fallback checks, unknown-cost handling and an estimate API. See [research and costs](docs/WHOLE_HOME_RESEARCH.md). Assistance matching and broader price coverage remain planned.

Create a small versioned dataset for the chosen locality. Record scope, units, dates, sources, exclusions, and unknown eligibility criteria.

Acceptance: every displayed cost and program statement has provenance; no unapproved funding improves the baseline.

## 6. Evaluate the pipeline

Implemented: a reproducible development benchmark with 24 constructed text cases, four attributed educational photographs and saved live outputs. See [results and limitations](docs/DETECTION_BENCHMARK_RESULTS.md). Independent professional annotation and a controlled basic-prompt comparison remain outstanding.

Compare a basic prompt with the full pipeline on the same held-out fixtures and model version. Review correct findings, misses, unsupported claims, evidence attribution, abstentions, latency, and model usage. Keep prompt-development examples separate and report both raw and user-visible errors.

Acceptance: results are reproducible and limitations are published; do not claim improved inspection accuracy without measured evidence.

## 7. Deploy on Google Cloud

Package Next.js for Cloud Run. Configure private Cloud Storage, scoped Firestore records, and Secret Manager access using a least-privilege service identity. Add Cloud Tasks only if measured processing duration requires a durable job flow. Set request limits and verify deletion and session isolation.

Acceptance: a deployed end-to-end analysis works; secrets stay server-side; another session cannot read the analysis; budget edits do not call the model again.

## 8. Prepare the demonstration

Polish mobile layout, failure states, evidence review, privacy behavior, and the cash-timing reveal. Record a labeled backup demonstration. Publish measured checks and exact model usage in the README.

Acceptance: a rehearsed three-minute story clearly distinguishes observed facts, planning assumptions, manually curated data, cached responses, and live model work.

## Later

Two-home comparison, scanned-report OCR, saved counselor reports, multilingual review, and broader geographic coverage. No stretch feature takes priority over a correct single-home flow.
