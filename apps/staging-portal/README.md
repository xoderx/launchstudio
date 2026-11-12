# LaunchStudio staging portal

Next.js app for the separate LaunchStudio Supabase staging project. Run `npm ci` and `npm run build` from this directory. For local development, copy `.env.example` to `.env.local` and run `npm run dev`. Use only synthetic accounts and projects.

## Private preview

1. Create or select a dedicated Vercel project linked to `xoderx/launchstudio`. Set the root to `apps/staging-portal`, enable inclusion of files outside the root directory, and enable Vercel Authentication for previews before deployment. Deploy from `codex/supabase-integration` to Preview. The app rejects Vercel's production environment.
2. Verify hosted schema and migration tracking using the [acceptance runbook](../../staging/HOSTED_ACCEPTANCE.md). Provision [worker-access.sql](../../staging/worker-access.sql) in the exact staging project. Provision the worker password through the authorized secret-management interface and enable LOGIN. Supply a TLS PostgreSQL URL for the dedicated role and verify that the worker has no inherited administrative grants. Do not rerun the three original schema migrations.
3. Set the variables from `.env.example` through Vercel Preview secrets. The Supabase URL and publishable key are delivered to the browser. The database URL and staging Pickaxe key are server-only. Verify that the Pickaxe key is authorized for the two existing agents and that synthetic submissions are appropriate for both. Enable email/password sign-in for the two staging test accounts. Set any Supabase Auth site and redirect URLs to the actual private preview as needed. Password sign-in in this app does not use a redirect callback.
4. Confirm an unauthenticated external request is stopped by Vercel protection. After opening the preview as an authorized tester, use the two separate Supabase customer identities and follow the hosted acceptance runbook. The sign-in shell contains no customer records. Project reads and writes use the customer's token via Data API and RLS. The queue endpoint verifies the token against staging Auth and checks project membership.

## Agent jobs

The authenticated endpoint starts a Vercel Workflow and returns before the agent completes. The step calls the existing Pickaxe background submission adapter and persists the result through the existing workflow module. The worker rechecks membership before dispatch and before saving. Durable job arguments contain identifiers only. They contain no Auth token, business profile, or assessment text.

The run row provides the deduplication key. Concurrent submissions with the same customer, project, agent, and request ID may enqueue separate workflow executions, but the unique claim prevents a second Pickaxe dispatch. A step is never automatically retried across a potentially accepted Pickaxe submission. If the step is interrupted after claiming the run, checking the same request after five minutes marks a stale run failed. It cannot then save a late result. Before issuing a new request ID after an ambiguous provider failure, check whether the original submission completed in Pickaxe. Automatic recovery of an accepted provider submission after process loss would require a persisted provider submission identifier or a provider idempotency contract.

## Verification

`npm run build` checks the application bundle and Workflow compilation. Run `node test.mjs` from `staging/` for the disposable PostgreSQL suite. That suite runs the workflow as the restricted database role with stubbed Auth and Pickaxe. Complete live authentication, API, agent, and persistence checks before starting Q/CUE or onboarding sync.

## Q/CUE Command Center

Open the protected Preview and sign in as a staging customer. Select a business and project to view progress, saved context, workflows, and assessment versions. Market Intelligence links to the specific Idea Validator version stored on its run. The tool roadmap is informational except for the two existing project workflows.

Run the dashboard tests with `node --test lib/command-center.test.mjs` from this directory. Run the staging database suite for tenant isolation and approval permissions. To check the deployed UI, open an approved handoff project, switch to an empty project, confirm the former project's data disappears, and sign in as the second test customer to confirm the first customer's business and projects are absent.

### Workflow recovery and history

Apply the workflow recovery migration to the staging Supabase project before deploying this version. A queued or running request becomes visibly unknown after five minutes without a recorded update. When Pickaxe acknowledged the request, the initiating customer can select **Check existing submission**. Recovery only polls the saved provider ID and never issues a replacement provider submission. If there is no acknowledgment, contact support to verify the outcome. Historical failures from before the ledger have no provider ID to recover in Q/CUE.

The project histories use the signed-in customer's Supabase session and RLS. **Load older** continues from the last displayed creation timestamp and unique row ID. **Show newest** refreshes the list from the top. Run `node --test lib/*.test.mjs` for history and dashboard regressions, and `node test.mjs` from `staging/` for database and recovery coverage.
