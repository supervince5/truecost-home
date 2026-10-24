# Demo specification and foundation contracts

## Story

“Can I afford to own this home, not just buy it?” A buyer sees a manageable monthly payment, reviews condition evidence, then discovers that a repair due immediately exceeds the cash left after closing. Changing available cash should update the result without another model call.

All three fixtures in `web/fixtures/` are synthetic. They are not live listings, real local prices, contractor estimates, or model responses. The zero-interest loan is intentionally artificial so the expected arithmetic is independently checkable.

## Hand-computed examples

Shared inputs: $180,000 price; $18,000 down payment; $162,000 loan at 0% over 360 months gives $450/month. Monthly tax $200, insurance $100, mortgage insurance $0, HOA $0, utilities $200, and routine maintenance $50 produce $1,000 recurring ownership costs. The $1,300 housing budget leaves $300/month for repairs. Closing costs are $4,000 and protected savings are $2,000.

| Fixture | Purchase cash | Cash left for repairs | Immediate illustrative repair | Expected result |
|---|---:|---:|---:|---|
| `monthly-fit-cash-gap.json` | $28,000 | $4,000 | $6,000 | $2,000 immediate gap even though $300/month is available |
| `within-budget.json` | $32,000 | $8,000 | $6,000 | $2,000 remains; within the entered scenario |
| `insufficient-evidence.json` | $28,000 | $4,000 | Unknown scope | Insurance and repair scope missing; no final affordability verdict |

The $6,000 is a test assumption, not a price inferred from system age. Future repairs are intentionally absent from these initial narrow fixtures; a full five-year result and realistic rates arrive with the calculator milestone. An unassessed roof remains an explicit limitation. “Within the entered scenario” does not establish overall home condition or guarantee future affordability.

## Contract and file guide

- `web/src/lib/schemas/property.ts`: price, locality and build year.
- `budget.ts`: entered budget assumptions. Money uses integer cents; annual interest uses percentage points (`6.5` means 6.5%); term uses months.
- `evidence.ts`: source records and image/text/report references. Report page numbers start at 1.
- `finding.ts`: a bounded component list and four evidence classes.
- `analysis.ts`: the reviewed analysis envelope, unique IDs, reference existence, source/class matching, page bounds and quotations.
- `result.ts`: an initial budget summary contract, including missing inputs and simultaneous shortfall flags.
- `index.ts`: shared exports and inferred TypeScript types for future UI/backend code.
- `web/tests/unit/contracts.test.ts`: malformed data and contradictory results must be rejected.

Unknown values are explicit `null`; omitted required fields are rejected. No numeric-string coercion. Result values are not calculated by these schemas. Matching a quotation validates attribution, not whether a model interpreted it correctly. Quote matching collapses whitespace only; case and punctuation remain significant. Images currently carry only source IDs and labels, not upload bytes or public URLs.

`analysisInputSchema` represents the reviewed analysis boundary. The future extraction route must receive only property evidence; household budgets must never enter its provider request. Raw upload and raw model-response schemas are separate future contracts. The current output omits full monthly timelines and assistance matching until those features are implemented.

## What steps 1–3 deliver

1. This story plus three labeled JSON fixtures with hand-computed expectations.
2. A Next.js/TypeScript app in `web/`, a development preview, local scripts, and VS Code settings.
3. Shared runtime schemas and tests. No live model, calculator, accounts, persistence, or deployment yet.

Firestore remains the planned store for scoped analyses and revisions. Its SDK, credentials, rules and persistence layer are deferred; accounts are a separate deferred feature, not a prerequisite for deciding to use Firestore.
