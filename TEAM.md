# Team workflow

We work together as peers and share product, programming, architecture, and release decisions. We agree on priorities and divide implementation work together.

Team: `supervince5`, `jmlee060801`, and `towwop`. Work assignments are agreed together.

## First team session

1. Read the [architecture guide](docs/ARCHITECTURE.md).
2. Agree on the single-home demo and supported locality.
3. Define the first API contract together.
4. Allocate frontend, backend/model, and source-data work according to interest and skills.
5. Establish the acceptance example for the first thin vertical slice.

## Everyday collaboration

- Keep `main` reviewable. Work on short feature branches.
- Open a pull request describing the user-visible behavior and relevant checks.
- Get a teammate's review before merging meaningful product or architecture changes.
- Prefer small PRs: one calculation feature, one API operation, or one screen flow.
- Do not silently broaden the MVP.
- Do not overwrite another teammate's work to resolve a conflict; inspect it and coordinate.
- Never commit real household data, listing photos without permission, keys, tokens, or service-account files.

Suggested branch names: `feature/cash-flow-engine`, `feature/property-intake`, `feature/gemma-adapter`, and `data/virginia-programs`.

Review-before-merge is a team convention at this point; no GitHub branch protection rule has been configured by this bootstrap.

## Definition of done

- The agreed user behavior works.
- Relevant math, API, or model-fixture checks pass.
- Missing information and failure states are handled.
- Data and claims have traceable sources.
- The author distinguishes live integration from fixtures.
- Setup and limitations are documented.

Original project code and docs use MIT. Third-party model, data, and media terms must be checked separately. The repository can stay private during development; public release and hackathon submission are team decisions.
