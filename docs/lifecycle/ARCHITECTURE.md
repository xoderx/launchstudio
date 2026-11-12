# LaunchStudio lifecycle expansion

Baseline: `1ea24bad6988f54917ff56bae77084ff387fb268`, inspected before implementation. PR #1 remains draft/unmerged. One platform, existing customer identities/projects, protected Preview only.

## Five coordinated batches

| Batch | Implemented foundation | Boundary |
|---|---|---|
| 1 · Architecture/positioning | `/transform`, `/exit-ready`, homepage Advanced Business Solutions, six service interests, brand map and canonical solution redirects | No approved prices, valuations, testimonials or service guarantees |
| 2 · TransformOS | Ten evidence-led dimensions, nine editable planning deliverables, 90-day initiatives/owners/milestones/KPI references, approved source snapshots, immutable versions and review approvals | Customer-authored planning; evidence/confidence are explicit manual attestations, not automated verification |
| 3 · ExitReady | Progressive intake, ten planning modules, explicit-assumption scenario arithmetic, private Enterprise Value Center, individual grants, audit and access expiry | No certified valuation, brokerage, tax/legal service, advisor invitations, document upload or buyer access |
| 4 · AI independence | Pickaxe compatibility interface, AI SDK 7 gateway structured-output adapter, disabled native workspace interface, same-ledger budget reservation and offline comparison framework | No live direct-provider execution, model cutover or native history/streaming; final settlement/persistence wiring remains a pilot prerequisite |
| 5 · Experience/verification | Unified optional lifecycle navigation, program/project switching, restricted SQL tests, browser regression, accurate readiness and release evidence | Synthetic local tests are distinct from actual hosted unsigned smoke and still-blocked signed-in customer acceptance |

## Brand relationships

- **LaunchStudio** is the umbrella business implementation platform.
- **Q/CUE** coordinates saved context, approved work, milestones and next steps.
- **CoVibeCoder** is the separately entitled software-building planning suite, useful at any lifecycle stage.
- **TransformOS** supports business transformation and value creation.
- **ExitReady / TradeExit** supports exit readiness and value acceleration; succession or continuity need not mean selling.
- **OUTCAAS** describes optional managed implementation/outcomes services by agreed scope; submitting an inquiry does not engage a service.

The original registry remains 65 entries: 52 business tools plus 13 CoVibeCoder tools. Advanced programs are not fabricated registry positions 66 onward. The 52-week academy, 11 flagship playbooks and original four-stage tool definitions remain unchanged. Two existing AI assessments retain the Pickaxe path; Audience DNA stays paused. Other provider APIs and automated software builds remain unverified.

## Persistence and access

Advanced work reuses `businesses`, `business_projects`, authenticated customer identity and the existing private membership helpers. It is deliberately excluded from ordinary `tool_deliverables` and public assessment tables: those tables' ordinary business permissions are too broad for financial/deal information. This is a restricted extension of the same database, not a second customer database.

Four new RLS-enabled tables in `launchstudio_private` hold advanced entitlements, individual access, immutable planning snapshots and metadata-only audit. No grants allow direct anonymous, customer or AI-worker table access. The narrow `public.advanced_workspace` RPC checks a signed-in identity, live program entitlement, explicit individual grant and existing business membership on every read/write/approval. Even a business owner needs a program grant. A reader cannot save; an editor cannot approve; an approver must also retain ordinary editor/owner permission for writes. Archived projects cannot be changed. Grants and entitlements are provisioned by an authorized operator, never self-service; none were created for existing customers.

Each save uses a customer request UUID, immutable version and original content. Reusing its UUID with identical content returns the same version; altered content is rejected. Approval applies to an exact unexpired version and never changes its content. Revising creates a new draft, preserving prior approvals. Read, save and approval successes append only actor/project/program/version/action metadata to audit. Denied requests fail their transaction; they are not claimed as separately persisted denial audit events.

Private drafts and pending request payloads exist only in React memory. They are never placed in local/session storage, general application activity, AI prompts or logs. An ambiguous save disables edits and retries the same in-memory request; refresh retrieves saved history instead of automatically replaying a request. Unsaved private drafts do not survive navigation. Users are explicitly told to save before switching. The UI checks authorization every 15 seconds and clears content when it cannot verify access. Revocation is immediate at the database boundary; already rendered memory may remain until the next check, and previously downloaded exports cannot be revoked.

Approved assessment context is imported only on explicit request from the selected project under its existing RLS. The snapshot includes assessment ID/version and a bounded excerpt, clearly marked as potentially truncated. Existing planning versions retain their earlier snapshot. References are customer-review planning evidence, not an independent attestation that every imported claim is true. Confidential advanced content is never automatically handed back to ordinary business tools or any model.

Program entitlements set 1–365-day retention (default 180). Each saved record has an expiry; expired versions are excluded by the RPC even when addressed directly. Physical deletion, backups and audit-retention scheduling require an approved retention policy/operator procedure before production. File upload and signed file URL delivery are intentionally unavailable until a private bucket, narrowly authorized access, malware controls and retention procedures are verified. The current evidence inventory stores reference descriptions only, with no automated fetching of links or documents.

## Gateway choice and execution boundaries

Choose **Vercel AI Gateway with AI SDK** as the initial direct execution foundation: existing Next.js/Vercel hosting, structured output support, one authentication/routing surface and operationally fewer moving parts. AI SDK `7.0.170` is pinned; its bundled structured-output/generateText documentation and the live public model catalog were inspected. No stale model ID is hard-coded as available. Server policy must allowlist a verified catalog ID for each approved model family.

LiteLLM is a viable alternative when self-hosted routing, virtual keys and centralized spend governance across non-Vercel systems justify operating its proxy, database, upgrades and availability. That need is not demonstrated here; do not run a second gateway now. Neither gateway's account-wide soft limits alone provide a hard per-customer worst-case budget.

`runtime.agentRunner()` now delegates through `executionRouter` → Pickaxe compatibility, preserving its exact assessment arguments/result/recovery callbacks. Direct provider selection is rejected at that existing path. No fallback automatically moves an ambiguous Pickaxe request elsewhere.

The preparation contract `executeReservedAI` requires server-approved model/input/output limits, an authorized actor/project/request, explicit approved context opt-in, a verified credential/budget policy and non-confidential context. It rejects native streaming until its secure persistence exists. All exceptional adapter or persistence outcomes become unknown and retain their reservation; no retries are issued. The gateway adapter uses `maxRetries: 0`, bounded output, a timeout and structured schema validation.

The existing `workflow_requests` ledger is extended with provider/model and budget reservation metadata. It remains the sole execution request ledger; no separate execution queue/table is created. An `ai_budget_accounts` policy table supplies operator-set customer/plan cost/token limits and a current accounting period. Its atomic claim locks the existing request, rechecks project editor/owner membership, reserves conservative maximum cost/tokens once and changes queued → running. Disabled/expired/unconfigured/exhausted accounts fail closed. The existing Pickaxe dispatcher can claim only Pickaxe rows. No customer endpoint reserves or dispatches gateway rows.

The new ledger's completion settlement is atomic and idempotent, requires an injected transactional assessment/provenance persistence sink and verified authoritative provider cost/tokens, and rejects charges above the reserved envelope. The gateway adapter does not yet supply verified accounting or a bound assessment sink, so live completion remains disabled. Unknown reservations are not released automatically. Do not enable the gateway on the strength of these adapter tests: actual credentials, model availability, price ceilings, live cost reporting, completion persistence, operator reconciliation and per-plan accounting reset must pass first. No new provider credential or budget was created, and no customer data was sent to a new model.

## Native AI Workspace activation plan

The disabled interface previews GPT/Claude/Gemini/Grok family selection, context opt-in and message controls. Existing working Pickaxe links remain intact. Before enabling one family:

1. Verify gateway credentials, exact model/catalog/retention compatibility and an application worst-case spend envelope.
2. Add tenant-scoped conversation/message persistence using the same project authorization; do not put message bodies in the execution ledger or client storage. Define retention/deletion and audit handling first.
3. Bind conversation dispatch to the existing ledger, approved context snapshot and atomic customer budget. Return streaming events only after authorization and reservation; record terminal state/usage and cancellation/unknown outcomes.
4. Wire error-safe result persistence and reconciliation. Never issue replacement submissions after an uncertain response. Avoid model fallback until provenance, budget and recovery behavior have been verified.
5. Run real signed-in customer A/B staging tests, credits/cost checks, refresh/history/isolation and provider failure tests. Enable only an explicitly enrolled pilot tenant, leaving other model links unchanged.

## Provider comparison

`node scripts/compare-providers.mjs` emits an explicitly not-run report by default. Supply only approved synthetic result records to compare input digests, structured shape, immutable source references, token/cost/latency observations, failure and recovery. Do not enter secrets or real customer data into fixtures. Review deliverable quality with a human rubric: source faithfulness, usefulness, evidence/assumption separation and safe actions. Missing live metrics remain null; no fabricated cost or quality winner is selected. There is no automatic cutover. Raw comparison records remain local under ignored `work/`.

## Security advisors and production

The new RPC intentionally adds one authenticated-executable SECURITY DEFINER warning (six total); its empty search path, revoked anonymous/worker execution and explicit grants/entitlement/membership checks are covered by actual restricted-role SQL tests. Four private tables intentionally have no caller RLS policies or direct grants, adding INFO findings alongside existing `qcue_state`. The preexisting leaked-password warning remains. See [RPC review guidance](https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable) and [password protection](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection).

Staging-only additive migrations: `20261112060409_lifecycle_foundation.sql` and `20261112062328_ai_meter_settlement.sql` (narrow meter column privileges). No historical migration was replayed and the hosted-only Q/CUE bridge remains untouched. Reconcile that bridge before production schema preparation. The prior ten-file production asset manifest is historical; the current repository adds two migrations (twelve total) and must be repackaged after release gates pass. PR #1 stays draft; all Production requirements in `docs/PRODUCTION_RELEASE.md` remain active.
