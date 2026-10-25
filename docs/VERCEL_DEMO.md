# Vercel demo deployment

[Open TrueCost Home](https://truecost-home-3n9ovsjc1-vincents-projects-e9423c09.vercel.app)

The demo is a Vercel Hobby preview deployment of the `web` directory. Vercel Authentication was disabled at the project owner's request on October 25, 2026. An unauthenticated request returned HTTP 200 with the TrueCost page and no login redirect.

The deployed application was built from commit `7ce5094`. Later final-v2 integration preserves the application under `web/` and the team's earlier root-level UI prototype. Use `main` for the integrated repository and set the hosting root directory to `web`.

## Configuration

- Install: `npm ci`
- Build: `npm run build`
- Node: 24.x, satisfying `package.json`
- Analyze function: Node runtime, maximum duration 120 seconds; the model pipeline retains its 75-second inference deadline and bounded retries.
- Preview environment: server-only `GEMMA_API_KEY`, `GEMMA_MODEL_ID=gemma-4-26b-a4b-it`, and `ENABLE_ANALYZE_API=true`.
- Secrets are configured in Vercel and ignored local environment files, never Git or public-prefixed variables.
- `APP_ORIGIN`, if set, must match the deployment origin exactly. Otherwise requests are checked against the request authority.
- Budget calculations run in the browser. Photos and submitted evidence go to the model provider.
- This is a public hackathon demo. Process-local admission limits and origin checks are not authentication or distributed quotas. Model-provider usage limits still apply.

The deployment was uploaded with the Vercel CLI. GitHub automatic deployment was not connected, so pushing Git alone does not publish a new deployment. Deploy from `web/` with `vercel deploy --environment preview --scope vincents-projects-e9423c09` when application changes need publishing.

## Verification scope

The cloud build completed successfully. Public landing-page access was verified after disabling authentication. At the owner's request, no lengthy hosted photo-analysis retest was run. The successful local software checks and photo runs are documented separately; they are not evidence of hosted model accuracy.

Hosting allowances and model-provider quotas are separate. [Vercel Hobby](https://vercel.com/docs/plans/hobby), [function duration](https://vercel.com/docs/functions/configuring-functions/duration), and [Vercel Authentication](https://vercel.com/docs/deployment-protection/methods-to-protect-deployments/vercel-authentication).
