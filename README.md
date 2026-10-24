# TrueCost Home

**Can I afford to own this home, not just buy it?**

TrueCost Home is a planned buyer-facing tool that connects listing information and property-condition evidence to repair scenarios, monthly ownership budgets, upfront cash gaps, and assistance pathways.

**Status: planning and team onboarding.** No application, model integration, production dataset, or deployment has been implemented yet. The stack below is the agreed build direction; the exact Gemma endpoint must be tested first.

## Start here

1. [Architecture and tech-stack walkthrough](docs/ARCHITECTURE.md) — understand the system before coding.
2. [Team workflow](TEAM.md) — shared ownership, collaboration, and code review.
3. [Build roadmap](ROADMAP.md) — milestones and observable acceptance criteria.
4. [Product plan](docs/PROJECT_PLAN.md) — scope, math, sources, limitations, and demo.

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

There is no runnable application yet. Do not install dependencies based on this README alone. Each implementation milestone will add exact version pins, setup commands, environment requirements, and test commands. `.env.example` contains proposed configuration names, not a working endpoint.

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
