# Two-minute walkthrough

Audience: homebuyers comparing homes before making an offer, especially first-time buyers with limited cash left after the down payment. Read only the quoted narration. Screen directions and technical notes are not spoken. Target: about two minutes at a conversational presentation pace; rehearse once with a timer.

## 0:00–0:27 | Problem and audience

Show the landing page. Overlay the two statistics with source names and years.

“You can afford the asking price. But can you afford what comes next?

NAR’s 2025 report puts first-time buyers at just 21 percent of buyers. Harvard found maintenance spending averaged 76 percent more for pre-1980 homes than those built since 2010.

We built TrueCost for homebuyers, especially first-time buyers with little cash left after the down payment.”

## 0:27–0:45 | The buyer’s workflow

Show seven uploaded views, then cut to an actual completed review. Label the edit “Analysis completed earlier.” Do not wait through inference during the narration.

“Before making an offer, you upload listing or tour photos. No inspection report is required. We support seven views of the home. Gemma helps identify visible concerns and connects each observation to its photo, so you can check it yourself.”

## 0:45–1:10 | Gemma and the backend

Show the evidence card, followed by the pipeline diagram below.

“Our Next.js backend checks and resizes the images, removes metadata, and sends them to Gemma through Google’s API. A researched checklist guides the model across home systems.

Gemma returns structured observations, not prices. We validate the response format and evidence references, with bounded retries and timeouts. Those checks don’t guarantee every observation is correct. You review the findings before choosing a repair scope.”

## 1:10–1:50 | Cost mathematics

Show a sourced repair range, then the equations and an explicitly labeled illustrative cash-flow example.

“The cost engine then looks up published ranges. For each confirmed repair, we multiply the unit price by quantity and add the results. Missing information stays unknown.

We calculate the mortgage from the loan amount, interest rate, and term, then add taxes, insurance, and other monthly costs.

The key is timing. Starting with cash left after closing and protected savings, we add your available monthly savings and subtract repairs when they’re due. We run three cost-and-timing scenarios over five years.

For example, four thousand dollars available and a six-thousand-dollar immediate repair leaves a two-thousand-dollar gap. Saving three hundred a month afterward cannot pay that bill today.”

## 1:50–2:00 | Close

Show the cash-gap result, verification questions, and assistance links.

“Changing your budget recalculates instantly, without another model call. This is planning support, not an inspection or appraisal. Our goal is to help buyers ask better questions before committing.”

## Sources for the opening

- National Association of REALTORS®, November 4, 2025: [2025 Profile release](https://www.nar.realtor/press-releases/first-time-home-buyer-share-falls-to-historic-low-of-21-median-age-rises-to-40). First-time buyers were 21% of buyers in that survey. This is not a share of all U.S. households and does not establish that repairs caused the decline.
- Harvard Joint Center for Housing Studies, *Improving America’s Housing 2025*: [report](https://www.jchs.harvard.edu/sites/default/files/reports/files/Harvard_JCHS_Improving_Americas_Housing_2025.pdf). In 2023, average maintenance spending for homes built before 1980 was 76% higher than for homes built since 2010. This is a group average, not a forecast or multiplier used by our app. [Report commentary](https://www.jchs.harvard.edu/blog/remodeling-soars-new-heights-industry-faces-numerous-challenges).

## Recording setup

- Use completed, actual results. The seven-photo browser run took 334.8 seconds, so show the upload briefly and make an explicit time cut.
- The current seven-photo example did not pass a vision-accuracy acceptance test. Its ceiling-stain observation is ambiguous. Show human review and exclude it; do not present it as a confirmed leak.
- The $4,000/$6,000/$300 example is illustrative math, not a quote for the photographed property. It corresponds to the existing synthetic cash-gap fixture, which intentionally uses a zero-interest loan to simplify hand checking. Label it illustrative if shown.
- A successful request or 130 passing software tests does not prove inspection accuracy. No fine-tuning, hidden-defect detection, automatic market appraisal, or eligibility decision is implemented.
- A rehearsed 2-minute narration is the target, not a measured audio duration. If speaking slowly, omit “through Google’s API,” “with bounded retries and timeouts,” and the final sentence of the mathematical example.

## Pipeline overlay

```text
Browser: photos + optional listing/report text
    ↓ one photo per request, up to seven
POST /api/analyze: validation + image preparation
    ↓ server-only key
Gemma: researched prompt → structured observations
    ↓ schema + source-reference validation
Browser: review evidence + confirm repair scope
    ↓
POST /api/estimate: sourced range × confirmed quantity
    ↓
Browser: mortgage + 60-month cash-flow calculation
```

Gemma is the only model. Budget and savings fields are not sent in model requests. Free text can still contain personal information; users should remove it before submitting. Data is not persisted by this demo, but evidence is transmitted to the model provider.

## Technical notes for questions after the walkthrough

### Where Gemma is integrated

The React client calls Next.js Route Handlers in the same application. `src/server/model/gemma.ts` uses `@google/genai` to call `gemma-4-26b-a4b-it` at the fixed Google endpoint. It sends normalized images and server-assigned source IDs with the versioned whole-home prompt. Deliberate mode uses HIGH thinking; standard uses MINIMAL. The output is prompted JSON, locally validated with Zod, not guaranteed provider-enforced JSON.

The wrapper checks unique IDs, source classes, exact text quotations and page references. Photo references identify the input photo but do not prove a visual statement. Resolved/historical conditions cannot become active repair cards; this still depends on the model classifying the state correctly. Sourced review cards add professional verification guidance.

Photo calls have a shared 75-second inference deadline and at most two model attempts, including any correction or permitted transient retry. The seven-photo UI sends independent sequential requests and preserves image numbering when merging. It does not reason jointly across all seven views or automatically deduplicate the same physical defect. The reviewed scope controls block overlapping costs.

### Repair range arithmetic

For confirmed quantity q_i and catalog low/high unit prices l_i and h_i:

```text
Low subtotal  = Σ(q_i × l_i)
High subtotal = Σ(q_i × h_i)
```

Arithmetic uses integer cents. Project-level scopes require quantity 1. Quantities are user-confirmed, not inferred from photos. Geography must match; national fallback requires an explicit choice. Source checks older than 180 days require review. Unknown quantities, unconfirmed scopes, unsupported regions or unavailable quotes return unknown, not zero. Duplicate/overlapping scopes are rejected. A complete total is withheld when any selected line is unpriced. Published ranges are planning data, not contractor bids. Resale-value impact is always null.

Implemented server code: `src/server/costs/engine.ts`; versioned inputs: `src/data/cost-catalog.json` and the condition source library.

### Mortgage and recurring ownership

Let P = purchase price minus down payment, r = annual percentage rate / 1200, and n = loan term in months:

```text
Mortgage payment M = P × r / (1 − (1 + r)^(−n))
At zero interest: M = P / n
```

The implementation uses `log1p` and `expm1` for numerical stability and rounds the payment to cents. A fully cash-funded purchase has M = 0.

```text
Monthly ownership O = M + property tax + homeowners insurance
                      + mortgage insurance + HOA + utilities + routine maintenance
Available monthly repair contribution S = stated housing budget − O
Cash after closing C = purchase cash − down payment − closing costs − protected savings
```

Routine maintenance and selected repairs must represent distinct expenses. The engine does not invent tax, insurance or maintenance amounts. Blank is unknown; explicit zero means a cost does not apply.

### Five-year cash-flow mathematics

Let E_t be selected repair expenses in month t, including immediate work at t = 0:

```text
B_0 = C − E_0
B_t = B_(t−1) + S − E_t, for t = 1…60
Immediate gap = max(0, −B_0)
First shortfall = first month with B_t < 0
Required monthly contribution = max(0, max over t=1…60 of ceil((Σ E_k from k=1…t − B_0) / t))
```

The ceiling rounds upward to an integer cent. The required contribution is the constant monthly amount needed by the most demanding deadline under the chosen scenario. An immediate gap is separately displayed because future contributions cannot fund month-zero work. The code retains a negative initial balance in later calculations; the contribution figure must not be presented as a substitute for covering that immediate gap.

Three scenarios use the low price at the latest selected month, the rounded midpoint price at the floor of the midpoint month, and the high price at the earliest month. These are adjustable planning assumptions, not probabilities or predictions of failure dates. Unpriced work is excluded from the partial ledger and keeps the overall result incomplete.

The five-year ownership-cost field is `60 × O + Σ E_t`, when the relevant inputs are complete. It is not the entire cash spent acquiring the property: down payment, closing costs and protected savings are handled separately in available cash. It includes mortgage payments rather than subtracting equity accumulation and is not an investment-return calculation.

Implemented pure TypeScript: `src/lib/engine/cashflow.ts`. It runs in the browser, so budget edits do not transmit household numbers or trigger another Gemma call. The backend supplies validated evidence and sourced repair ranges.

### Demonstration arithmetic

With C = $4,000 and E_0 = $6,000, B_0 = −$2,000. That is the immediate gap regardless of later savings. For a separate timing example with C = $4,000, a $6,000 bill in month 6 and no other repairs, the required monthly contribution is $333.34. Saving $300/month leaves $5,800 at month 6 before paying the bill, a $200 shortfall. Dividing $6,000 by 60 would miss this deadline.
