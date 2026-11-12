import { Pool } from 'pg';
import { createPickaxeClient, createPickaxeRunner } from '../../../staging/pickaxe-adapter.mjs';
import { projectReference, publicConfig } from './config.mjs';
import { projectPoolOptions } from './postgres-options.mjs';
import { executionRouter, pickaxeCompatibility } from './ai-engine.mjs';

let pool;
export function database() {
  if (!pool) {
    publicConfig();
    const connection = process.env.VERCEL_ENV === 'production'
      ? process.env.LAUNCHSTUDIO_PRODUCTION_DATABASE_URL : process.env.LAUNCHSTUDIO_STAGING_DATABASE_URL;
    pool = new Pool(projectPoolOptions(connection, projectReference()));
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
  const production = process.env.VERCEL_ENV === 'production';
  return executionRouter({ pickaxe: pickaxeCompatibility(createPickaxeRunner(createPickaxeClient({
    key: (production ? process.env.PICKAXE_PRODUCTION_API_KEY : process.env.PICKAXE_STAGING_API_KEY)?.trim(),
    workspaceId: (production ? process.env.PICKAXE_PRODUCTION_WORKSPACE_ID : process.env.PICKAXE_STAGING_WORKSPACE_ID)?.trim(),
  }))) });
}
