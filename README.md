# TrueCost Home

**Can I afford to own this home, not just buy it?**

TrueCost Home is a planned buyer-facing tool that connects listing information and property-condition evidence to repair scenarios, monthly ownership budgets, upfront cash gaps, and assistance pathways.

**Status: foundation implemented locally.** A runnable Next.js preview, three synthetic demo fixtures, and shared validated contracts are in place. Model integration, financial calculations, persistence, accounts, production datasets, and deployment are not implemented yet.

## Start here

1. [Architecture and tech-stack walkthrough](docs/ARCHITECTURE.md) — understand the system before coding.
2. [Team workflow](TEAM.md) — shared ownership, collaboration, and code review.
3. [Build roadmap](ROADMAP.md) — milestones and observable acceptance criteria.
4. [Product plan](docs/PROJECT_PLAN.md) — scope, math, sources, limitations, and demo.
5. [Demo specification](docs/DEMO_SPEC.md) — sample inputs, hand-computed expectations, and implemented contracts.
6. [Gemma wrapper plan](docs/GEMMA_WRAPPER.md) — server files, evidence checks, retries, and evaluation.

## The product in one flow

A buyer provides listing information, photos or a supported inspection PDF, property facts, budget, and available cash. The backend prepares source-linked evidence, asks Gemma for focused findings, validates those findings, and lets the buyer correct them. Versioned repair costs and program rules feed deterministic calculations of monthly ownership costs and upfront cash gaps. Every result retains its evidence and assumptions.

Pipeline: **prepare evidence → focused extraction → validate → review/correct → retrieve sourced costs and rules → calculate → explain with evidence**. We compare this pipeline against a basic prompt on held-out examples before claiming an accuracy improvement.

The memorable result is not just a larger monthly number: **a monthly payment can fit while an early repair bill creates a cash shortfall.**

## Selected stack

| Responsibility | Choice |
|---|---|
| Browser interface | Next.js, React, TypeScript |
| Backend API | Next.js Route Handlers, TypeScript, shared Zod schemas |
| Image/text interpretation | Gemma 4 through a verified provider adapter |
| Financial calculations | Pure TypeScript modules, independently tested |
| Cost/program reference data | Small versioned JSON datasets with sources |
| UI charts | Recharts, when the cash-flow screen is built |
| Deployment | Next.js container on Google Cloud Run |
| Uploaded media | Private Cloud Storage with scoped access and expiration |
| Persisted reports | Firestore for scoped analysis records and revisions |
| Secrets | Google Secret Manager; server-only access |
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

If you do not use nvm, install Node 24.22.1 through your normal Node version manager first. Open `http://localhost:3000`. The current page is a foundation preview, not a functioning property analyzer. No credentials or Google Cloud setup are required yet.

Run checks from `web/`:

```sh
npm run check
```

This runs ESLint, route-type generation and TypeScript checking, contract tests, and a production build. Individual scripts: `lint`, `typecheck`, `test`, `build`. After building, `npm start` serves the production preview. VS Code includes **Web: dev** and **Web: checks** tasks.

`web/src/app/` contains pages and future API routes; `web/src/lib/schemas/` contains shared runtime contracts; `web/fixtures/` contains synthetic examples; `web/tests/` contains tests. `.tsx` files render React interfaces, `.ts` files hold logic/types, `.json` files hold data/configuration, and `.md` files explain the project.

`.env.example` at the repository root lists proposed server configuration for later integration. When that milestone is implemented, copy it to ignored `web/.env.local` and fill only the required values. Never put secrets in `NEXT_PUBLIC_*` variables.

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
