# Pickaxe dependency audit

Machine-readable registry, archived model metadata, prompt-file identities and source references: [pickaxe-inventory.json](pickaxe-inventory.json). Reproduce with `node scripts/audit-pickaxe.mjs`. It covers all 65 stable registry positions and scans application, worker/test and historical site source for references without copying prompt bodies or secrets.

| Dependency | Confirmed implementation | Unverified / migration requirement |
|---|---|---|
| Idea Validator | `YL7LGN8AV2`, Markdown assessment via existing ledger/persistence | Current final customer A/B acceptance still required |
| Market Intelligence | `RYAET6419X`, pins approved Idea Validator source; bounded context excerpt | No new live dispatch in this assignment |
| Audience DNA | `SCV7PECQF3`, structured sections and approved sources; Preview pilot disabled | Execution entitlement, cost and pilot acceptance |
| Other 49 business tools | Archived definitions, prompt source identity, tailored manual drafts | Provider execution is not activated by this work |
| CoVibeCoder | 13 preserved commander workflows with manual planning/export | Individual provider IDs are not invented; build/sync/deployment adapters disconnected |
| API | `POST /v1/completions`, `GET /v1/completions/{submissionId}` at `https://api.pickaxe.co` | Adapter contract is tested with fixtures, not a fresh vendor entitlement claim |
| Authentication | Bearer server-only key; `pxu_v1_` personal keys require `X-Pickaxe-Workspace-Id`; separate Preview/Production variable names | Metadata presence does not prove execution rights, credits or correct workspace ownership |
| Input | `{pickaxeId, message, background:true}` with request identity; inspect `staging/pickaxe-adapter.mjs` for authoritative payload | Message/token limits vary by agent/provider plan; no general 52-tool allowance inferred |
| Output | Background acknowledgment ID → polling state → string result validated before saving | Invalid/empty/ambiguous results are failures, not deliverables |
| Context | Business profile/project goal and exact approved source references, bounded Market Intelligence message at 2,800 UTF-8 bytes after observed 3,000-token provider rejection | Bytes are a conservative input limit, not a claim of exact billed tokens |
| Recovery | Saved provider submission acknowledgment; lookup only, never replacement submission for unknown acceptance; existing durable request/run provenance | Legacy failed requests without acknowledgments need operator review |
| Model access | Existing GPT `KOEJIMYFST7VPG7`, Claude `5X40O6LNOBFUY32`, Gemini `ZF678T7OGE9A0TH`, Grok `R02X6IY3A0918M3`, Universal `ZEHJ2MG2K4Z022Y` external portal links | Availability/allowances are governed by the user's existing Pickaxe account; no native chat claim |
| Portal | `https://studio.pickaxe.co/STUDIOSAG26QENFZXNY0957VNT/launch/` and unchanged historical site builder | No customer traffic moved, memberships canceled or public configuration published |
| Billing/identity | Existing memberships and billing remain operational | No verified API billing bridge or one-to-one Supabase entitlement mapping; no automatic import/cancellation |
| Prompts/model settings | Archived catalog captures are review inputs | No live prompt, model, knowledge, action or membership setting modified; current vendor routing may differ from archive |
| Usage/cost | Existing account/provider limits; new direct foundation has separate disabled customer reservation policy | No complete historical Pickaxe token/cost export available; comparison harness leaves metrics null |

The migration path is incremental: keep Pickaxe's compatibility adapter, verify a synthetic direct-provider pilot with hard application limits and result/provenance persistence, compare observations, then consider an explicitly enrolled tenant flag. Keep selection reversible; never resubmit an unknown request through a different provider. No paid comparison calls or external customer-data exports were made here.
