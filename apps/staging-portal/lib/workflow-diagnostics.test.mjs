import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createRequestHandler } from '../../../staging/request-handler.mjs';
import { workflowStage } from './workflow-diagnostics.mjs';

test('database TLS errors identify the failed stage without exposing error details', async (t) => {
  const log = t.mock.method(console, 'error', () => {});
  const secret = 'private connection string and query text';
  const error = new Error(secret, { cause: Object.assign(new Error(secret), { code: 'SELF_SIGNED_CERT_IN_CHAIN' }) });
  const handler = createRequestHandler(() => workflowStage('project_authorization', () => Promise.reject(error)));
  const response = await handler(new Request('https://example.test/api/workflow', {
    method: 'POST',
    headers: { authorization: 'Bearer private-token', 'content-type': 'application/json' },
    body: '{}',
  }));
  assert.equal(response.status, 500);
  assert.deepEqual(await response.json(), { error: 'Workflow unavailable' });
  assert.deepEqual(log.mock.calls.map(call => JSON.parse(call.arguments[0])), [
    { event: 'assessment_workflow_failure', stage: 'project_authorization', category: 'tls_certificate' },
  ]);
});
