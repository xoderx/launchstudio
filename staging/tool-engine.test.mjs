import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { compileToolPrompt, runConfiguredTool, validateDraft } from './tool-engine.mjs';

const stages = ['launch', 'grow', 'monetize', 'scale'];
const limit = Number(process.env.LAUNCHSTUDIO_TEST_BATCH ?? 4);
const tools = stages.slice(0, limit).flatMap(stage => JSON.parse(
  readFileSync(new URL(`../catalog/tool-specs/${stage}.json`, import.meta.url), 'utf8'),
));
const draft = { input: 'Observed inputs', summary: 'A decision', deliverables: ['One', 'Two', 'Three'] };

test('canonical tool specs have unique keys, ordered positions, and distinct deliverable contracts', () => {
  assert.equal(tools.length, 13 * limit);
  assert.equal(new Set(tools.map(tool => tool.key)).size, tools.length);
  assert.equal(new Set(tools.map(tool => JSON.stringify(tool.outputs))).size, tools.length);
  tools.forEach((tool, i) => {
    assert.equal(tool.position, i + 1);
    assert.equal(tool.outputs.length, 3);
    assert.ok(tool.promptSource.sha256);
    assert.ok(tool.metric && tool.exercise && tool.input);
    assert.equal(tool.executionAllowed, false);
    const prompt = compileToolPrompt(tool, '🪁'.repeat(4000), {});
    assert.ok(Buffer.byteLength(prompt) <= 2800);
    for (const output of tool.outputs) assert.ok(prompt.includes(output));
  });
});

test('shared runner requires a reservation and recovers by lookup only', async () => {
  const tool = { ...tools[0], executionAllowed: true };
  let lookedUp = false;
  const reservation = { claim: async () => ({ providerId: 'existing' }) };
  const provider = { submit: () => assert.fail('Must not resubmit'), lookup: async id => {
    assert.equal(id, 'existing'); lookedUp = true; return draft;
  } };
  assert.deepEqual(await runConfiguredTool({ tool, requestId: 'request', input: 'Inputs', reservation, provider }), validateDraft(draft));
  assert.ok(lookedUp);
  await assert.rejects(runConfiguredTool({ tool: tools[0], requestId: 'request', reservation, provider }), /unavailable/);
  assert.throws(() => validateDraft({ ...draft, deliverables: ['Only one'] }), /three/);
});
