import { Pool } from 'pg';
import { createPickaxeRunner } from '../../../staging/pickaxe-adapter.mjs';
import { publicConfig } from './config.mjs';
import { stagingPoolOptions } from './postgres-options.mjs';

let pool;
export function database() {
  if (!pool) {
    publicConfig();
    pool = new Pool(stagingPoolOptions(process.env.LAUNCHSTUDIO_STAGING_DATABASE_URL));
  }
  return {
    query: (sql, args) => pool.query(sql, args),
    async transaction(work) {
      const client = await pool.connect();
      try {
        await client.query('begin');
        const result = await work(client);
        await client.query('commit');
        return result;
      } catch (error) {
        await client.query('rollback');
        throw error;
      } finally {
        client.release();
      }
    },
  };
}

export function agentRunner() {
  const key = process.env.PICKAXE_STAGING_API_KEY;
  if (!key) throw new Error('Staging Pickaxe key required');
  async function request(path, payload) {
    const response = await fetch('https://api.pickaxe.co/v1' + path, {
      method: payload ? 'POST' : 'GET',
      headers: { authorization: 'Bearer ' + key, 'content-type': 'application/json' },
      body: payload ? JSON.stringify(payload) : undefined,
      signal: AbortSignal.timeout(10000),
    });
    if (!response.ok) throw new Error('Pickaxe request failed');
    return response.json();
  }
  return createPickaxeRunner({
    submitPickaxe: payload => request('/completions', payload),
    getPickaxeSubmission: id => request('/completions/' + encodeURIComponent(id)),
  });
}
