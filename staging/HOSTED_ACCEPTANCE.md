# Hosted staging acceptance

Target only Supabase project `exghrllltefuhsgnagym`. The project owner reported the three migrations applied through `launchstuido supa`. This Codex workspace still receives permission denied when reading the staging catalog.

## Migration mapping

| Repository migration | Reported hosted version |
| --- | --- |
| 20261111190000_launchstudio_shared_memory.sql | 20261111211343 |
| 20261111190100_launchstudio_approval.sql | 20261111211346 |
| 20261111190200_launchstudio_handoff_provenance.sql | 20261111211348 |

This maps the reported application order. Confirm the hosted names and stored statements against the repository before changing migration tracking. Keep both sets of identifiers until verified. Avoid migration push or repair while they disagree. The original DDL has already been applied. The destructive rollback is reserved for disposable local fixtures.

Use the authorized connection to run the read-only catalog checks in [verify-hosted.sql](verify-hosted.sql). Confirm eight application tables with RLS, the project-scoped provenance constraint, column-level write grants, and the approval function's effective privileges. Confirm that the private helper schema is outside the Data API's exposed schemas. Compare the three hosted migration entries by name and statements before choosing a migration history reconciliation.

## Runtime and acceptance

1. Provision an isolated staging HTTP runtime for the existing request handler and workflow. Bind Supabase Auth to the exact project origin, use a staging-only server database role with only the needed permissions, and configure an authorized staging Pickaxe runner. Keep server credentials in the runtime's secret store. See [README.md](README.md) for environment variable names.
2. Provision two independent synthetic Auth accounts. Sign in separately and use each account's own access token with the publishable key for Data API tests. Reserve administrative access for fixture membership changes.
3. Using A's token, create A's profile, business and project. Run Idea Validator through the application. With no membership, B must see no A records and cannot update A's project, insert a child project under A's business, or approve A's pending assessment. B's own project must remain accessible.
4. Grant B viewer membership. B must now read A's project but still be unable to update it, run agents against it, or approve the pending assessment. Confirm that failed approval attempts leave the assessment and workflow progress unchanged. Revoke membership and repeat the denial checks with B's existing token.
5. Using A's token, approve the pending version through the Data API RPC. Verify the approver and timestamp. Create a newer pending Idea Validator version and run Market Intelligence. Its stored source must point to the approved version in the same project. Retrying the same request ID must return the original run without another dispatch or result version.
6. Sign A in again and confirm that A can read both saved artifacts and their version provenance. Verify B remains denied through the application and direct Data API calls. Record statuses, counts and redacted evidence. Document whether the agent execution was live or stubbed.

Q/CUE and account-synced onboarding follow hosted acceptance. Keep PR #1 in draft through the acceptance run.
