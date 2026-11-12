import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createPickaxeClient, createPickaxeRunner } from './pickaxe-adapter.mjs';

test('personal key scopes background submission and polling to the selected workspace', async () => {
  const calls = [];
  const client = createPickaxeClient({
    key: 'pxu_v1_synthetic', workspaceId: 'synthetic-workspace',
    async fetchImpl(url, init) {
      calls.push({ url, ...init });
      return Response.json(calls.length === 1
        ? { submissionId: 'synthetic-submission', status: 'queued' }
        : { status: 'completed', result: 'Synthetic Markdown' });
    },
  });
  const run = createPickaxeRunner(client, { sleep: async () => {} });
  const acknowledged = [];
  assert.equal(await run('fixture', {}, { requestId: 'correlation-id', onAcknowledged: id => acknowledged.push(id) }), 'Synthetic Markdown');
  assert.deepEqual(acknowledged, ['synthetic-submission']);
  assert.deepEqual(calls.map(call => [call.method, call.url]), [
    ['POST', 'https://api.pickaxe.co/v1/completions'],
    ['GET', 'https://api.pickaxe.co/v1/completions/synthetic-submission'],
  ]);
  for (const call of calls) {
    assert.equal(call.headers['X-Pickaxe-Workspace-Id'], 'synthetic-workspace');
    assert.equal(call.headers['X-Request-Id'], 'correlation-id');
  }
  assert.equal(JSON.parse(calls[0].body).background, true);
});

test('missing personal workspace fails before a request can reach Pickaxe', async () => {
  const run = createPickaxeRunner(createPickaxeClient({
    key: 'pxu_v1_synthetic',
    fetchImpl: () => assert.fail('Unexpected outbound request'),
  }));
  await assert.rejects(run('fixture', {}), { stage: 'pickaxe_submission', category: 'missing_workspace' });
});

test('Market Intelligence bounds the serialized message without altering the approved result', async () => {
  let message;
  const run = createPickaxeRunner({
    async submitPickaxe(payload) {
      message = payload.message;
      return { submissionId: 'synthetic', status: 'completed', result: 'Research result' };
    },
  });
  const markdown = 'Approved recommendation: test demand.\n' + '🪁 quote " and newline\n'.repeat(2000);
  const context = {
    name: 'Synthetic pilot',
    goal: 'Validate library demand',
    profile: { audience: 'Library groups', offering: '🪁'.repeat(2000) },
    approvedIdea: { markdown },
  };
  assert.equal(await run('fixture', context, { agent: 'market-intelligence' }), 'Research result');
  assert.ok(Buffer.byteLength(message) <= 2800);
  const sent = JSON.parse(message.slice(message.indexOf('\n\n') + 2));
  assert.equal(sent.goal, context.goal);
  assert.equal(sent.profile.audience, 'Library groups');
  assert.equal(sent.contextMayBeExcerpted, true);
  assert.ok(sent.approvedIdea.markdown.startsWith('Approved recommendation:'));
  assert.ok(markdown.startsWith(sent.approvedIdea.markdown));
  assert.ok(sent.approvedIdea.markdown.length < markdown.length);
  assert.equal(context.approvedIdea.markdown, markdown);

  await run('fixture', { ...context, approvedIdea: { markdown: 'Short approved text' }, profile: {} },
    { agent: 'market-intelligence' });
  assert.match(message, /Short approved text/);
  assert.doesNotMatch(message, /contextMayBeExcerpted/);
});

test('submission, acknowledgment, polling and invalid output have distinct failures', async () => {
  const queued = { submissionId: 'opaque', status: 'queued' };
  const scenarios = [
    [[new Response(null, { status: 403 })], 'pickaxe_submission', 'authorization'],
    [[Response.json({})], 'pickaxe_acknowledgment', 'missing_submission_id'],
    [[Response.json(queued), new Response(null, { status: 503 })], 'pickaxe_polling', 'upstream'],
    [[Response.json({ ...queued, status: 'completed', result: {} })], 'pickaxe_response_validation', 'invalid_result'],
  ];
  for (const [responses, stage, category] of scenarios) {
    const run = createPickaxeRunner(createPickaxeClient({
      key: 'synthetic-workspace-key',
      fetchImpl: (_url, init) => {
        assert.equal(init.headers['X-Pickaxe-Workspace-Id'], undefined);
        return responses.shift();
      },
    }), { sleep: async () => {} });
    await assert.rejects(run('fixture', {}), { stage, category, message: 'Pickaxe assessment failed' });
    assert.equal(responses.length, 0);
  }
});
