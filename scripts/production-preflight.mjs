import { pathToFileURL } from 'node:url';
import { stagingProjectRef } from '../apps/staging-portal/lib/config.mjs';
import { projectPoolOptions } from '../apps/staging-portal/lib/postgres-options.mjs';

// Offline checks only. Never print values or contact a provider/database.
export function productionPreflight(env) {
  const checks = [];
  const check = (name, valid) => checks.push({ name, passed: Boolean(valid) });
  const ref = env.LAUNCHSTUDIO_PRODUCTION_SUPABASE_PROJECT_REF?.trim();
  check('production-target', env.VERCEL_ENV === 'production');
  check('separate-production-project', /^[a-z]{20}$/.test(ref ?? '') && ref !== stagingProjectRef);
  check('matching-public-backend', env.SUPABASE_URL === `https://${ref}.supabase.co`);
  check('publishable-client-key', env.SUPABASE_PUBLISHABLE_KEY?.startsWith('sb_publishable_'));
  let restricted = false;
  try {
    const value = env.LAUNCHSTUDIO_PRODUCTION_DATABASE_URL;
    const url = new URL(value);
    restricted = Boolean(url.password) && projectPoolOptions(value, ref).ssl.rejectUnauthorized;
  } catch { /* Deliberately omit driver input and credentials. */ }
  check('restricted-production-worker-with-tls', restricted);
  check('production-pickaxe-key', Boolean(env.PICKAXE_PRODUCTION_API_KEY?.trim()));
  check('production-pickaxe-workspace', Boolean(env.PICKAXE_PRODUCTION_WORKSPACE_ID?.trim()));
  check('independent-lead-signing-key', (env.LAUNCHSTUDIO_LEAD_SIGNING_KEY?.length ?? 0) >= 32);
  let origin = false;
  try {
    const u = new URL(env.LAUNCHSTUDIO_PUBLIC_SITE_URL);
    origin = u.protocol === 'https:' && !u.username && !u.password && u.pathname === '/' && !u.search && !u.hash && !['localhost','127.0.0.1','[::1]'].includes(u.hostname) && !u.hostname.endsWith('.vercel.app');
  } catch { /* Missing configuration is a failed check. */ }
  check('final-public-https-origin', origin);
  check('explicit-indexing-choice', ['false','true'].includes(env.LAUNCHSTUDIO_MARKETING_INDEXABLE));
  check('audience-pilot-disabled', env.AUDIENCE_DNA_ENABLED !== 'true');
  return { configurationReady: checks.every(c => c.passed), checks,
    releaseApproved: false,
    limits: 'Offline syntax/presence checks only. Does not establish credential validity, independent secret provenance, schema completeness, legal approval, hosted customer acceptance, or permission to release.' };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const result = productionPreflight(process.env);
  console.log(JSON.stringify(result, null, 2));
  process.exitCode = result.configurationReady ? 0 : 1;
}
