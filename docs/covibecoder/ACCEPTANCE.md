# CoVibeCoder staging acceptance report

Date: November 11, 2026 (America/Phoenix). Recommendation: **HOLD for customer release; protected Preview review only.**

The fifth suite implements useful manual product-development workspaces and handoffs. It does not claim AI generation, external builds, repository synchronization, or deployment execution. The two existing executable business integrations are unchanged. PR #1 remains draft and unmerged.

## Scope and preservation

Started from `f64f70f3670f44f8515f11c1a142e9597ddbc7a2`. During implementation the remote branch advanced through visual-redesign PR #2 to `52b2f23e0aff2bfb6488f3e39fb680719e30a1de`. The redesign was merged and preserved, and CoVibeCoder was integrated into its responsive shell and navigation. Existing redesign regression checks were repeated.

All 65 registry positions are represented: 52 business tools and 13 separately entitled CoVibeCoder commander workflows. The registry, original four business tool-spec files, business readiness report and 52-week academy are unchanged. The CoVibeCoder specifications preserve registry names, positions, null individual provider IDs, commander ID and prompt-file identity. New local specification keys do not invent external provider identities.

## Passed

| Check | Evidence | Boundary |
|---|---|---|
| Catalog reconciliation | 65 unique positions; 13 preserved commander workflows; tailored fields, 3 starters and 3 deliverables per CoVibeCoder tool | Source and executable tests |
| Existing workflow regression | `cd staging && node test.mjs` passed | Disposable PostgreSQL; synthetic Auth and agent responses |
| Unit/database tests | `node --test *.test.mjs ../apps/staging-portal/lib/*.test.mjs`: 23 passed, 0 failed | Includes actual SQL/RLS, migration, provider adapter contract, provenance and recovery tests |
| CoVibeCoder persistence | 13 tool saves, immutable revision, approval, idempotent retry, project separation and close/reopen verified | Disposable PostgreSQL with the real migration files |
| Entitlements | Customer self-grant denied; owner/editor writes; viewer write/approval/import denied; revoked and expired access denied; original business saves still work | Actual SQL/RLS in disposable PostgreSQL |
| Tenant isolation | Foreign reads, save, approval, import and progress denied; same-business viewer read permitted; revocation survives restart | Synthetic identities, not hosted customer sessions |
| Context import | Latest approved source versions imported; unapproved newer draft excluded; cross-business import denied; reimport preserves prior deliverable source history | Actual SQL/RLS |
| Browser UI | All 13 tailored forms and starters, save/reopen, approve/revise, progress, interrupted-save refresh without duplicate, export, source-context display, project switching and denied membership state | Local browser with intercepted Supabase transport and a clearly synthetic session |
| Accessibility | CoVibeCoder axe WCAG A/AA checks in dark/light themes; labeled visible controls, keyboard focus movement and 390px layout | Automated subset; no full manual assistive-technology audit claimed |
| Redesign regression | Existing test suite passed 12 accessibility/overflow combinations and 12 interaction checks without console errors | Local synthetic browser fixtures |
| Build | Next.js production build and public site builder passed | Build verification, not a production deployment |
| Hosted schema | New RLS-protected entitlement/context tables; anonymous import/progress execution denied; direct customer entitlement/context writes denied | Read-only hosted catalog/privilege probes |
| Hosted browser auth boundary | Actual Chromium sign-in page, invalid-login error and unauthenticated workflow `401` | No customer sign-in or A/B acceptance claimed |
| Customer data preservation | Before/after: 2 businesses, 7 projects, 3 assessments, 3 versions, 5 runs, 0 tool deliverables | Migration did not enroll or edit existing customers |

## Hosted migration

Only new migration `20261112032053_covibecoder_suite.sql` was applied to designated staging `exghrllltefuhsgnagym`. Supabase recorded it as `20261112033124` (`covibecoder_suite`). Existing migrations were not replayed, repaired or rewritten. The position constraint expands to 65; existing rows and RPC signatures are retained. Zero suite entitlements and zero imports were created for existing customers. Provision membership for a selected staging business using the admin procedure in [README.md](README.md).

Security advisors report the existing leaked-password-protection warning and five authenticated SECURITY DEFINER RPCs, including the new import RPC. The privileged RPCs are intentional narrow write boundaries: anonymous execution is revoked, search paths are empty, and membership checks are explicit. The new import RPC additionally enforces editor access, an active target, suite entitlement and same-business source ownership. Disposable tests verify denial cases. The progress RPC is SECURITY INVOKER. Advisor warnings are documented, not reported as a clean security scan.

Remediation references: [privileged RPC review](https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable) and [leaked-password protection](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection).

## Blocked or deliberately disconnected

- Real hosted Customer A/B browser acceptance has not passed. The initial browser probe reached Vercel Login. The environment has no customer credentials or authenticated customer session. Supabase email registration is enabled with confirmation required; manufacturing a session or disabling confirmation is not an acceptance method.
- No existing customer was automatically given CoVibeCoder membership. A selected business needs an explicit operator grant for customer testing.
- GitHub, Lovable, Vibe SDK and Codex adapters have no connected credentials or passing execution tests. External action execution fails closed. Manual copy/export is available; no external build or deployment success is claimed.
- CoVibeCoder has 13 manual planning workspaces, 0 newly executable AI tools, 0 connected automated build adapters, and 0 verified external deployments. Approval of an artifact is not approval to write to a repository or deploy.

## Reproducible hosted manual acceptance

1. Open the protected Preview named in the deployment record below. Complete Vercel access normally. Use two separate browser profiles and legitimate confirmed Supabase staging accounts A and B; never use an admin/service key in the browser.
2. Sign in as A. Create a synthetic business/project, save the business context, and prepare an approved business plan or assessment. Record project and source version IDs without credentials.
3. Verify the original 52-tool directory and four-stage academy. Open CoVibeCoder before a grant and confirm a membership-required state and no customer self-enrollment action.
4. Have an authorized operator grant CoVibeCoder for A's test business only. Reload access. Import approved context from a project in that business. Confirm displayed source IDs/versions and absence of unapproved newer source work.
5. Complete step 1's tailored fields, prepare/review an outline, save, refresh, reopen, revise and approve. Repeat representative PRD, coding-prompt, schema, test-plan and deployment-checklist steps. Test JSON, Markdown, SQL/text section export and clipboard handoff. Confirm no external action is performed.
6. In Q/CUE, verify draft/approved/revision-pending milestones and the next logical step. Switch projects and return. Follow the source-project link back to the business program and verify saved context is intact.
7. Interrupt a save after the request is sent. Refresh. Confirm the same request is reconciled and at most one version exists for it. Confirm sign-out removes tab-local recovery data.
8. Sign in as B in the separate profile. Attempt A's project IDs and direct REST/RPC requests for drafts, imports, approvals and progress. Expect no foreign data and denied writes. Grant a viewer role deliberately to verify read-only access, then revoke it and retry.
9. Suspend or expire A's CoVibeCoder entitlement. Confirm reads, saves, approval, import and progress are denied while the original business program remains available. Regrant only if continuing the test.
10. Test keyboard-only controls, narrow layouts, dark/light themes, logout, expired sessions, browser refresh and network failure. Record actual outcomes and screenshots under the exact Preview commit. Do not mark these hosted tests passed from the local fixture results above.

## Deployment record

- URL: https://launchstudio-staging-cef3py31y-xoderxs-projects.vercel.app
- Deployment: `dpl_FrdaeAZAUTiHnQrCJnDeRuWLBsiX`; READY; Preview (`target=null`).
- Code commit: `a9f7b56af0fff9a19f3e9bc2b29c03503bc9b298` on `codex/supabase-integration`.
- Project: `launchstudio-staging` (`prj_AyFPF0bTcHzmjPWK3j5mboG9xjzl`), team `team_zM4TIpqHNjqGMI3SEAxGbC0A`.
- Verified Vercel Authentication applies to all Preview deployments. No production target, domain promotion, or external app deployment was requested.

Actual Chromium/Playwright browser smoke reached the hosted sign-in page (HTTP 200), loaded `/api/config` (200), confirmed an unauthenticated workflow POST returns `401 Sign in required`, and displayed the expected error after an invalid synthetic login. These requests used the deployed application without mocked responses. A temporary deployment-scoped Vercel share authorization was used for the smoke test and then revoked. This only authorizes deployment access; it supplies no Supabase customer session. See [hosted-preview-smoke.json](hosted-preview-smoke.json).

The subsequent documentation-only commit records this deployment; it does not change the tested application code. Production changes and external application deployments are outside this release.
