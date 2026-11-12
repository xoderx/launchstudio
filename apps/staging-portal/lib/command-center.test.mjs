import assert from 'node:assert/strict';
import { test } from 'node:test';
import { loadProject, projectView, workflowState } from './command-center.mjs';

const idea = { project_id: 'a', assessment_id: 'idea', run_id: 'idea-run', agent: 'idea-validator', approval_status: 'approved', version: 1 };
const market = { project_id: 'a', assessment_id: 'market', run_id: 'market-run', agent: 'market-intelligence', version: 1 };
const run = { project_id: 'a', id: 'market-run', source_assessment_id: 'idea', source_assessment_version: 1 };

test('project loader scopes every read and refuses rows from another project', async () => {
  const calls = [];
  const db = {
    from(table) {
      const response = {
        assessment_versions: [idea, { ...market, project_id: 'customer-b' }],
        agent_runs: [run, { ...run, project_id: 'customer-b' }],
        workflow_progress: { project_id: 'customer-b', stage: 'review' },
      }[table];
      const finish = () => Promise.resolve({ data: response });
      return { select: () => ({ eq: (column, id) => {
        calls.push([table, column, id]);
        return { order: finish, maybeSingle: finish };
      } }) };
    },
  };
  const snapshot = await loadProject(db, 'a');
  assert.deepEqual(calls.map(call => call.slice(1)), Array(3).fill(['project_id', 'a']));
  assert.deepEqual(snapshot.versions, [idea]);
  assert.deepEqual(snapshot.runs, [run]);
  assert.equal(snapshot.progress, null);
  assert.equal(projectView(snapshot, 'customer-b'), null);
  assert.equal(projectView(snapshot, ''), null);
});

test('empty project shows no completed work and a valid first action', () => {
  const view = projectView({ projectId: 'a', versions: [], runs: [], progress: null }, 'a');
  assert.deepEqual(view.completed, []);
  assert.equal(view.approvedIdea, undefined);
  assert.equal(view.next, 'Run Idea Validator');
});

test('approval and historical provenance retain the exact source version', () => {
  const pending = { ...idea, version: 2, approval_status: 'pending' };
  const view = projectView({ projectId: 'a', versions: [market, pending, idea], runs: [run],
    progress: { outstanding_tasks: ['Review the market analysis'] } }, 'a');
  assert.equal(view.approvedIdea.version, 1);
  assert.equal(view.runById.get(market.run_id).source_assessment_version, 1);
  assert.equal(view.completed.length, 3);
  assert.equal(view.next, 'Review the market analysis');
});

test('workflow status distinguishes unknown requests, active work, and terminal failures', () => {
  const pending = { requestId: 'req', agent: 'idea-validator', status: 'unconfirmed' };
  const other = { request_id: 'req', agent: pending.agent, actor_id: 'b', status: 'failed' };
  assert.equal(workflowState([], pending, 'a'), 'unconfirmed');
  assert.equal(workflowState([other], pending, 'a'), 'unconfirmed');
  assert.equal(workflowState([{ ...other, actor_id: 'a' }], pending, 'a'), 'failed');
  assert.equal(workflowState([{ ...other, actor_id: 'a' }, { ...other, status: 'running' }], pending, 'a'), 'running');
  assert.equal(workflowState([{ ...other, status: 'queued' }], null, 'a'), 'queued');
  assert.equal(workflowState([], null, 'a'), 'idle');
});
