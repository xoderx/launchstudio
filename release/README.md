# Production preparation assets

This directory prepares the existing LaunchStudio application for release. It does not create a second implementation, change customer traffic, replay staging migrations or deploy anything.

## Build and package

From a clean, reviewed checkout with dependencies installed:

```sh
node --test scripts/*.test.mjs staging/*.test.mjs apps/staging-portal/lib/*.test.mjs
node scripts/prepare-production-assets.mjs
```

The second command runs a real Next.js compilation with `VERCEL_ENV=production` and indexing disabled. Output is `work/production-release/<commit>/`: an immutable committed-source archive, SHA-256 manifest, ordered migration checksums and a blank Production configuration template. The compiled application stays in `apps/staging-portal/.next`. This is a source release kit and local compilation, **not** a portable Vercel prebuilt deployment or proof of working Production credentials. Final origin metadata is compiled during the actual configured deployment.

The secret-free GitHub Actions workflow `Release checks` runs tests, the restricted-role database regression, production-mode compilation and the preserved static builder. It deliberately has no deploy token or promotion step. Require its successful check through repository branch protection before merging. Browser acceptance evidence remains a separate gate; compilation cannot replace it.

## Configuration preflight

Configure the names in `production.env.example` through the Production secret manager. Vercel supplies `VERCEL_ENV` itself; do not override its platform value there. A separate Supabase project and restricted worker credential are required. Do not reuse Preview's credentials. The final public domain is needed for canonical metadata; keep indexing false until public content/legal approval.

Run in a securely configured process (do not paste secret values into shell history or chat):

```sh
node scripts/production-preflight.mjs
```

The preflight returns only named checks and booleans, never values. Missing/invalid configuration exits 1. Passing means offline configuration syntax/presence only. It cannot validate provider credits/permissions, secret independence, network access, schema, customer identity, legal approval or live acceptance.

## Database handoff

The manifest lists the ten checked-in migrations without executing them. They are inputs for review, not permission to bulk apply SQL. Hosted staging has a supplemental `qcue_bridge_initial` migration and `qcue_state` not represented by these files. Reconcile their owning implementation and hosted/repository version mapping before preparing a complete new Production schema. Inspect the destination first; never replay these files on staging or a populated customer database. Verify RLS, restricted worker grants, backup/restore and customer A/B denial before release. A source archive is not a customer-data backup.

## Release sequence

1. Designate the production Vercel project/team/domain, separate Supabase project and invitation/membership mapping. Keep current Pickaxe customers operational.
2. Reconcile the schema and provision reviewed Production credentials securely. Run offline preflight and live connectivity/security checks.
3. Complete final legal/lead retention approval and legitimate signed-in two-customer acceptance on the release candidate. Existing local fixtures and hosted unsigned smoke do not establish this.
4. Once the required gates pass, mark PR #1 ready and merge the reviewed commit with successful checks. Check the project's Git production settings first: merging a production branch can automatically deploy/alias it.
5. For a controlled release, build a Production-target deployment without assigning domains (`vercel deploy --prod --skip-domain`) in the verified project. This command is a future consequential action, not something the preparation scripts execute. Verify protection on the unaliased deployment before entering any test customer data.
6. Test that Production build with Production credentials, including login, approved Idea Validator → Market Intelligence handoff, refresh/new session, second-customer denial, deliverable history/entitlements, lead capture and recovery. Promote that exact build only after the release decision. A Preview promotion can rebuild with different environment variables and is not equivalent evidence.
7. Record deployment ID/commit, previous deployment and rollback operator. Inspect errors after promotion. Roll back app traffic to the known deployment if needed; do not drop data or reverse additive migrations automatically. Vercel rollback disables automatic aliasing until explicit promotion resumes it.

Current status and exact evidence: [production preparation](../docs/release-review/PRODUCTION_PREPARATION.md), [marketing acceptance](../docs/marketing-review/ACCEPTANCE.md), [production release requirements](../docs/PRODUCTION_RELEASE.md).
