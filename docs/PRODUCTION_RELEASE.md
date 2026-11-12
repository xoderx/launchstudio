# LaunchStudio production release

The optional TransformOS/ExitReady foundations and provider-neutral preparation are documented in [lifecycle architecture](lifecycle/ARCHITECTURE.md) and [acceptance](lifecycle/ACCEPTANCE.md). They do not lift any release gate. Advanced access requires operator-set entitlement/individual grants and confidential retention operations. The earlier ten-migration release-kit manifest is historical: regenerate for the current reviewed commit (twelve repository migrations) after hosted-only bridge reconciliation. Direct gateway/native chat remain disabled; no provider cutover or Preview credential reuse is implied.

Recommendation: **HOLD production promotion until production resources and final customer acceptance are verified.** This is release preparation for the existing product, not a rebuild of Q/CUE.

## Product position

LaunchStudio is the customer-facing business implementation platform. Pickaxe powers the existing AI workflows behind its API. Q/CUE, saved business context, versioned deliverables, approvals and guided progress are LaunchStudio's product experience. Access to GPT, Claude, Gemini and Grok is a valuable supporting feature, now prominent in the sidebar, mobile navigation and Start Here.

The branded portal should become the primary destination. Keep the current Pickaxe site and customer memberships operational during rollout. Existing Pickaxe billing is not automatically a verified Supabase identity or a LaunchStudio entitlement. Establish a verified account/entitlement mapping before directing existing paid customers to a replacement experience.

The four model buttons currently open their existing Pickaxe pages. They do not yet provide embedded API chats within LaunchStudio. Preserve those working links for an invited beta; a completely branded experience requires authenticated, metered, tenant-scoped API chat integration with those four model agents. This is distinct from the existing Idea Validator and Market Intelligence workflows.

## What is already complete

The user-provided build history records Q/CUE Phase 1 dashboard/provenance and Phase 2 durable recovery/history, including earlier hosted sign-in and isolation checks. These features exist in the branch. Staging schema and restricted worker provisioning are complete; do not recreate them or replay original migrations. CoVibeCoder adds 13 separately entitled manual development workspaces alongside the original 52 business tools.

This update also fixes draft retry after a successful write followed by failed history refresh, makes unavailable tab storage nonfatal, surfaces context-load errors, provides a read-only reload control, and routes Navigator's CoVibeCoder recommendation into the entitled project workspace.

## Why production was rejected, and the fix

The original `lib/config.mjs` explicitly rejected `VERCEL_ENV=production`; `lib/postgres-options.mjs` also accepted only the designated staging database. Those were intentional staging restrictions.

The code now permits production when it has an explicitly configured **different** Supabase project, matching public URL, restricted worker connection and Production-only Pickaxe credentials. Production cannot reuse the staging project or fall back to staging database/provider credentials. Preview remains bound to staging. PostgreSQL certificate and hostname verification remain enabled. Audience DNA remains a Preview-only pilot.

This removes the code restriction without treating the staging deployment as production-ready.

## Remaining work, in order

1. **Select/provision the production backend.** The connected LaunchStudio Supabase account currently lists only designated staging project `exghrllltefuhsgnagym`. Use a separate production project, review its schema and establish backup/restore settings. Apply reviewed migrations once to a new empty production project. Provision the restricted `launchstudio_worker` credential securely. Do not use a database admin credential in the app.
2. **Configure the production deployment.** The available Vercel project is `launchstudio-staging`; its application variables are Preview-only. Create/designate the production Vercel project, use root `apps/staging-portal`, include source outside that root, and configure the variables below for Production only. Connect the intended customer domain, configure Supabase Auth site/redirect URLs, verify invitation or registration/email delivery, and configure password security. Preserve Preview deployment protection. The current UI provides password sign-in; define and verify account provisioning and password recovery before a public self-service launch.
3. **Complete final customer acceptance on the release candidate.** With two legitimate confirmed customers, verify sign-in, business profile, Idea Validator → approval → Market Intelligence, exact source versions, refresh/new session, tenant denial, manual deliverable lifecycle and CoVibeCoder entitlement enforcement. Earlier phase evidence counts as historical evidence; synthetic browser fixtures do not establish acceptance of the final combined release. Current automation has no confirmed Customer A/B credentials or sessions available.
4. **Verify the operating boundaries.** Confirm Pickaxe API execution scopes, credits/spend limit, worker connectivity, security-advisor findings and intentional privileged RPC boundaries. Configure the intended initial CoVibeCoder customer grants. Use an invited beta if the billing/account bridge and embedded four-model chats are not ready; do not advertise unconnected tools as executable AI or external build integrations.
5. **Release the tested production build.** Once the gates pass, mark PR #1 ready, merge it and build the production target without moving customer traffic. Verify production sign-in and a synthetic workflow against the production backend, then promote the tested build. Keep a known rollback deployment and verify error logging. A production promotion is a separate action from a Preview deployment.

## Production variables

| Variable | Requirement |
|---|---|
| `SUPABASE_URL` | Exact `https://<production-reference>.supabase.co` |
| `SUPABASE_PUBLISHABLE_KEY` | Production project's publishable client key |
| `LAUNCHSTUDIO_PRODUCTION_SUPABASE_PROJECT_REF` | Explicit production reference; staging reference is rejected |
| `LAUNCHSTUDIO_PRODUCTION_DATABASE_URL` | Production `launchstudio_worker` URL with verified TLS |
| `PICKAXE_PRODUCTION_API_KEY` | Server-only credential authorized for the existing agents |
| `PICKAXE_PRODUCTION_WORKSPACE_ID` | Correct workspace scope for that credential |

Enter credentials directly into the deployment secret manager. Never paste them into chat, put them in browser code, or commit them. No values were copied from Preview into Production during this work.

## Migration tracking

The original hosted migration version mapping is documented in `staging/HOSTED_ACCEPTANCE.md`; hosted versions differ from repository filenames. The latest read-only staging inspection reports 13 RLS-enabled public tables, 10 migration records and a worker with LOGIN, NOSUPERUSER, NOBYPASSRLS and NOINHERIT. It also identifies hosted-only `qcue_bridge_initial` (`20261112034810`) and `qcue_state`, beyond this branch's core migrations. Preserve them; reconcile that supplemental bridge with its owning implementation before treating a production schema copy as complete. No schema, worker grant, existing customer record or bridge data was changed in this update.

## Evidence for this update

- Next.js build passes.
- 26 unit/database tests pass, including production/staging separation, restricted TLS and production-only provider credential selection.
- Existing restricted-worker PostgreSQL regression passes.
- Existing browser suite passes its 12 accessibility/overflow combinations and 12 interaction checks, plus AI Workspace placement assertions; all four model destinations are preserved.
- CoVibeCoder browser fixture passes all 13 workspaces and verifies that both an interrupted response and a failed confirmation read cannot create duplicate draft versions. Dark/light axe checks report no violations for the tested WCAG rules.

These browser fixtures use synthetic sessions. Actual deployed authentication-boundary smoke is documented separately; full current customer A/B acceptance is still not claimed. PR #1 stays draft while those release conditions remain open.

Protected Preview for the application update: https://launchstudio-staging-8yrhg4l9t-xoderxs-projects.vercel.app (`811fd7e`, deployment `dpl_CqNFCqVsTTZnnmWCb31obsPvUxxm`, READY). Real Chromium smoke reached sign-in, loaded public configuration and verified invalid-login recovery and the unauthenticated workflow 401. No customer sign-in was fabricated. Temporary deployment-scoped access was revoked after testing. See [hosted smoke evidence](release-review/hosted-smoke.json). The following documentation-only commit records this result; it changes no tested application behavior.
