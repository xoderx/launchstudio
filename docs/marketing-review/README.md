# LaunchStudio public marketing website

The public website is implemented in the existing Next.js application. It is a working protected Preview, with substantive pages, real form handling and a preserved customer workspace. No production traffic, billing, public registration, Pickaxe configuration or PR merge is included.

## Route map

| Route | Purpose and conversion objective |
|---|---|
| `/` | Complete platform homepage, deterministic Business Navigator and early-access CTA |
| `/product` | Platform/Q/CUE/context/approval showcase and existing model access |
| `/solutions` | Business-stage and persona pathways, linked to the registry-backed catalog |
| `/tools` | Searchable 52-tool catalog, stage filters, outputs, sprint connections and accurate readiness |
| `/academy` | 52 implementation sprints across four stages and 11 guided playbooks |
| `/covibecoder` | Separate 13-tool software development planning suite; disconnected execution adapters clearly labeled |
| `/pricing` | Founding access and service inquiries; no unvalidated prices or checkout |
| `/about` | Mission, working principles and Pickaxe's actual role |
| `/contact` | Real inquiry form, recorded for administrator review |
| `/partners` | Substantive partner pathways and partnership inquiry form |
| `/early-access` | Explicit-consent interest capture; no account, subscription or access grant |
| `/privacy`, `/terms`, `/ai-disclaimer` | Clearly labeled review drafts; not final production legal copy |
| `/login` | Existing customer password sign-in; existing sessions continue to `/app` |
| `/app` | Preserved customer workspace, Q/CUE and CoVibeCoder using existing hash navigation |
| `/api/early-access` | Signed form challenge and protected inquiry submission |
| `/api/config`, `/api/workflow` | Existing customer application contracts, unchanged |
| `/robots.txt`, `/sitemap.xml`, `/opengraph-image`, `/icon.svg` | Crawler configuration and original brand assets |

Legacy root hashes (`/#qcue`, `/#tools`, `/#tool-studio`, `/#covibecoder`, `/#assessment-<UUID>-<version>` and the existing shell destinations) preserve their fragment and continue through `/app`, or `/login` for a signed-out visitor. Public links use real page paths, avoiding a collision with legacy customer hashes. No customer project data is server-rendered into public pages.

## Architecture and preservation

`app/(marketing)` owns the public layout and pages. `app/marketing` contains the public content projections, reusable components, original workflow illustrations and small interactive components. Public page views do not initialize the customer Supabase client. The former customer root page is now `app/customer-portal.jsx`; its business/project/workflow implementation is retained. Only entry routing, sign-in forwarding and the surrounding main landmark changed.

The existing `site/build.mjs` builder was audited and tested. It generates the historical Pickaxe public hub; it is not the router for this Next.js website. It remains unchanged and was not published. The registry, 52 business tool specs, 13 CoVibeCoder specs, existing provider IDs, assessment workflows, RLS, approvals, pagination and recovery contracts are preserved.

## Honest product claims

- The 52 business tools are distinct from the 13 CoVibeCoder planning tools.
- Idea Validator and Market Intelligence have connected AI assessment workflows.
- Audience DNA remains paused pending provider/cost verification; the other 49 business provider APIs are not activated.
- The GPT/Claude/Gemini/Grok controls open the existing Pickaxe pages, subject to account access and usage allowances. Embedded branded chats are described as planned.
- CoVibeCoder provides manual planning, saved artifacts and copy/export. Automated coding, repository writes, synchronization and deployments are not advertised as connected.
- Prices, testimonials, customer outcomes, partner commitments and company/legal details were not invented. Founding access and service scope are confirmed separately.

## Interest capture and administration

The form records email, goal, interest, optional business name, submission source, explicit consent/version and server timestamp. The network address is converted to a keyed hash; it is not stored raw in `marketing_leads`.

A server-only random `LAUNCHSTUDIO_LEAD_SIGNING_KEY` was provisioned for Vercel **Preview only**. Production must receive its own independently configured secret. The server issues an IP-bound signed challenge, requires a minimum form age, enforces expiry and same-origin JSON submissions, rejects honeypot values and unexpected fields, and bounds the request body to 10 KB. Input lengths and interest/source enums are validated. An atomic database transaction enforces five accepted requests per hashed address per hour, a global 1,000/day ceiling, and request idempotency. Missing signing or database configuration fails closed with a useful error message. No email, goal, raw address or credential is logged by the handler.

The additive `20261112042704_marketing_leads.sql` migration was applied only to staging as hosted version `20261112044212` (`marketing_leads`). Anonymous and authenticated customer roles have no direct lead read/write grants. The restricted worker can insert inquiries and read only the metadata needed for idempotency/rate limits; it cannot select submitted emails or goals. No new public SQL RPC or SECURITY DEFINER function was added. The authorized administrator can review the complete record through Supabase Table Editor → `public.marketing_leads` or an admin SQL connection. No new public admin dashboard is exposed.

An inquiry never creates a customer profile, business, membership, subscription or charge, and this implementation sends no automated outbound email. Follow-up is a manual administrator task. A retention/deletion policy and the final legal operator/contact must be approved before public production collection.

## SEO and release controls

Preview is protected by Vercel Authentication and has `noindex, nofollow` headers/metadata with `Disallow: /` in robots. Production public-page indexing requires both a valid `LAUNCHSTUDIO_PUBLIC_SITE_URL` HTTPS origin and `LAUNCHSTUDIO_MARKETING_INDEXABLE=true` in the Production target. Private application/auth/API routes and legal drafts remain nonindexable. Sitemap entries are public marketing routes only. All substantive pages have unique descriptions/titles, canonical URLs and Open Graph/Twitter metadata. The original Open Graph image and SVG app icon are served locally.

## Screenshots and what they establish

Public-page review images capture the actual local website in Chromium without mocked page responses. The Q/CUE product captures embedded in the website come from the actual customer application rendered with clearly synthetic browser fixtures; their captions label sample data. They are not invented product screens or customer case studies. Workflow diagrams are original SVG illustrations, explicitly not evidence of external execution.

Customer regression suites use synthetic Supabase fixtures. The marketing form's final UI success check intercepts only its local POST response; database persistence is separately tested with real PostgreSQL, and hosted API proof is recorded separately after deployment. Do not infer real Customer A/B acceptance from these fixtures.

## Reproduce verification

1. `cd staging && npm ci --cache /workspace/work/npm-cache && node test.mjs`
2. From `staging/`, `node --test *.test.mjs ../apps/staging-portal/lib/*.test.mjs`
3. `cd apps/staging-portal && npm ci --cache /workspace/work/npm-cache && npm run build`
4. Run the built server locally. For public form UI tests, set a synthetic development-only signing key of at least 32 characters; never use the live key in local screenshots or reports.
5. Run `npm run test:marketing`, `npm run test:ui` and `python tests/covibecoder-browser.py`. The fixture suites intentionally refuse non-local interception where applicable. Use synthetic fixtures only.
6. `cd site && node build.mjs` verifies the preserved historical public builder.

Detailed outcomes, Lighthouse results, browser evidence and the final deployment are recorded in `ACCEPTANCE.md`.
