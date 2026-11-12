import { test } from 'node:test';
import assert from 'node:assert/strict';
import { productionPreflight } from './production-preflight.mjs';
const ref = 'abcdefghijklmnopqrst';
const fixture = () => ({ VERCEL_ENV:'production', LAUNCHSTUDIO_PRODUCTION_SUPABASE_PROJECT_REF:ref,
  SUPABASE_URL:`https://${ref}.supabase.co`, SUPABASE_PUBLISHABLE_KEY:'sb_publishable_synthetic',
  LAUNCHSTUDIO_PRODUCTION_DATABASE_URL:`postgresql://launchstudio_worker:synthetic@db.${ref}.supabase.co/postgres`,
  PICKAXE_PRODUCTION_API_KEY:'synthetic-provider-secret', PICKAXE_PRODUCTION_WORKSPACE_ID:'synthetic-workspace',
  LAUNCHSTUDIO_LEAD_SIGNING_KEY:'synthetic-signing-key-at-least-32-characters',
  LAUNCHSTUDIO_PUBLIC_SITE_URL:'https://launch.example.com', LAUNCHSTUDIO_MARKETING_INDEXABLE:'false' });
test('missing production configuration fails without disclosing inputs',()=>{
  assert.equal(productionPreflight({}).configurationReady,false);
  const env=fixture();env.LAUNCHSTUDIO_PRODUCTION_DATABASE_URL='bad-secret-input';
  const result=productionPreflight(env);
  assert.equal(result.configurationReady,false);
  assert.ok(!JSON.stringify(result).includes('bad-secret-input'));
  assert.ok(!JSON.stringify(result).includes(env.PICKAXE_PRODUCTION_API_KEY));
});
test('staging backend and administrative credentials fail preflight',()=>{
  for(const change of [
    {LAUNCHSTUDIO_PRODUCTION_SUPABASE_PROJECT_REF:'exghrllltefuhsgnagym',SUPABASE_URL:'https://exghrllltefuhsgnagym.supabase.co'},
    {LAUNCHSTUDIO_PRODUCTION_DATABASE_URL:`postgresql://postgres:synthetic@db.${ref}.supabase.co/postgres`},
    {SUPABASE_PUBLISHABLE_KEY:'sb_secret_never-public'},
    {VERCEL_ENV:'preview'}, {AUDIENCE_DNA_ENABLED:'true'},
    {LAUNCHSTUDIO_PUBLIC_SITE_URL:'https://preview.vercel.app'},
    {LAUNCHSTUDIO_PUBLIC_SITE_URL:'https://user:secret@launch.example.com'}
  ]) assert.equal(productionPreflight({...fixture(),...change}).configurationReady,false);
});
test('valid synthetic syntax never grants release approval or claims live validation',()=>{
  const result=productionPreflight(fixture());
  assert.equal(result.configurationReady,true);
  assert.equal(result.releaseApproved,false);
  assert.match(result.limits,/Offline/);
});
