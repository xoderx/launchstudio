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
      const filters = [];
      const query = {
        select: () => query,
        eq(column, id) {
          filters.push([column, id]);
          calls.push([table, column, id]);
          return query;
        },
        order: () => query, limit: () => query, in: () => query,
        maybeSingle() {
          const id = filters[0]?.[1];
          return Promise.resolve({ data: {
            business_projects: id === 'a' ? { id } : null,
            workflow_progress: { project_id: 'customer-b', stage: 'review' },
          }[table] ?? null });
        },
        then(resolve) {
          const data = {
            assessment_versions: [idea, { ...market, project_id: 'customer-b' }],
            agent_runs: [run, { ...run, project_id: 'customer-b' }],
            workflow_requests: [{ project_id: 'customer-b' }],
          }[table];
          return Promise.resolve({ data }).then(resolve);
        },
      };
      return query;
    },
  };
  await assert.rejects(loadProject(db, 'customer-b'), { status: 404 });
  const snapshot = await loadProject(db, 'a');
  assert.ok(calls.filter(call => call[1] === 'project_id').every(call => call[2] === 'a'));
  assert.deepEqual(snapshot.requests, []);
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
