# Architecture

Pickaxe hosts the portal, the existing specialist prompts and entitlements, and the native customer navigation. The public page builder consumes the reconciled catalog. It does not own customer records.

The staged service verifies Supabase Auth server-side, authorizes project membership, sends a bounded context to one allowlisted specialist, and saves a versioned assessment. Customer profiles, businesses, memberships, projects, runs, assessments, assessment versions and progress have RLS. A narrow RPC approves an Idea Validator version. Market Intelligence records the exact approved version consumed. The backend credential belongs in a staging secret store.

Q/CUE should read project goals, versions and progress from the same authorized service. Track provenance and disclose blocked or unavailable actions. Do not accept a browser or model-provided actor ID.

Pickaxe CLI worked in earlier workspace exports and synthetic runs. Supabase is connected but denies this project. Hermes, OpenClaw, Twin.so, Dialora, Noem.ai, Zernio, n8n, custom MCP, HeyROI AI and OUTCAAS are proposed adapters with no verified credentials or launch authorization in this repo. Future adapters must isolate credentials per customer, meter usage, record approvals, and support retries without duplicate external effects.
