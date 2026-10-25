# TrueCost Home

**Can I afford to own this home, not just buy it?**

TrueCost Home is a buyer-facing demo that connects listing information and property-condition evidence to repair scenarios, monthly ownership budgets, upfront cash gaps, and assistance pathways.

**Status: local demo implemented.** The three-screen flow accepts photos and pasted evidence, calls Gemma, lets buyers review findings and confirm repair scopes, and calculates sourced repair scenarios and five-year cash flow. The interface uses Tailwind/CSS with a cream, sage and tan palette. Photo interpretation remains experimental: deliberate mode can recover small visible details, but can also produce false positives and takes longer. The interface accepts up to seven views of one home and reviews each in a separate bounded request, with progress and cancellation. A failed view stops the review without presenting a complete result. See [photo evaluation](docs/PHOTO_DETECTION_EVAL.md).

No accounts or Google Cloud setup are needed for this demo. Reports stay in browser memory; uploaded evidence is sent to the configured model provider for analysis. Firestore persistence and deployment are future work. PDF parsing is not implemented: paste inspection text instead.

## Start here

1. [Architecture and tech-stack walkthrough](docs/ARCHITECTURE.md) — understand the system before coding.
2. [Team workflow](TEAM.md) — shared ownership, collaboration, and code review.
3. [Build roadmap](ROADMAP.md) — milestones and observable acceptance criteria.
4. [Product plan](docs/PROJECT_PLAN.md) — scope, math, sources, limitations, and demo.
5. [Demo specification](docs/DEMO_SPEC.md) — sample inputs, hand-computed expectations, and implemented contracts.
6. [Gemma wrapper](docs/GEMMA_WRAPPER.md) — setup, endpoint format, limits, evidence checks, and evaluation.
7. [Whole-home research and cost engine](docs/WHOLE_HOME_RESEARCH.md) — source library, conditions, pricing and API.
8. [Detection benchmark](docs/DETECTION_BENCHMARK.md) — constructed scenarios and real educational photographs.
9. [Demo reliability](docs/DEMO_RELIABILITY.md) — repaired-condition guard, photo deadlines and measured reruns.
10. [Photo detection evaluation](docs/PHOTO_DETECTION_EVAL.md) — measured failures, rejected experiments and current limitations.
11. [Model development](docs/MODEL_DEVELOPMENT.md) — prompting versus training and how we will measure improvements.

## The product in one flow

A buyer provides listing information, photos or pasted inspection text, property facts, budget, and available cash. The backend prepares source-linked evidence, asks Gemma for focused findings, validates those findings, and lets the buyer correct them. Versioned repair costs feed deterministic calculations of monthly ownership costs and upfront cash gaps. Assistance is a region-filtered directory of sourced program links, not an eligibility engine; no assistance amount is deducted from the budget. Every result retains its evidence and assumptions.

Pipeline: **prepare evidence → focused extraction → validate → review/correct → retrieve sourced costs → calculate → explain with evidence**. We compare this pipeline against a basic prompt on held-out examples before claiming an accuracy improvement.

The memorable result is not just a larger monthly number: **a monthly payment can fit while an early repair bill creates a cash shortfall.**

## Selected stack

| Responsibility | Choice |
|---|---|
| Browser interface | Next.js, React, TypeScript |
| Backend API | Next.js Route Handlers, TypeScript, shared Zod schemas |
| Image/text interpretation | Gemma 4 through a verified provider adapter |
| Financial calculations | Pure TypeScript modules, independently tested |
| Cost/program reference data | Small versioned JSON datasets with sources |
| Cash-flow display | Accessible scenario summaries and monthly ledger |
| Demo hosting | Local Next.js server; cloud deployment deferred |
| Uploaded media | Browser memory and bounded server request; Cloud Storage deferred |
| Persisted reports | None for the demo; Firestore deferred |
| Secrets | Ignored web/.env.local; server-only access |
| Collaboration | GitHub branches, pull requests, and automated checks |

Paperclip is not part of the MVP. A bounded request pipeline is sufficient.

## Run locally

Open the repository root in VS Code. Use Node **24.22.1** (recorded in `web/.nvmrc`) and npm. In the integrated terminal:

```sh
cd web
nvm install
nvm use
npm ci
npm run dev
```

If you do not use nvm, install Node 24.22.1 through your normal Node version manager first. Open `http://localhost:3000`. The analyzer needs a server-only Gemma key in `web/.env.local`; follow the wrapper setup guide. No account or cloud project setup is required by the interface. Automated tests use test providers.

Run checks from `web/`:

```sh
npm run check
```

This runs ESLint, route-type generation and TypeScript checking, contract tests, and a production build. Individual scripts: `lint`, `typecheck`, `test`, `build`. After building, `ENABLE_ANALYZE_API=true npm start` serves the local production demo with analysis enabled. Keep this unauthenticated demo private. VS Code includes **Web: dev** and **Web: checks** tasks.

`web/src/app/` contains pages and API routes; `web/src/lib/schemas/` contains shared runtime contracts; `web/fixtures/` contains synthetic examples; `web/tests/` contains tests. `.tsx` files render React interfaces, `.ts` files hold logic/types, `.json` files hold data/configuration, and `.md` files explain the project.

`.env.example` at the repository root lists the model configuration and reserved future cloud settings. Copy it to ignored `web/.env.local` and set `GEMMA_API_KEY` to use the analysis API. Never put secrets in `NEXT_PUBLIC_*` variables.

**Firestore is part of the agreed architecture.** Persistence and accounts are deferred, not removed. No database or cloud resources are provisioned by these setup commands.

## Product boundaries

- Observations are not diagnoses. Listing photos cannot establish hidden defects or exact remaining equipment life.
- Cost ranges and timing windows are planning scenarios, not guarantees.
- Unknown costs do not become zero.
- No unapproved grant, seller concession, or loan improves the baseline calculation.
- The system does not replace an inspector, lender, or housing counselor.
- Household financial details stay out of model prompts.
- Demo fixtures, cached analyses, and live model calls must be labeled honestly.

## License

Original project code and documentation are under the [MIT License](LICENSE). Model weights, datasets, photographs, and third-party materials retain their own licenses and terms. The presence of source links does not authorize copying or redistributing the linked material.
