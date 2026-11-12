import { start } from 'workflow/api';
import { createRequestHandler } from '../../../../../staging/request-handler.mjs';
import { createSessionVerifier } from '../../../../../staging/workflow.mjs';
import { publicConfig } from '../../../lib/config.mjs';
import { database } from '../../../lib/runtime.mjs';
import { runAssessment } from '../../../lib/jobs.mjs';
import { reserveDispatch } from '../../../lib/workflow-requests.mjs';
import { workflowStage } from '../../../lib/workflow-diagnostics.mjs';

const uuid = /^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i;
const agents = new Set(['idea-validator', 'market-intelligence']);

export const POST = createRequestHandler(async ({ token, projectId, requestId, agent, operation }) => {
  const config = await workflowStage('public_config', publicConfig);
  const actor = await workflowStage('session_verification', () => createSessionVerifier(config)(token));
  if (!actor) throw Object.assign(new Error(), { status: 401 });
  if (!uuid.test(projectId) || !uuid.test(requestId) || !agents.has(agent)) {
    throw Object.assign(new Error(), { status: 400 });
  }
  const db = await workflowStage('database_config', database);
  const { rows: [project] } = await workflowStage('project_authorization', () => db.query(`
    select p.id, r.id as run_id, r.status, w.status as request_status
    from public.business_projects p join public.businesses b on b.id = p.business_id
    left join public.agent_runs r on r.project_id = p.id and r.actor_id = $2
      and r.request_id = $3 and r.agent = $4
    left join public.workflow_requests w on w.project_id = p.id and w.actor_id = $2
      and w.request_id = $3 and w.agent = $4
    where p.id = $1 and p.status = 'active' and (b.owner_id = $2 or exists (
      select 1 from public.business_memberships m
      where m.business_id = b.id and m.user_id = $2 and m.role = 'editor'
    ))`, [projectId, actor.id, requestId, agent]));
  if (!project) throw Object.assign(new Error(), { status: 404 });
  if (operation !== undefined && operation !== 'reconcile') {
    throw Object.assign(Error('Invalid workflow operation'), { status: 400 });
  }
  if (!operation && (project.request_status || project.run_id)) {
    return { runId: project.run_id, status: project.request_status ?? project.status, requestId };
  }
  if (agent === 'market-intelligence' && !operation) {
    const { rowCount } = await workflowStage('assessment_prerequisite', () => db.query(`
      select 1 from public.assessment_versions
      where project_id = $1 and agent = 'idea-validator' and approval_status = 'approved'
      limit 1`, [projectId]));
    if (!rowCount) throw Object.assign(new Error(), { status: 409 });
  }
  const job = { actorId: actor.id, projectId, requestId, agent };
  const reservation = await workflowStage('workflow_reservation', () => reserveDispatch(db, job, operation === 'reconcile'));
  if (reservation.dispatchId) {
    await workflowStage('workflow_dispatch', () => start(runAssessment, [{ ...job, dispatchId: reservation.dispatchId }]));
  }
  return { status: reservation.status, requestId };
});
