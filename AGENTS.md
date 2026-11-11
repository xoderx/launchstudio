# LaunchStudio engineering instructions

Start with docs/MASTER_SPEC.md, docs/DECISIONS.md and docs/PROGRESS.md. Use catalog/ for the agent identifiers and captured configuration evidence. The live site is hosted in the existing Pickaxe portal. Supabase exghrllltefuhsgnagym is staging only.

Run npm ci and node test.mjs from staging/. Run node build.mjs from site/. Work on scoped development branches. Keep all secrets in the connected environment. Preserve live agent prompts, memberships, billing and customer data. Do not publish a production change or run a consequential external action without the applicable approval.

The first release gate is a hosted, signed-in Idea Validator → Market Intelligence handoff across a new session, with a second customer's access denied. Local or stubbed tests do not satisfy that gate. Update the decision and progress logs after each substantive change.
