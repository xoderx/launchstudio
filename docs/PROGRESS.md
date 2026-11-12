# Verified progress

- Public accelerator and resources were published in Pickaxe in the prior build. This consolidation made no production changes.
- Reconciled 52 live specialists across four categories. The five-category plan has 65 positions, including 13 CoVibeCoder commander workflows.
- Prepared a dedicated local Git repository with staging migrations, portal builder, catalog, and handoff records.
- Tested the new assessment provenance migration and actual local PostgreSQL close/reopen. The correct saved approved version survived restart, and tenant isolation continued after membership revocation. Identity and agent responses in this run were stubbed. Earlier live Pickaxe CLI responses exist in the original workspace outputs.
- Hosted acceptance is blocked by the Supabase connector permission denial for exghrllltefuhsgnagym. No hosted migrations, signed-in handoff, security advisors, or Q/CUE deployment were verified.

## November 11 staging verification

- After reported OAuth authorization, the connected Supabase tool denied the read-only SQL probe, public schema inspection, and migration history for `exghrllltefuhsgnagym`. The project-scoped Codex CLI server was listed with auth status `Unknown`; its verification process could not start inside the desktop sandbox. Staging permissions and schema compatibility remain unverified.
- Re-ran the disposable PostgreSQL test with all three packaged migrations and rollback. Two-customer isolation, owner and viewer grants, approval, assessment provenance, versioning, retry behavior, and restart recovery passed. Auth and agent responses were stubbed. The site build also passed its internal anchor checks.
- No hosted migration was applied. Keep the authenticated workflow, Q/CUE, and onboarding sync gated on verified staging access and the live two-customer test. The rollback SQL drops staging data and is for a disposable reset only.

## Connection routing follow-up

The project owner reported a successful read-only SQL probe through the named ChatGPT connection `launchstuido supa` and an empty staging schema. In this Codex session, the Supabase connector's organization list omitted the expected LaunchStudio organization and a read-only SQL probe against `exghrllltefuhsgnagym` again returned permission denied. The project-scoped CLI entry still showed auth status Unknown. Hosted work requires a Codex session bound to the named LaunchStudio connection.

Reviewed the migration sequence: the first creates the RLS-protected schema with membership checks and column-level write grants. The second adds the authenticated approval RPC with an editor or owner check. The third uses a composite foreign key to bind Market Intelligence provenance to an Idea Validator version in the same project. The destructive rollback removes the full schema and is reserved for a disposable reset. Local migration, rollback, two-customer isolation and restart tests passed with stubbed Auth and agent responses. Hosted compatibility, deployment and acceptance remain pending.

## Hosted migration deployment reported

The project owner reported eight tables with RLS and foreign keys, and three recorded migrations on `exghrllltefuhsgnagym`. The hosted version mapping and read-only catalog queries are in `staging/HOSTED_ACCEPTANCE.md` and `staging/verify-hosted.sql`. Codex's catalog probe still returned permission denied. No migrations were replayed, repaired, or rolled back. Local regression verifies that viewer and unrelated-user approval attempts fail and leave the assessment pending. Hosted runtime, authentication, agent execution and tenant acceptance are pending.

Next three actions are listed in ROADMAP.md.

## Authenticated staging portal implementation

- Added the Next.js staging portal, Supabase password sign-in and sign-out, customer-scoped business and project forms, saved assessments, approval, and project activity. A verified server endpoint queues the two existing Pickaxe agents with Vercel Workflow.
- Added a dedicated PostgreSQL worker provisioning script and ran the local workflow suite under that role. The suite passed with stubbed Auth and agent calls. The portal build and dependency audit passed.
- A private preview, real Supabase users, hosted worker provisioning, real Pickaxe dispatch, Supabase advisors and the live two-customer acceptance are pending. The connected Codex database route previously denied staging access, and the required staging credentials were unavailable to this workspace. No production, hosted schema, or Pickaxe changes were made. Q/CUE and onboarding sync follow acceptance.

## Restricted staging worker and preview configuration

- GitHub commit `23b12d0` adds `20261111223000_launchstudio_staging_worker_access.sql`, which matches the reviewed worker provisioning script. The project owner reported deployment as hosted version `20261111214206` and verified the restricted role and policies. The Codex role-catalog query was denied. Do not replay the worker migration or provisioning script.
- Verified Standard Vercel Authentication on the dedicated staging project. Set `SUPABASE_URL` for Preview only. The publishable key, restricted worker connection and staging Pickaxe key still need secure provisioning. Leave the worker as NOLOGIN until its credential can be set securely. No deployment or live acceptance ran.

## Staging assessment TLS repair

The protected Preview reproduced the generic assessment 500. A read-only Vercel probe using the Preview worker URL failed certificate verification before the project authorization query could execute. The worker now uses the Supabase PostgreSQL CA with strict TLS verification. The workflow request logs only the failing stage and a fixed error category. No staging migrations were reapplied.

## Staging Pickaxe acceptance

The restricted hosted worker saved a stubbed assessment inside a rolled-back transaction. Pickaxe history contained no matching synthetic prompt. The configured personal key received HTTP 400 on a read-only completion lookup without workspace scope and reached HTTP 404 for the same nonexistent submission with the verified workspace. Preview supplies that scope to both provider calls. Worker logs distinguish submission, acknowledgment, polling, output validation, and the failing persistence operation.

The live Idea Validator run saved a version that the owner approved. Market Intelligence linked the approved version but Pickaxe rejected its 3,961-token message against a 3,000-token limit. Bound the Market Intelligence request without changing the approved source. The additive project-name migration preserves existing project and assessment relationships.

## Q/CUE Command Center Phase 1

The staging portal includes business and project navigation, recent runs, project progress, saved context, versioned assessments and source links, and the 52-tool roadmap. The dashboard reads existing Supabase tables with the signed-in customer's session. Workflow status is refreshed from persisted run records. An unconfirmed submission stays visible while the dashboard watches for a matching run.
