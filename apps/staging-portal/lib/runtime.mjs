import { Pool } from 'pg';
import { createPickaxeClient, createPickaxeRunner } from '../../../staging/pickaxe-adapter.mjs';
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
  return createPickaxeRunner(createPickaxeClient({
    key: process.env.PICKAXE_STAGING_API_KEY?.trim(),
    workspaceId: process.env.PICKAXE_STAGING_WORKSPACE_ID?.trim(),
  }));
}
