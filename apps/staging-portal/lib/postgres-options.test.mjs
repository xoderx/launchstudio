import assert from 'node:assert/strict';
import { X509Certificate } from 'node:crypto';
import { test } from 'node:test';
import { stagingPoolOptions } from './postgres-options.mjs';

test('worker connections verify PostgreSQL TLS against the official Supabase CA', () => {
  for (const [user, host, port] of [
    ['launchstudio_worker', 'db.exghrllltefuhsgnagym.supabase.co', 5432],
    ['launchstudio_worker.exghrllltefuhsgnagym', 'aws-0-example.pooler.supabase.com', 5432],
    ['launchstudio_worker.exghrllltefuhsgnagym', 'aws-0-example.pooler.supabase.com', 6543],
  ]) {
    const options = stagingPoolOptions(`postgresql://${user}:synthetic@${host}:${port}/postgres?sslmode=no-verify`);
    assert.equal(new URL(options.connectionString).search, '');
    assert.equal(new URL(options.connectionString).hostname, host);
    assert.equal(options.ssl.rejectUnauthorized, true);
    assert.equal(options.ssl.checkServerIdentity, undefined); // Keep Node's default hostname verification.
    const ca = new X509Certificate(options.ssl.ca);
    assert.equal(ca.fingerprint256, '80:70:25:AD:50:D4:ED:21:9D:2C:9C:7D:29:9C:00:4F:82:4E:B0:0C:F7:F6:5A:FE:F6:07:D0:7B:72:E6:CA:FA');
  }
  assert.throws(() => stagingPoolOptions('postgresql://postgres@db.exghrllltefuhsgnagym.supabase.co/postgres'));
});
