# TrueCost Home — hackathon plan

October 24, 2026. Product and implementation specification. The application scaffold and initial contracts are implemented. The hosted Gemma wrapper has passed live synthetic text/image smoke checks. The buyer-facing analysis workflow, cost dataset, and program matcher are not yet implemented.

## Product decision

TrueCost Home helps first-time and budget-limited buyers explore the cost of owning a particular home before making an offer. It connects disclosed property facts and visible observations to transparent repair scenarios, cash needs, and assistance pathways.

**Pitch:** “A home can fit your mortgage budget and still exceed your ownership budget. TrueCost Home helps first-time buyers see possible repair costs, upfront cash gaps, and the monthly reality of ownership before making an offer.”

The primary user is a buyer browsing homes. A housing counselor is a potential review and distribution partner, not an assumed customer already committed to adoption.

The central output has three parts:

1. Estimated monthly ownership budget, shown as a range with assumptions.
2. Cash needed at closing and in the first months of ownership.
3. A five-year repair planning timeline with explicit unknowns.

The product must be able to say “not enough information.” It does not certify condition, predict exact failure dates, approve a loan, or determine final program eligibility.

## MVP: one home, one buyer, one supported locality

Recommended demo geography: Prince William County, Virginia, using clearly labeled illustrative property and household data unless a real listing and appropriately permitted media have been verified. Do not imply a fictional $185,000 house is a current local listing.

### 1. Intake

- Paste listing text; upload up to six supported image files or a bounded text-based inspection PDF. Preserve report page numbers and text spans. Scanned reports require explicit OCR support or an unsupported-input state.
- Enter property price, address or confirmed locality, year built, size, and property type.
- Optional system ages include a source: owner disclosure, inspection, readable label, or buyer estimate.
- Enter down payment, loan term, quoted or illustrative interest rate, closing costs, and relevant monthly ownership expenses.
- Enter monthly housing budget and total available purchase cash, including the down payment. Ask separately how much savings the buyer wants to protect after purchase.
- Assistance screening can request household size, program-defined income, ownership history, and location-related criteria. Keep these out of model prompts.
- Unknown is a valid input. Do not silently replace unknown insurance, HOA fees, or repair scope with zero.

Budget assumptions should include taxes, homeowners insurance, applicable mortgage insurance, HOA dues, utilities, and maintenance. The CFPB identifies taxes, insurance, utilities, maintenance, and major repairs as ownership expenses. [CFPB](https://www.consumerfinance.gov/ask-cfpb/what-are-some-of-the-financial-considerations-of-buying-a-home-en-119/)

### 2. Evidence preparation and focused Gemma extraction

Index listing text and report pages, retain original image/source IDs, and flag poor-quality or missing views. Use a reviewed checklist and examples for roof, HVAC, plumbing, electrical, and moisture. Ask separately for observations, reported findings, unresolved questions, and unassessed components.

Gemma returns structured observations and questions. Each observation links to an actual uploaded image ID or an exact text span. Validate these references and display the supporting material for user review; a valid reference alone does not prove that the interpretation is correct.

Example contract:

```json
{
  "observations": [
    {
      "id": "obs_1",
      "component": "ceiling",
      "description": "Visible dark discoloration",
      "evidence": [{"source_id": "photo_2", "kind": "image"}],
      "evidence_class": "visual_observation",
      "age_years": null,
      "needs_professional_assessment": true,
      "follow_up_question": "Has the cause been assessed, and is it still active?"
    }
  ],
  "unassessed_components": ["roof", "heating_system"],
  "disclosed_facts": []
}
```

Allowed evidence classes: `disclosed_fact`, `reported_inspection_finding`, `visual_observation`, and `user_assumption`. Missing or ambiguous evidence is represented explicitly, not assigned a fabricated confidence percentage.

A ceiling stain does not establish that the roof needs replacement. A clean-looking room does not establish absence of hidden damage. Photos do not determine asbestos or lead presence. Age-related guidance can prompt assessment questions without creating a confirmed remediation charge. [EPA asbestos guidance](https://www.epa.gov/asbestos/protect-your-family-exposures-asbestos), [EPA lead guidance](https://www.epa.gov/lead/how-can-i-tell-if-my-home-contains-lead-based-paint)

### 3. Validation, evidence review, and repair planning

Validate outputs with shared Zod schemas. Check source IDs, page bounds, and exact report quotations with documented whitespace normalization. Flag conflicting facts and unsupported certainty. Valid JSON or a matching quotation does not establish that the interpretation is correct; keep visual claims reviewable and uncertainty explicit.

The buyer confirms or corrects material facts before the budget result is finalized. The interface distinguishes:

- Reported repairs supported by an inspection or qualified assessment.
- Conditional scenarios that need a diagnosis or scope confirmation.
- Age-based planning allowances with adjustable timing windows.
- Unassessed components that are not priced as zero.

Start with a small, researched set of repair categories. Each cost record needs scope, unit, quantity assumptions, geography, low/central/high values, exclusions, source URL, source date, and permission or license notes. A contractor quote can replace a benchmark while preserving its provenance.

Do not invent a statewide cost multiplier. If local evidence is unavailable, label the benchmark's geography and limitations. Cost ranges are planning ranges, not statistically calibrated confidence intervals. Component lifespan references may inform scenarios; they do not predict an individual item's remaining life.

Priorities are: safety-related concern requiring assessment, prevents further damage, and optional improvement. Rank using reviewed criteria and confirmed facts. Do not recommend unsafe delay solely to make a budget fit.

### 4. Deterministic TypeScript cash-flow engine

Implement pure TypeScript functions independent of Next.js and Gemma. Use integer cents or documented decimal arithmetic and rounding. Model outputs never supply authoritative financial calculations.

For a fixed-rate loan, use principal `P`, monthly interest rate `r`, and payment count `n`:

`M = P * r * (1+r)^n / ((1+r)^n - 1)`

Handle zero interest as `M = P/n`; handle no loan as zero payment. Validate amounts, units, term, and down payment. Avoid double-counting financed fees already included in principal.

Use loan-specific insurance and fee inputs. A single generic PMI percentage must not stand in for conventional PMI, FHA mortgage insurance, and VA-related fees. For the first build, accept entered amounts from a loan estimate or mark them as illustrative assumptions.

Let `C` be total available purchase cash, `D` down payment, `K` upfront closing costs, `E` the protected savings amount, and `U` immediate cash-funded repair costs:

`initial_available_repair_balance = C - D - K - E - U`

Subtract any other explicitly modeled upfront expense once. Treat a negative initial result as an immediate cash shortfall.

Let `B` be the buyer's monthly housing budget and `O_t` the month's mortgage, tax, insurance, utility, HOA, and non-overlapping routine maintenance expenses. Define available monthly repair contribution as `A_t = B - O_t`. A negative contribution already indicates that recurring expenses exceed the stated budget.

`repair_balance_t = repair_balance_(t-1) + A_t - cash_funded_repairs_t`

Run low-cost/later, central, and high-cost/earlier scenarios as named assumptions, not probabilities. Show the first negative month and its shortfall. Never assume grant receipt, seller concessions, or new debt in the baseline.

For a constant monthly contribution, a planning estimate sufficient to avoid a negative repair balance is:

`required_contribution = max(0, max over t=1..60 [(cumulative_repairs_through_t - initial_available_repair_balance) / t])`

An immediate shortfall remains separate: future monthly contributions cannot fund work due at closing. Display the required contribution alongside the contribution the buyer's stated budget permits.

The simple `sum(repairs)/60` value can appear as an average planning allowance, but it is not an affordability determination. Separate recurring cash outflow from a transfer into repair savings. Do not count both the reserve transfer and the eventual repair bill as two economic costs in the same five-year total.

For financed-repair what-ifs, put proceeds in a restricted repair-funding bucket and add required debt service and fees. Do not count both the financed repair principal as an immediate cash expense and the loan repayments as if both were independently paid. Full rehabilitation-loan underwriting is outside the MVP.

### 5. Result and assistance routes

The rules engine returns separate flags for missing material information, monthly budget overrun, immediate cash shortfall, and later cash shortfall. The UI shows all applicable flags. Use “Within your stated budget under these assumptions” only when material inputs are sufficiently specified and the modeled plan fits; disclose which scenarios still fail.

Do not collapse missing information into a reassuring green verdict. A house may fit the central scenario and fail the earlier-repair scenario.

Seed three assistance routes, each with source, last-checked date, use of funds, geography, screening criteria, unknown criteria, and intake/funding status:

| Route | Role in the MVP | What remains unverified |
|---|---|---|
| FHA 203(k) | Explain purchase-plus-rehabilitation financing | Borrower, property, project and lender approval; actual terms |
| Virginia Housing assistance | Explain eligible purchase-assistance options | Applicable loan product, current limits, education and other requirements, availability |
| Prince William area First-Time Homebuyers Program | Explain local down-payment/closing-cost assistance | Residency/employment, ownership history, income and property rules, intake and funds |

These are separate options, not an automatically compatible funding stack. The sources confirm program descriptions, not the demo buyer's eligibility or live funding availability. [HUD 203(k)](https://www.hud.gov/program_offices/housing/sfh/203k/203k--df), [Virginia Housing](https://www.virginiahousing.com/homebuyers/loan-grants), [Prince William program](https://pwcaws.pwcva.gov/department/housing-community-development/First%20Time%20Homebuyers%20Program)

Down-payment assistance is not a repair grant. It can affect cash allocation only in an explicit, clearly conditional scenario with the applicable rules. HUD income-limit geography and program-specific income definitions matter; ZIP alone is not a complete eligibility test. [HUD income limits](https://www.huduser.gov/portal/datasets/il.html/)

### 6. Plain-language explanation

The second model call explains a fixed set of computed facts and findings. It cannot set the result label, invent amounts, promise aid, or change timing. Prefer structured explanation blocks referencing fact IDs; render financial amounts from trusted data. A summary validation failure falls back to deterministic templates.

Finish with targeted questions for the inspector, lender, or program administrator. The most useful question is often what missing information could change the budget conclusion.

## Model, architecture, and track

The event description identifies Saturday, October 24 tracks for open-source/open-weight AI and Gemma 4, and Sunday, October 25 tracks for Gemini API, AI Agent, and Housing. Use the applicable submission rules; do not assume simultaneous eligibility or cross-day reuse rules from cloud hosting alone.

**Recommended Saturday target: Best Use of Gemma 4.** Google lists Gemma 4 models including E2B, E4B, 12B, 26B A4B, and 31B; the model card lists Apache 2.0 and image input. [Gemma 4 model card](https://ai.google.dev/gemma/docs/core/model_card_4)

First milestone: successfully send a representative image and text request to the intended provider, validate the response, and record the exact model ID, provider, license, latency, and usage. The authenticated hosted endpoint has passed the synthetic checks recorded in MODEL_SMOKE_RESULTS.md; broader capability and accuracy evaluation remains pending. Google documents model listing and metadata retrieval; an AI Studio key or a Gemini-branded SDK is not proof that the actual model called is Gemma 4. [Google Models API](https://ai.google.dev/api/models)

Selected architecture:

`Next.js UI and Route Handlers on Cloud Run → evidence preparation → focused Gemma extraction → validation → review/correction → sourced costs and rules → TypeScript cash-flow engine → evidence-linked results`

Use one Next.js + TypeScript application, shared Zod schemas, and a bounded request pipeline. No FastAPI, Python backend, or Paperclip is needed for the selected scope. See [the architecture guide](ARCHITECTURE.md) for endpoint contracts and component responsibilities.

Google Cloud services: Cloud Run hosts the application; private Cloud Storage holds uploads and derivatives; Firestore holds scoped analyses and revisions; Secret Manager holds server-only model credentials. Use the Cloud Run service identity and least-privilege permissions, not committed service-account files.

Keep Gemma behind a provider adapter. Verify the actual hosted endpoint with image and text inputs before relying on it. Google documents Gemma access from JavaScript and Python. Hosting our application on Cloud Run does not deploy model weights. Self-hosted GPU inference and fine-tuning are deferred. [Gemma API documentation](https://ai.google.dev/gemma/docs/core/gemma_on_gemini_api)

Cache expensive extraction by authorized session, evidence hashes, model version, and prompt version. Budget changes rerun calculations without reanalyzing evidence. Limit file sizes, PDF pages, image counts, tokens, concurrency, and retries. Malformed output gets at most one repair retry followed by a visible failure state.

Start with bounded synchronous extraction. If measured document processing requires asynchronous execution, use Cloud Tasks with a protected worker endpoint, durable Firestore job state, and idempotency. Do not rely on untracked work continuing after a Cloud Run request ends.

Use small versioned JSON datasets for costs and program rules, each with provenance and verification dates. Private upload expiration and deletion must cover originals, derivatives, caches, and persisted records. Model-provider retention is a separate policy to disclose.

## Privacy and trustworthy behavior

- Keep income, household information, budget, and savings out of model requests. Minimize retention and analytics.
- Listings and uploads are untrusted data, never instructions. Do not give the model arbitrary browsing or external action permissions.
- Validate image file types and sizes, isolate sessions, protect object access, and strip unnecessary metadata.
- Define and test deletion of uploaded files, derivatives, caches, and persisted analysis records. Disclose provider retention separately. Do not claim “deleted after analysis” until failure and retry paths are covered too.
- Keep any optional grant-screening eligibility attributes separate from house-condition and affordability calculations. No neighborhood desirability or demographic scoring.
- Allow corrections; preserve the source and revision behind each result.
- Use consented, appropriately licensed, or clearly synthetic demo media. Cached results and recorded demonstrations are explicitly labeled.

## Competition and claims

Spectora already markets AI report writing; RentCheck markets AI damage review; Repair Pricer markets inspection-report estimates. These offerings undermine broad “nobody does AI repair analysis” claims but do not settle whether TrueCost's complete workflow is differentiated. [Spectora](https://www.spectora.com/), [RentCheck](https://www.getrentcheck.com/plan-pricing), [Repair Pricer](https://www.repairpricer.com/howitworks/)

The hypothesis to validate: buyers benefit from a before-offer workflow that combines evidence-linked condition scenarios with cash timing and relevant assistance routes. Do not claim verified foreclosure reduction, superior accuracy, replacement of professional inspection, investor-equivalent knowledge, or guaranteed savings.

## Build milestones

Use completion gates rather than assumptions about team size or hours remaining:

1. **Model proof:** one real image request, validated structured response, exact model recorded.
2. **Financial engine:** one synthetic property and household, correct recurring costs and cash timing, no model required.
3. **Thin flow:** upload → source indexing → focused extraction → validation → review → sourced scenario → cash shortfall → explanation.
4. **Source-backed data:** a small cost table and three assistance routes with dates and explicit unknowns.
5. **Verification and UI:** evidence links, corrections, failed requests, missing-data states, narrow/mobile screens.
6. **Pipeline evaluation:** compare the basic prompt and complete pipeline on the same held-out cases; publish observed results and limitations.
7. **Cloud deployment:** Cloud Run application, private Storage, scoped Firestore records, Secret Manager, session-isolation and deletion checks.
8. **Demo freeze:** record a labeled backup, verify every shown source and assumption, rehearse.

Defer scanned-report OCR and complex PDF layouts, chat, nationwide coverage, autonomous program browsing, custom valuation, and commercial-property workflows. Two-home comparison is the first stretch feature after the single-home flow works.

## Evaluation and acceptance criteria

Financial fixtures must cover zero interest, no loan, budget below recurring costs, immediate repair needs, late repair needs, a cash cushion, missing costs, changed timing, and avoiding double-counting funded repairs.

Compare a basic single prompt against the full pipeline using the same model version and held-out cases. Record raw extraction quality and final user-visible errors separately; validation can suppress an error without improving recognition. Do not claim improved accuracy until the comparison supports it.

Model fixtures must include a text-based report with known page references, an unsupported scanned report, conflicting disclosed ages, a blurred image, absent roof view, ambiguous staining, a readable equipment label, a misleading listing claim, and instruction-like text in an upload. Expected behavior includes abstention, correct evidence attribution, and targeted questions. A small fixture set does not establish field accuracy.

Program fixtures must include a buyer who is not an owner occupant for Section 504, an unknown funding status, a jurisdiction mismatch, missing household criteria, and an unverified grant that must not improve the baseline budget.

Report actual extraction validity, evidence attribution review, false findings, missed observations, correction rate, latency, token usage, and duplicate-cache behavior. Track which cases were held out from prompt tuning. Exact system-age guesses and unsupported hazard diagnoses count as failures, not impressive detections.

For a later counselor pilot, measure comprehension of cash gaps and repair uncertainty, task completion time, and professional review agreement. A change in purchase decision alone is not proof of a better decision.

## Three-minute demonstration

1. **Buyer and home:** introduce an explicitly illustrative household, listing, budget, and cash after planned closing costs.
2. **Actual AI:** analyze permitted photos and listing text; show real evidence links and an unknown roof condition.
3. **Review:** confirm a disclosed system age; explain that it informs a planning scenario, not a predicted failure date.
4. **Reveal:** show a monthly budget that appears manageable alongside an early repair cash shortfall.
5. **What changes the answer:** add a quote or change available savings and recompute without another vision call.
6. **Assistance:** show a relevant route, unresolved requirements, and unchanged baseline until funding is confirmed.
7. **Close:** “Know the repair uncertainty and cash demands before making an offer.”

Never say “Maria qualifies” on the basis of this prototype. Never silently replace a failed model request with a fixture. Record whether each element was live, cached, illustrative, manually curated, or mocked.

## README and unresolved prerequisites

Include setup, architecture, exact model/provider, code/model/data licenses, data provenance, retention behavior, evaluation results and limits, demo fixtures, and live-versus-mocked disclosure.

The Gemma 4 text/image endpoint is verified by synthetic smoke checks. Still required for an operational buyer workflow: sourced and reusable local cost records; program rules and intake verification; demo media rights; and run results for the specified acceptance checks. The hosted model API uses an existing Google AI Studio project. No GPU, app storage service, or application deployment has been provisioned.

## Foundation implementation status

The Next.js scaffold and initial shared contracts are implemented. See [the demo specification](DEMO_SPEC.md) and [Gemma wrapper implementation plan](GEMMA_WRAPPER.md). Firestore remains the chosen persistence service; persistence and accounts are deferred until after the first working analysis flow. The Gemma wrapper and analysis API are implemented; the calculator, storage and cloud deployment remain unimplemented. Current code uses camelCase fields; earlier JSON examples in this document are conceptual rather than exact wire contracts.
