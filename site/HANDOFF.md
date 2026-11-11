# LaunchStudio public build handoff

Published on the existing Pickaxe custom page page-82b853c0-1f1a-45da-9f3b-b3e0a1caeeaa. The public URL is https://studio.pickaxe.co/STUDIOSAG26QENFZXNY0957VNT/launch.

| Area | Status | Location or dependency |
|---|---|---|
| Accelerator and first assessment | Fully implemented and tested | Homepage, #navigator, #start-guide. Existing Business Navigator stays in use. |
| First implementation sprint | Implemented but not fully tested | #academy. Includes a live Idea Validator link, deliverable and measurable review. |
| Four stages and 52-week roadmap | Fully implemented and tested for browsing | #roadmap and #tools. All 52 existing IDs were reconciled against the live portal. Week one keyboard shortcut tested. Later weeks use a shared assignment format. |
| Onboarding and roadmap progress | Implemented but not fully tested | Browser-local checklists. Onboarding reload persistence verified. Account sync and file uploads are pending. |
| Playbooks and FAQ | Implemented but not fully tested | #playbooks has six downloadable text templates. #faq search verified live. |
| Help, About, Methodology, Contact, Partnerships and Success Stories | Implemented but not fully tested | #help, #about, #methodology, #contact, #partnerships, #success-stories. Informational sections. No configured intake or published case studies. |
| Pricing and Programs | Implemented but not fully tested | #pricing-plans, #managed-services, #growth-challenge. Current plans are shown through native Pickaxe controls. |
| Public URL structure | Implemented but not fully tested | These are linked sections on one custom page. Standalone routes, per-route SEO, and sitemap are not implemented. Custom-page metadata is present, but outer Pickaxe indexing behavior is unverified. |
| Legal | Draft awaiting approval | LEGAL-REVIEW.md is unpublished. The public page includes general AI output guidance. |
| Support forms, partnerships intake, booking, referrals, events, moderated community, managed package admin | Requires configuration | Need a real intake destination, authorized providers and administrative review flow. |
| Private dashboard, saved profiles/assessments, account-synced progress, CMS, Q/CUE | Requires configuration | Supabase and a verified identity bridge. No migrations or plan changes in this public build. |

Live verification found 52 roadmap entries, six download links, 18 SVG instances, and no unresolved footer anchors. FAQ filtering and checklist reload worked. A keyboard activation of the Week 1 tool shortcut found one real directory entry. The custom page measured 320 pixels wide with no horizontal overflow at a 320-pixel viewport.

## Source and rollback

build.mjs produces public-build.html from the exact Pickaxe before.html, portal-before.json and the sibling catalog. No dedicated LaunchStudio Git remote or branch was found in this workspace. The project is backed up locally. To restore the previous homepage, publish before.html to the same page ID using the Pickaxe CLI. This build did not update agents, memberships, portal configuration or billing.

## Priorities

1. Complete the secure two-agent staging workflow and hosted isolation tests before wiring private progress to the portal.
2. Add authenticated onboarding and roadmap progress, then Q/CUE against real saved data.
3. Configure and test support intake, published plan configuration and policy approval before exposing transactional forms.
