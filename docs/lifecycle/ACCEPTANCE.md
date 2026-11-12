# Lifecycle acceptance — protected Preview

Recommendation: **HOLD production**. Baseline `1ea24ba`. Five coordinated batches are documented in [architecture](ARCHITECTURE.md). PR #1 remains draft/unmerged. No current customer was enrolled, provider traffic switched or production resource changed.

| Check | Result | Evidence boundary |
|---|---|---|
| Next.js/Workflow build | PASS | Local build |
| Full unit/database suite | 41 passed, zero failed | Actual disposable PostgreSQL; synthetic identities/provider responses |
| Original restricted-worker regression | PASS, ownership/viewer/isolation, approved handoff, recovery and provenance | Auth/provider stubbed |
| Original customer UI | PASS, 12 accessibility/layout combinations, 12 interactions | Chromium, synthetic signed-in session |
| CoVibeCoder | PASS, all 13 tailored flows, save/version/approve/recovery/export/switching/entitlements | Chromium, synthetic session |
| Lifecycle UI | PASS, diagnostics, initiatives, save/revise/approve, ambiguous retry, refresh, scenario, private JSON export, project switch, reader/revocation and logout | Chromium, intercepted Supabase; not hosted customer acceptance |
| Lifecycle accessibility | PASS, eight program/theme/width combinations, zero tested WCAG A/AA violations; 390px no overflow | Automated subset |
| Public website | PASS, 64 page/theme/width WCAG/layout checks, metadata, navigation, original 52/13 catalogs and form UI | Actual local pages; final form success response/Auth config are explicit fixtures |
| Private data boundary | PASS, no ordinary-member access, foreign identity denial, explicit grants, reader/editor/approver boundaries, expiry, archived-project denial, idempotent immutable versions, metadata audit and worker denial | Actual restricted-role SQL |
| AI contracts and metering | PASS, Pickaxe compatibility, missing credentials/approval/context/model/input/output/cost gates, unknown no replay, atomic reservation/ceilings and idempotent verified settlement | SDK call and assessment persistence sink stubbed; actual SQL metering |
| Provider comparison | Framework ready, live comparison NOT RUN | No new paid provider calls or fabricated quality/cost/latency results |
| Hosted signed-in Customer A/B | BLOCKED, legitimate sessions unavailable | Not established by fixtures |

Two additive staging migrations were applied: `20261112060409_lifecycle_foundation.sql` (hosted `20261112061212`) and `20261112062328_ai_meter_settlement.sql` (hosted `20261112062434`, narrow metering column privileges). Historical SQL and the hosted-only bridge were not replayed or changed. Before/after core counts remain two businesses, seven projects, three assessment versions, zero tool deliverables and one workflow request. Zero advanced entitlements, individual grants or enabled gateway budget accounts were created for existing customers.

Supabase reports six intentional authenticated SECURITY DEFINER RPC warnings (one new), five no-policy INFO findings (four locked private tables plus existing `qcue_state`) and the preexisting leaked-password warning. This is not a clean security scan. [RPC review guidance](https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable).

## Honest readiness

The registry remains 52 canonical business tools plus 13 CoVibeCoder workspaces, unchanged. Two existing Pickaxe assessments retain their execution path; Audience DNA stays paused, other business provider APIs unactivated and external software builds disconnected. Advanced programs are useful manual foundations, locked on hosted Preview until a chosen eligible test customer receives operator grants. No AI-generated transformation plan, certified valuation, brokerage service, advisor invitation, signed document upload, native conversation or newly verified gateway execution is claimed.

Private planning is stored through the audited RPC, never ordinary business APIs or browser storage. Per-version access expires under the configured retention period. Physical purge, backups/audit retention and signed file storage require approved operational controls before production. Exported downloads cannot be revoked. Unknown-save recovery retries the same in-memory request; refresh reads saved history and never automatically resubmits. Unsaved private drafts do not survive navigation.

## Reproduce and complete hosted acceptance

Install locked dependencies with `npm ci` in staging and portal. From root run `node --test scripts/*.test.mjs staging/*.test.mjs apps/staging-portal/lib/*.test.mjs`; run `node test.mjs` in staging and `node build.mjs` in site. Build/start the portal locally and run `npm run test:ui`, `npm run test:marketing`, `python tests/covibecoder-browser.py` and `python tests/lifecycle-browser.py` from its directory. Browser fixture tests are local only. Reproduce inventory/comparison with the scripts documented in architecture.

For hosted acceptance, use protected Vercel access and two legitimate Supabase customers. An authorized operator must deliberately configure program entitlement, retention and individual reader/editor/approver grants for the selected test business, preserving ordinary membership. There is no customer self-grant UI. As A, verify the original signed-in approved Idea Validator → Market Intelligence handoff in a new session, original drafts and CoVibeCoder. In TransformOS import approved source snapshots, enter diagnostics, create accountable initiatives and save/revise/reopen/approve. In ExitReady progressively enter synthetic financial assumptions and verify private history/export. Check source versions, project/program switching and unchanged prior snapshots.

As B, guess A's project/version IDs through the RPC and direct general/private data reads; expect denial. Test explicit reader/editor/approver roles, then revoke/expire access. Database denial is immediate; rendered data clears on the next UI check (up to 15 seconds). Verify version expiry and unavailable/expired sessions. Record actual results against the final Preview commit; do not substitute these local fixtures.

Direct-provider activation additionally needs verified credentials/model/retention, authoritative usage/cost, the bound assessment/provenance sink, budget period/reset/reconciliation procedures and one approved synthetic tenant pilot. Native secure history/streaming and private signed-file storage remain gated. Production still requires separate infrastructure, identity/membership continuity, final legal/retention approval, hosted-only bridge reconciliation and the existing release gates.

## Final protected deployment

- Code commit: [`1715415c3713a342dff47cdfe953b33f8798d76e`](https://github.com/xoderx/launchstudio/commit/1715415c3713a342dff47cdfe953b33f8798d76e).
- Preview: https://launchstudio-staging-kj8izwiw1-xoderxs-projects.vercel.app
- Deployment: `dpl_G262s11gkUpjBo4VJeR4om2TaTBW`, READY, Preview target; Vercel protection remains active.
- Actual hosted Chromium, no mocked responses: homepage and 16 routes returned 200 after redirects; canonical solution aliases reached `/transform` and `/exit-ready`; Preview noindex, keyboard skip, signed-out `/app#qcue` → `/login#qcue` and unauthenticated workflow 401 passed.
- Real Value Acceleration Advisory form submission returned 201, repeat returned 201 without another row, missing consent/honeypot returned 400, forged cross-origin request blocked by browser/platform. Independent admin SQL confirmed exactly one consent-bearing `value-advisory` record for request `11b78212-7933-4078-9570-7c80c7fe8c10`. No account, service engagement or entitlement was created.
- Core counts stayed unchanged; advanced grants/entitlements and gateway budget accounts remain zero. Temporary deployment-scoped access was revoked.
- Latest local lifecycle browser rerun passed after the final build, including eight zero-violation module/theme/width checks. Earlier verification caught and corrected a populated-textarea label issue and disposable teardown dependencies; final checks passed.

Evidence: [hosted results](hosted-verification.json), [hosted desktop](hosted-home-desktop.png), [hosted mobile](hosted-home-mobile.png), [real inquiry success](hosted-lead-success.png), [synthetic workspace browser results](browser-verification.json), [TransformOS capture](screenshots/lifecycle-transform-desktop.png), [ExitReady capture](screenshots/lifecycle-exit-desktop.png). Workspace captures use synthetic sessions/data and are not evidence of a hosted customer login. The subsequent documentation-only commit records the tested code above.
