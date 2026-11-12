# LaunchStudio 2.0 visual redesign

This change extends the existing authenticated Next.js staging portal on `codex/supabase-integration` (`f64f70f`), which is the source of the existing Vercel staging deployment. The repository's default `main` branch predates that implementation. Review and merge against the integration branch; do not replace it with the default branch.

The unified shell adds collapsible navigation, the existing business selector, account settings, dark/light preferences, a command palette (Ctrl/Cmd+K), mobile navigation, and a Q/CUE context drawer. Start Here uses the selected business, project, next action, and saved assessment versions. Its Navigator uses the existing public portal's keyword-based routing, explicitly labeled rule-based. Universal AI, GPT, Claude, Gemini, Grok, CoVibeCoder, and Outcome Recipes retain their existing portal URLs.

Q/CUE keeps its original Supabase session, customer-scoped reads, forms, approval callbacks, workflow endpoint, recovery controls, and history pagination. Project milestones derive from saved assessment records. Metric labels identify their query scope; unloaded data shows a dash. The tool catalog searches all four stages and distinguishes draft workspaces from verified provider workflows and the gated Audience DNA pilot. A catalog result opens the existing workbench, including its existing draft/version/export/academy capabilities.

No backend modules, route handlers, migrations, authorization policies, customer records, existing entitlements, or production deployments are changed. No frontend framework or runtime component library was added. Inter is bundled locally with its license; the selected Lucide SVG paths and license are included.

## Verification

- `apps/staging-portal`: `npm ci`, `npm run build`, `node --test lib/*.test.mjs` (9 passing tests).
- `staging`: `npm ci`, `node test.mjs` (restricted-worker SQL isolation, approval/source provenance, retries, request recovery, and restart persistence; authentication and provider replies stubbed).
- `site`: `node build.mjs` (existing public page, all 52 roadmap entries, resource downloads, and anchor checks).
- `apps/staging-portal`: `npm run test:ui` against a running local production build. Playwright/axe check both pages at 1440, 390, and 320 pixels in both themes; test business/project switching, approval and pilot disabled states, command search, Navigator, individual model URLs, mobile navigation, theme persistence, reduced motion, and browser errors.

Run browser tests with `npm run start -- --port 3000` and, in another terminal, `npm run test:ui`. Set `CHROMIUM_PATH` if Chromium is elsewhere, `BASE_URL` for another localhost port, and `REVIEW_OUTPUT` for generated screenshots/report. Tests reject non-local hosts and intercept synthetic Supabase responses. They never dispatch a provider request or change remote customer records. `verification.json` records the completed browser run.

## Screenshots

All screenshots show the real application components using clearly labeled synthetic test data. They do not claim a live customer session.

| View | Dark | Light |
|---|---|---|
| Start Here, desktop | [Screenshot](start-here-desktop-dark.png) | [Screenshot](start-here-desktop-light.png) |
| Start Here, mobile | [Screenshot](start-here-mobile-dark.png) | [Screenshot](start-here-mobile-light.png) |
| Q/CUE, desktop | [Screenshot](qcue-desktop-dark.png) | [Screenshot](qcue-desktop-light.png) |
| Q/CUE, mobile | [Screenshot](qcue-mobile-dark.png) | [Screenshot](qcue-mobile-light.png) |

## Release boundary

Deploy this branch only to Preview in the existing `launchstudio-staging` Vercel project, retaining its Vercel Authentication and Preview environment configuration. The app's production-environment rejection stays intact. No production promotion or merge is included.

Hosted signed-in acceptance remains necessary before production: verify Idea Validator saving, assessment approval, Market Intelligence's exact approved source, interrupted-request recovery, older history pages, and a second customer's denied access. Local synthetic tests cannot establish these hosted guarantees.
