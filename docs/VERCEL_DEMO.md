# Vercel demo deployment

Deploy the `web` directory as a Next.js application on the selected Hobby account. Use the `feat/sourced-costs-roof-benchmark` branch for the current demo. A repository import that defaults to `main` may not contain the latest work.

- Install: `npm ci`
- Build: `npm run build`
- Node: 24.x, satisfying `package.json`
- Analyze function: Node runtime, platform maximum duration 120 seconds. The existing 75-second model deadline and bounded retries remain unchanged.
- Set server-only `GEMMA_API_KEY` and `GEMMA_MODEL_ID=gemma-4-26b-a4b-it` in the hosting environment, never in a public-prefixed variable or Git.
- Set `ENABLE_ANALYZE_API=true` only for a protected demo environment. Preserve Vercel Authentication for previews. The app's process-local admission guard and origin check are not public-service authentication or distributed quotas.
- `APP_ORIGIN`, if set, must match the deployment origin exactly. Otherwise the application checks the request authority. Budget data stays in the browser; photos/text go to the provider.
- Keep production analysis disabled until the selected production access boundary or distributed abuse controls have been verified. A static export cannot host the two backend routes.

Before calling the deployment finished, verify the landing page, source catalog endpoint, one live Gemma request, evidence references, and a cost estimate on the hosted URL. A successful build alone is not a live backend test. Record the actual URL and result after deployment.

Hosting allowances and model-provider quotas are separate. Hobby does not mean unlimited inference. [Vercel Hobby](https://vercel.com/docs/plans/hobby), [function duration](https://vercel.com/docs/functions/configuring-functions/duration), and [Vercel Authentication](https://vercel.com/docs/deployment-protection/methods-to-protect-deployments/vercel-authentication).
