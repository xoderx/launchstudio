# LaunchStudio staging and shared agent memory

Target project: `launchstudio-staging`, preferred region `us-west-1`. Project reference: `exghrllltefuhsgnagym`. The connected Supabase account denied project metadata, schema inspection, and API-key listing. The dashboard opened to sign-in. Hosted project health is unverified and no hosted migrations were applied.

## Identity and authorization

Pickaxe documents a runtime user identifier and per-user secrets for Actions and MCP. Its completion and workspace MCP interfaces also accept supplied user identifiers in some contexts. A supplied identifier or an email match is insufficient proof of a customer session. We did not verify an externally verifiable signed Pickaxe identity assertion for this portal. Do not forward the identifier as an authentication credential.

The staging baseline uses Supabase Auth as the verified application identity. Verify the supplied access token against the configured project's Auth endpoint, derive the UUID from the verified user record, and use that token for browser RLS reads. Never pass the access token to a model. The server's workflow credential stays server-side. An optional future Pickaxe association must be bound by verified sign-in on both sides and stored as a separate mapping. A Pickaxe Action could use a scoped, revocable credential provisioned per verified user after the mapping is proven. This path remains unverified.

The server handler accepts only a project ID, request ID and allowlisted agent. It derives the actor from the verified token, checks editor or owner membership before handing data to an agent, and checks again before saving. The browser role cannot write agent runs, assessment versions or workflow progress. Approval is a narrow RPC that checks membership and records the approver and time. Deletes are intentionally disallowed for browser roles. Membership grants are administrative operations.

## Environment variable names

- `SUPABASE_URL`
- `SUPABASE_PUBLISHABLE_KEY`
- `LAUNCHSTUDIO_STAGING_DATABASE_URL` (server only)
- `PICKAXE_STAGING_API_KEY` (server only, for the Pickaxe adapter)

Use the deployment's secrets manager. Configure a dedicated backend database credential restricted to required tables and operations before exposing the route. The test uses an in-process administrator connection for fixtures and workflow writes. This credential shape has not been validated on hosted Supabase. A service-role key is unnecessary for the browser.

## Deploy and verify

1. Designate the active staging project and verify its reference, region, Auth settings and empty schema. Export a backup before migration.
2. Apply migrations in version order on staging and verify grants, policy behavior and migration history. Configure server runtime adapters and an authenticated staging UI. Keep the Pickaxe key off the client.
3. With two separately authenticated test users, test create/update of business profiles and projects, allowed assessment reads, denied foreign project reads and writes, and denial of direct agent-result writes. Test rejected deletes. Repeat against Data API and the server endpoint using the actual staging tokens.
4. Send a synthetic Idea Validator request. Approve the resulting version through the authenticated UI. Run Market Intelligence against the latest approved Idea Validator result and verify both outputs are saved under the same project. Repeat the same request ID to check that it does not dispatch a second run.
5. Test guessed or modified links and forged identity fields. If a Pickaxe Action or MCP connection is added, repeat the tests through those surfaces before enabling them for customers. Record the actual outputs and tenant checks.
6. Use persisted project goal, run timestamps, assessment versions and workflow progress for Q/CUE after staging passes. The workflow records the next agent, outstanding task and exact source assessment version. Q/CUE and the portal integration have not been deployed.

Run the local test from this directory with `node test.mjs`. Run npm ci in staging/ first. The test executes all three migrations and the rollback in disposable PostgreSQL. It uses synthetic Supabase claims and stub agent replies, and exercises the server request handler with two identities. Earlier live Pickaxe CLI replies are recorded in the sibling implementation directory. They do not validate the new hosted auth or persistence path.

For rollback, disable the staging endpoint and remove its staging links/actions first. Revoke the staging credential and take a verified database backup. Apply a forward corrective migration where data must be retained. Use rollback.sql only for an authorized disposable staging reset. No production rollout is included.
