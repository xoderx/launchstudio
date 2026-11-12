# CoVibeCoder fifth product suite

CoVibeCoder adds the registry's existing positions 53–65 as a separate 13-step software development pathway. The original 52-tool business program, four category specifications, readiness claims, and 52-week academy remain separate. The registry itself is unchanged. These 13 identities are workflows of `launchstudio-covibecoder`; they are not 13 newly connected AI agents.

The signed-in customer selects the CoVibeCoder suite for the current business project. Each step has three tailored required inputs, three prompt starters, three structured deliverables, a guided exercise and a review gate. The shared workbench provides immutable saved versions, editor approval, JSON export, Markdown export, section exports (`.md`, `.txt`, or review-only `.sql`) and clipboard handoffs. **Prepare planning outline** creates a deterministic outline from customer inputs; it is not an AI generation claim.

Q/CUE development progress is computed from all saved CoVibeCoder versions through an RLS-respecting aggregation. A newer draft is shown as a revision pending even when an older version was approved. Approving a deployment checklist records planning review, not a deployed application. The suite presents an explicit next step and preserves the selected business project when returning to the business program.

## Approved context and source history

Import approved work from a source project in the same business. The server, not the browser, builds a bounded snapshot of the latest approved version per assessment and per business tool. This supports business plans, research, audience profiles and product specifications already stored in LaunchStudio. Unapproved newer drafts are excluded. A maximum 128 KB import prevents unbounded context transfer; over-limit imports fail explicitly.

The snapshot records source project, immutable artifact IDs and versions. CoVibeCoder saves copy those references into each new deliverable's source history. Reimporting newer approved work does not rewrite old versions. The last approved prior CoVibeCoder step is also linked. Cross-business imports are denied even if the same user can access both businesses, avoiding implicit redistribution to a different tenant's members.

## Separate entitlement

`business_suite_entitlements` controls CoVibeCoder per business. No existing customer is automatically enrolled. Authenticated customers can read their own business entitlement but cannot insert, update or delete grants. An operator with authorized database administration access can configure a grant in staging:

```sql
-- Replace :business_id using your admin tool's bound parameter support.
insert into public.business_suite_entitlements(business_id,suite,enabled,expires_at)
values (:business_id, 'covibecoder', true, null)
on conflict (business_id,suite) do update
set enabled=excluded.enabled, expires_at=excluded.expires_at, updated_at=now();
```

Set `enabled=false` to suspend access, or set `expires_at` for a time-limited grant. Reads, save RPCs, approval RPCs, context import and progress all enforce the grant and current membership. Owner/editor may write; viewers may read only. Existing business-program access and billing are unchanged. No payment checkout or membership purchase flow is implied.

## Recovery

An unconfirmed CoVibeCoder save retains its request ID and draft in the current browser tab under the signed-in user, project and tool key. Refreshing reloads the draft and checks saved history. A retry uses the same idempotent RPC request and cannot create another version for that request. The editor is locked until the pending save is confirmed. Sign-out removes the suite's recovery data. Saved versions remain the authoritative history; ordinary unsaved edits are not advertised as durable autosaves.

## Build environment adapters

GitHub, Lovable, Vibe SDK and Codex have explicit capability and authorization descriptors in `staging/build-adapters.mjs`. They are **not connected**. `executeExternalAction` fails closed. No provider API, repository write, deployment, deletion, production change or synchronization is executed by this suite.

Manual workflow: review an artifact, copy its context-aware build prompt or export it, open your authorized external environment, identify the exact repository/project/branch and artifact version, then explicitly approve the intended action there. Return review evidence to the next CoVibeCoder draft.

A future connected adapter must verify credentials, target-specific permissions, a scoped connection test, and execution tests. It must bind an explicit approval to provider, action, artifact ID/version/content digest and exact target, reauthorize immediately before execution, reserve a durable idempotency key, log the provider acknowledgment, and recover by lookup without repeating uncertain writes. Secrets stay server-side. Provider responses require validation before being presented as executed evidence. A reviewed planning artifact never supplies approval for an external write.

## Verification

Run `npm ci` in `staging/`, then `node test.mjs` and `node --test *.test.mjs ../apps/staging-portal/lib/*.test.mjs`. The CoVibeCoder database test uses disposable PostgreSQL and synthetic identities; it tests actual SQL/RLS behavior, not Supabase sign-in.

For local browser UI regression, install the portal dependencies, run `npm run build` and `npm run start -- --port 3000` in `apps/staging-portal/`, then run `python tests/covibecoder-browser.py` with Python Playwright and Chromium available. This test intercepts Supabase requests and uses a synthetic session. It is explicitly not real signed-in acceptance.

See [ACCEPTANCE.md](ACCEPTANCE.md) for observed results and remaining release gates. Do not merge PR #1 until its hosted two-customer acceptance gate passes.
