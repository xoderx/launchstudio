# Marketing website acceptance — protected Preview

## Scope and release decision

The complete public marketing website is implemented alongside the preserved customer application. Production release remains **HOLD**. PR #1 must remain draft. No production deployment, account migration, billing change or Pickaxe configuration change is authorized by this website task.

## Verification

| Check | Result and evidence |
|---|---|
| Next.js production build | PASS |
| Restricted-role workflow database regression | PASS, two synthetic tenants, approvals, provenance and recovery |
| Node unit/database suites | PASS, 32 tests |
| Public browser accessibility/layout | PASS, 56 page/theme/width combinations; see `browser-verification.json` |
| Existing customer browser regression | PASS, 12 accessibility/layout combinations and 12 interactions, synthetic Auth fixtures |
| CoVibeCoder browser regression | PASS, 13 tools, saving/versions/approval/recovery/export/project switching/entitlements; synthetic Auth fixtures |
| Existing static site builder | PASS, 52 tools and six downloads; unchanged and unpublished |
| Lead SQL permissions/persistence | PASS, actual disposable PostgreSQL, restricted worker, idempotency, quotas, no anonymous/customer access |
| Local form interaction | PASS with explicitly intercepted success response; not hosted persistence evidence |
| Hosted Preview and real lead | Pending deployment verification; do not infer success from local fixtures |
| Real signed-in Customer A/B | BLOCKED: no legitimate customer credentials/session available; existing hosted acceptance runbook remains required |

Mobile Lighthouse on the local production build: performance **86**, accessibility **100**, best practices **100**, SEO **69**. The SEO reduction is the intentional Preview `noindex`; all other SEO checks pass. LCP 4.1 seconds, CLS 0. See `lighthouse-summary.json`. Browser screenshots show actual rendered public pages. Embedded Q/CUE captures show the actual app with clearly labeled synthetic data, not customer outcomes.

## Data and readiness

One additive lead migration was applied to staging only (hosted `20261112044212`). Customer record counts were unchanged: two businesses, seven projects, three assessment versions, zero tool deliverables. Lead RLS is enabled. Anonymous and authenticated customers have no direct lead read/write access; the worker cannot read lead email/goal. No new SECURITY DEFINER function was added.

Original readiness is preserved: two connected AI assessment workflows, Audience DNA paused, 49 remaining business provider APIs unactivated. All 52 business tools remain separate from 13 manual CoVibeCoder planning tools. Existing Pickaxe model links are available; embedded chats and external software building/deployment are not claimed as working.

## Production blockers

- Approve final legal operator/contact, privacy/terms/AI disclaimer, and lead retention/deletion policy. The website labels these documents as drafts.
- Provision and verify separate Production backend/secrets, membership/billing and account migration decisions. Preview credentials must not power Production.
- Complete legitimate signed-in Customer A/B hosted acceptance, provider execution and recovery checks before claiming customer readiness.
- Review existing Supabase advisories: leaked-password protection is disabled and existing SECURITY DEFINER findings remain; no new lead-table warning was introduced.
- Confirm final public origin, explicitly enable indexing only for approved public pages, and complete final performance/content review.

Pickaxe remains an execution/model-access provider within LaunchStudio. LaunchStudio owns the customer experience, context, saved work, approvals and Q/CUE progression. No provider replacement or unverified integration was introduced.
