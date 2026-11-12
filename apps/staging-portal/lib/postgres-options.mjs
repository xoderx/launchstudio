import { supabasePostgresCa } from './supabase-postgres-ca.mjs';

export function stagingPoolOptions(connectionString) {
  return projectPoolOptions(connectionString, 'exghrllltefuhsgnagym');
}

export function projectPoolOptions(connectionString, project) {
  if (!/^[a-z]{20}$/.test(project ?? '')) throw new Error('Supabase project reference required');
  const url = new URL(connectionString);
  if (!['postgres:', 'postgresql:'].includes(url.protocol)) throw new Error('PostgreSQL connection required');
  const user = decodeURIComponent(url.username);
  const direct = url.hostname === `db.${project}.supabase.co` && user === 'launchstudio_worker';
  const pooled = url.hostname.endsWith('.pooler.supabase.com') && user === `launchstudio_worker.${project}`;
  if (!direct && !pooled) throw new Error('Dedicated project database role required');
  // pg lets URI SSL parameters override the ssl object. Use only the options below.
  url.search = '';
  return {
    connectionString: url.href,
    ssl: { ca: supabasePostgresCa, rejectUnauthorized: true },
    max: 3, connectionTimeoutMillis: 5000, statement_timeout: 10000,
  };
}
