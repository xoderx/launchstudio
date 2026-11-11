# LaunchStudio staging portal

Next.js app for the separate LaunchStudio Supabase staging project. Run `npm ci` and `npm run build` from this directory. For local development, copy `.env.example` to `.env.local` and run `npm run dev`. Use only synthetic accounts and projects.

## Private preview

1. Create or select a dedicated Vercel project linked to `xoderx/launchstudio`. Set the root to `apps/staging-portal`, enable inclusion of files outside the root directory, and enable Vercel Authentication for previews before deployment. Deploy from `codex/supabase-integration` to Preview. The app rejects Vercel's production environment.
2. Verify hosted schema and migration tracking using the [acceptance runbook](../../staging/HOSTED_ACCEPTANCE.md). Verify the installed worker migration against the hosted history in the exact staging project. The worker migration has already been applied to LaunchStudio staging. Set the worker password through the authorized secret-management interface and enable LOGIN. Supply a TLS PostgreSQL URL for the dedicated role and verify that the worker has no inherited administrative grants. Do not rerun the three original schema migrations.
3. Set the variables from `.env.example` through Vercel Preview secrets. The Supabase URL and publishable key are delivered to the browser. The database URL and staging Pickaxe key are server-only. Verify that the Pickaxe key is authorized for the two existing agents and that synthetic submissions are appropriate for both. Enable email/password sign-in for the two staging test accounts. Set any Supabase Auth site and redirect URLs to the actual private preview as needed. Password sign-in in this app does not use a redirect callback.
4. Confirm an unauthenticated external request is stopped by Vercel protection. After opening the preview as an authorized tester, use the two separate Supabase customer identities and follow the hosted acceptance runbook. The sign-in shell contains no customer records. Project reads and writes use the customer's token via Data API and RLS. The queue endpoint verifies the token against staging Auth and checks project membership.

## Agent jobs

The authenticated endpoint starts a Vercel Workflow and returns before the agent completes. The step calls the existing Pickaxe background submission adapter and persists the result through the existing workflow module. The worker rechecks membership before dispatch and before saving. Durable job arguments contain identifiers only. They contain no Auth token, business profile, or assessment text.

The run row provides the deduplication key. Concurrent submissions with the same customer, project, agent, and request ID may enqueue separate workflow executions, but the unique claim prevents a second Pickaxe dispatch. A step is never automatically retried across a potentially accepted Pickaxe submission. If the step is interrupted after claiming the run, checking the same request after five minutes marks a stale run failed. It cannot then save a late result. Before issuing a new request ID after an ambiguous provider failure, check whether the original submission completed in Pickaxe. Automatic recovery of an accepted provider submission after process loss would require a persisted provider submission identifier or a provider idempotency contract.

## Verification

`npm run build` checks the application bundle and Workflow compilation. Run `node test.mjs` from `staging/` for the disposable PostgreSQL suite. That suite runs the workflow as the restricted database role with stubbed Auth and Pickaxe. Complete live authentication, API, agent, and persistence checks before starting Q/CUE or onboarding sync.
