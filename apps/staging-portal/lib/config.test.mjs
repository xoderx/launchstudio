import assert from 'node:assert/strict';
import { test } from 'node:test';
import { publicConfig, projectReference, stagingProjectRef } from './config.mjs';
import { projectPoolOptions } from './postgres-options.mjs';
import { agentRunner } from './runtime.mjs';

function environment(t) {
  const originals = new Map();
  t.after(() => { for (const [key, value] of originals) { if (value === undefined) delete process.env[key]; else process.env[key] = value; } });
  return (key, value) => { if (!originals.has(key)) originals.set(key, process.env[key]); process.env[key] = value; };
}

test('production requires an explicit separate project, matching public URL and restricted connection', t => {
  const env = environment(t);
  const productionRef = 'abcdefghijklmnopqrst'; // Synthetic reference, never contacted.
  env('VERCEL_ENV', 'production');
  env('SUPABASE_URL', `https://${stagingProjectRef}.supabase.co`);
  env('SUPABASE_PUBLISHABLE_KEY', 'sb_publishable_fixture');
  env('LAUNCHSTUDIO_PRODUCTION_SUPABASE_PROJECT_REF', '');
  assert.throws(projectReference, /separate production/);
  env('LAUNCHSTUDIO_PRODUCTION_SUPABASE_PROJECT_REF', stagingProjectRef);
  assert.throws(projectReference, /separate production/);
  env('LAUNCHSTUDIO_PRODUCTION_SUPABASE_PROJECT_REF', productionRef);
  assert.throws(publicConfig, /match the deployment/);
  env('SUPABASE_URL', `https://${productionRef}.supabase.co`);
  assert.equal(publicConfig().url, `https://${productionRef}.supabase.co`);
  assert.equal(publicConfig().audienceDNA, false);
  assert.throws(() => projectPoolOptions(`postgresql://launchstudio_worker@db.${stagingProjectRef}.supabase.co/postgres`, productionRef));
  assert.throws(() => projectPoolOptions(`postgresql://postgres@db.${productionRef}.supabase.co/postgres`, productionRef));
  for (const connection of [
    `postgresql://launchstudio_worker@db.${productionRef}.supabase.co/postgres?sslmode=disable`,
    `postgresql://launchstudio_worker.${productionRef}@aws-0-example.pooler.supabase.com/postgres`,
  ]) {
    const options = projectPoolOptions(connection, productionRef);
    assert.equal(options.ssl.rejectUnauthorized, true);
    assert.equal(new URL(options.connectionString).search, '');
  }
});

test('Preview remains bound to staging and cannot use the configured production project', t => {
  const env = environment(t);
  env('VERCEL_ENV', 'preview');
  env('LAUNCHSTUDIO_PRODUCTION_SUPABASE_PROJECT_REF', 'abcdefghijklmnopqrst');
  env('SUPABASE_URL', `https://${stagingProjectRef}.supabase.co/`);
  env('SUPABASE_PUBLISHABLE_KEY', 'sb_publishable_fixture');
  assert.equal(publicConfig().url, `https://${stagingProjectRef}.supabase.co`);
  env('SUPABASE_URL', 'https://abcdefghijklmnopqrst.supabase.co');
  assert.throws(publicConfig, /match the deployment/);
});

test('production Pickaxe execution uses only production credentials and never falls back to staging', async t => {
  const env = environment(t);
  env('VERCEL_ENV', 'production');
  env('PICKAXE_STAGING_API_KEY', 'pxu_v1_staging_fixture');
  env('PICKAXE_STAGING_WORKSPACE_ID', 'staging-workspace');
  env('PICKAXE_PRODUCTION_API_KEY', 'pxu_v1_production_fixture');
  env('PICKAXE_PRODUCTION_WORKSPACE_ID', 'production-workspace');
  let calls = 0;
  t.mock.method(globalThis, 'fetch', async (url, options) => {
    calls++;
    assert.equal(url, 'https://api.pickaxe.co/v1/completions');
    assert.equal(options.headers.authorization, 'Bearer pxu_v1_production_fixture');
    assert.equal(options.headers['X-Pickaxe-Workspace-Id'], 'production-workspace');
    return Response.json({ submissionId: 'fixture', status: 'completed', result: 'Synthetic result' });
  });
  assert.equal(await agentRunner()('YL7LGN8AV2', { goal: 'Synthetic' }, { requestId: 'request' }), 'Synthetic result');
  env('PICKAXE_PRODUCTION_API_KEY', '');
  await assert.rejects(agentRunner()('YL7LGN8AV2', {}, { requestId: 'request' }), /Pickaxe assessment failed/);
  assert.equal(calls, 1);
});
