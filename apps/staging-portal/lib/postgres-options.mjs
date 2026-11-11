import { supabasePostgresCa } from './supabase-postgres-ca.mjs';

export function stagingPoolOptions(connectionString) {
  const url = new URL(connectionString);
  const user = decodeURIComponent(url.username);
  const project = 'exghrllltefuhsgnagym';
  const direct = url.hostname === `db.${project}.supabase.co` && user === 'launchstudio_worker';
  const pooled = url.hostname.endsWith('.pooler.supabase.com') && user === `launchstudio_worker.${project}`;
  if (!direct && !pooled) throw new Error('Dedicated staging database role required');
  // pg lets URI SSL parameters override the ssl object. Use only the options below.
  url.search = '';
  return {
    connectionString: url.href,
    ssl: { ca: supabasePostgresCa, rejectUnauthorized: true },
    max: 3, connectionTimeoutMillis: 5000, statement_timeout: 10000,
  };
}
