# LaunchStudio staging portal

Next.js app for the separate LaunchStudio Supabase staging project. Run `npm ci` and `npm run build` from this directory. For local development, copy `.env.example` to `.env.local` and run `npm run dev`. Use only synthetic accounts and projects.

## Private preview

1. Create or select a dedicated Vercel project linked to `xoderx/launchstudio`. Set the root to `apps/staging-portal`, enable inclusion of files outside the root directory, and enable Vercel Authentication for previews before deployment. Deploy from `codex/supabase-integration` to Preview. Preview stays pinned to staging. Production requires a separately configured backend; see [Production release](../../docs/PRODUCTION_RELEASE.md).
2. Verify hosted schema and migration tracking using the [acceptance runbook](../../staging/HOSTED_ACCEPTANCE.md). Verify the existing worker against [worker-access.sql](../../staging/worker-access.sql); it is already provisioned in staging. Do not rerun provisioning there. Provision the worker password through the authorized secret-management interface and enable LOGIN. Supply a TLS PostgreSQL URL for the dedicated role and verify that the worker has no inherited administrative grants. Do not rerun the three original schema migrations.
3. Set the variables from `.env.example` through Vercel Preview secrets. The Supabase URL and publishable key are delivered to the browser. The database URL and staging Pickaxe key are server-only. Verify that the Pickaxe key is authorized for the two existing agents and that synthetic submissions are appropriate for both. Enable email/password sign-in for the two staging test accounts. Set any Supabase Auth site and redirect URLs to the actual private preview as needed. Password sign-in in this app does not use a redirect callback.
4. Confirm an unauthenticated external request is stopped by Vercel protection. After opening the preview as an authorized tester, use the two separate Supabase customer identities and follow the hosted acceptance runbook. The sign-in shell contains no customer records. Project reads and writes use the customer's token via Data API and RLS. The queue endpoint verifies the token against staging Auth and checks project membership.

## Agent jobs

The authenticated endpoint starts a Vercel Workflow and returns before the agent completes. The step calls the existing Pickaxe background submission adapter and persists the result through the existing workflow module. The worker rechecks membership before dispatch and before saving. Durable job arguments contain identifiers only. They contain no Auth token, business profile, or assessment text.

Workflow requests are durably reserved before dispatch. The worker records a provider acknowledgment before polling. Recovery only looks up that saved submission; it never issues a replacement request. Ambiguous requests without an acknowledgment remain blocked for operator review. No workflow step automatically resubmits an uncertain Pickaxe request.

## Verification

`npm run build` checks the application bundle and Workflow compilation. Run `node test.mjs` from `staging/` for the disposable PostgreSQL suite. That suite runs the workflow as the restricted database role with stubbed Auth and Pickaxe. Q/CUE is implemented. Complete final live authentication, API, agent, and persistence checks before customer release; local fixtures do not establish hosted acceptance.

## Q/CUE Command Center

Open the protected Preview and sign in as a staging customer. Select a business and project to view progress, saved context, workflows, and assessment versions. Market Intelligence links to the specific Idea Validator version stored on its run. The tool roadmap is informational except for the two existing project workflows.

Run the dashboard tests with `node --test lib/command-center.test.mjs` from this directory. Run the staging database suite for tenant isolation and approval permissions. To check the deployed UI, open an approved handoff project, switch to an empty project, confirm the former project's data disappears, and sign in as the second test customer to confirm the first customer's business and projects are absent.

### Workflow recovery and history

The workflow recovery migration is already applied to staging. Verify migration history before future deployments; do not replay the original DDL. A queued or running request becomes visibly unknown after five minutes without a recorded update. When Pickaxe acknowledged the request, the initiating customer can select **Check existing submission**. Recovery only polls the saved provider ID and never issues a replacement provider submission. If there is no acknowledgment, contact support to verify the outcome. Historical failures from before the ledger have no provider ID to recover in Q/CUE.

The project histories use the signed-in customer's Supabase session and RLS. **Load older** continues from the last displayed creation timestamp and unique row ID. **Show newest** refreshes the list from the top. Run `node --test lib/*.test.mjs` for history and dashboard regressions, and `node test.mjs` from `staging/` for database and recovery coverage.

### Audience DNA staging pilot

The Audience DNA Builder agent is `SCV7PECQF3`. The protected Preview supports reviewing and approving Market Intelligence before it can be used as a source. Audience DNA pins that exact market version and the approved Idea Validator version referenced by its run, sends bounded excerpts, and validates all structured output sections before saving.

The Audience DNA migration is already applied to staging; do not replay it. The Preview feature is disabled by default. Enable `AUDIENCE_DNA_ENABLED` and set `AUDIENCE_DNA_PILOT_PROJECT_ID` only for the authorized synthetic project after confirming execution entitlement, the actual provider message limits, and a workspace spend boundary. Metadata reads with the Preview credential do not establish permission to run the agent or a per-run cost. Run one synthetic request once those checks pass. Recover an acknowledged request through the existing workflow history instead of repeating it.

## Production configuration

Production requires an explicit non-staging Supabase project. Configure Production-scoped `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, `LAUNCHSTUDIO_PRODUCTION_SUPABASE_PROJECT_REF`, `LAUNCHSTUDIO_PRODUCTION_DATABASE_URL`, `PICKAXE_PRODUCTION_API_KEY` and `PICKAXE_PRODUCTION_WORKSPACE_ID`. Preview continues using the staging variables. Production never falls back to staging credentials. Both targets require the restricted worker role and verified PostgreSQL TLS. Missing or mismatched configuration fails closed.

This code support does not provision a database, migrate accounts or satisfy the final acceptance gate. See the [release checklist](../../docs/PRODUCTION_RELEASE.md).
