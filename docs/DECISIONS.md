# Decisions and changes

| Date | Decision | Status and rationale |
|---|---|---|
| 2026-11-11 | Keep the existing Pickaxe portal and specialist IDs | Verified. All 52 core positions mapped to existing entries. |
| 2026-11-11 | CoVibeCoder is one commander with 13 workflows | Verified. Keep the 65-position plan distinct from the number of separate agents. |
| 2026-11-11 | Lead with the Business Launch & Growth Accelerator | Verified on the published public page. Direct chat links remain for Universal AI and Outcome Recipes. |
| 2026-11-11 | Use only the designated Supabase staging project | Approved. Reference exghrllltefuhsgnagym. User reported active and empty. Connector access remains denied. |
| 2026-11-11 | Verify identity before enabling shared context | Approved. Use verified Supabase Auth claims in staging. A Pickaxe portal-to-Supabase identity bridge requires proof. |
| 2026-11-11 | Require approval and record the exact source assessment version | Implemented and tested locally. This prevents ambiguity when an unapproved newer draft exists. |
| 2026-11-11 | Build Q/CUE and additional workflows after the hosted gate | Approved sequencing. Keep production pricing, action approvals and release decisions separate. |

Earlier public and premium plan suggestions were not approval to change billing. See PRICING.md.

The full November 11 conversation clarifies that a future independent portal, ChatGPT Project organization, and GitHub synchronization are options. The existing Pickaxe portal and local repository remain the current implementation. Product or pricing proposals become approved changes only when confirmed and recorded here.

## Staging PostgreSQL TLS

Use Supabase’s published PostgreSQL CA for the dedicated staging worker connection and require certificate and hostname verification. Keep the restricted-role endpoint allowlist and discard URI SSL options.

## Staging Pickaxe workspace scope

Select the configured Pickaxe workspace on both background submission and polling when using a personal API key. Keep the workspace setting in Vercel Preview, and use the application request ID for correlation. Do not automatically submit again after a provider or persistence failure.

Market Intelligence sends a bounded excerpt when the full context exceeds its Pickaxe message budget. Keep the complete assessment and its exact approved-version reference in Supabase.

Project names and goals use the existing project editor policy. Older projects keep their IDs and goals and display a default name until an editor names them.

Q/CUE Phase 1 reads project and business context through the signed-in Supabase client and the existing RLS policies. Progress reflects saved assessments and workflow records. Keep existing project management, Idea Validator, approval, and Market Intelligence actions. The other roadmap tools do not execute from Q/CUE.

Q/CUE Phase 2 reserves one unresolved workflow request per project in Supabase before Vercel dispatch. A worker can submit only after claiming its dispatch ID. It records the provider ID before polling. Recovery uses that ID for GET only and preserves the original assessment provenance. Unknown outcomes without an ID and unreconciled legacy failures require operator review.

Project histories use descending creation time plus the immutable row ID as a keyset. The signed-in Supabase client performs the database queries under RLS. Older pages stay anchored until the customer chooses to show the newest records.
