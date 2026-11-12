import assert from 'node:assert/strict';
import { test } from 'node:test';
import { audiencePrompt, audienceSections, parseAudienceResult } from './audience-dna.mjs';

test('the bounded message includes excerpts from both approved sources', () => {
  const message = audiencePrompt({
    name: 'Kites', goal: 'Find buyers', approvedIdea: { markdown: 'Idea ' + '🪁\n'.repeat(2000) },
    approvedMarket: { markdown: 'Market ' + '💡"'.repeat(2000) },
  });
  assert.ok(Buffer.byteLength(message) < 2800);
  const data = JSON.parse(message.split('\nContext (excerpts): ')[1]);
  assert.match(data.approvedIdea, /^Idea /);
  assert.match(data.approvedMarket, /^Market /);
  assert.match(message, /Never invent statistics/);
});

test('structured output requires all sections and strips extra fields', () => {
  const result = Object.fromEntries(Object.keys(audienceSections).map(key => [key, ['  Synthetic evidence  ']]));
  assert.deepEqual(Object.keys(parseAudienceResult(JSON.stringify({ ...result, extra: 'ignored' })).sections),
    Object.keys(audienceSections));
  assert.throws(() => parseAudienceResult(JSON.stringify({ ...result, assumptions: [] })), /Invalid Audience DNA section/);
  assert.throws(() => parseAudienceResult('unstructured'), SyntaxError);
});
