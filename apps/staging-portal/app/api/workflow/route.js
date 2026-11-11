import { start } from 'workflow/api';
import { createRequestHandler } from '../../../../../staging/request-handler.mjs';
import { createSessionVerifier } from '../../../../../staging/workflow.mjs';
import { publicConfig } from '../../../lib/config.mjs';
import { database } from '../../../lib/runtime.mjs';
import { runAssessment } from '../../../lib/jobs.mjs';
import { workflowStage } from '../../../lib/workflow-diagnostics.mjs';

const uuid = /^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i;
const agents = new Set(['idea-validator', 'market-intelligence']);

export const POST = createRequestHandler(async ({ token, projectId, requestId, agent }) => {
  const config = await workflowStage('public_config', publicConfig);
  const actor = await workflowStage('session_verification', () => createSessionVerifier(config)(token));
  if (!actor) throw Object.assign(new Error(), { status: 401 });
  if (!uuid.test(projectId) || !uuid.test(requestId) || !agents.has(agent)) {
    throw Object.assign(new Error(), { status: 400 });
  }
  const db = await workflowStage('database_config', database);
  const { rows: [project] } = await workflowStage('project_authorization', () => db.query(`
    select p.id, r.id as run_id, r.status
    from public.business_projects p join public.businesses b on b.id = p.business_id
    left join public.agent_runs r on r.project_id = p.id and r.actor_id = $2
      and r.request_id = $3 and r.agent = $4
    where p.id = $1 and p.status = 'active' and (b.owner_id = $2 or exists (
      select 1 from public.business_memberships m
      where m.business_id = b.id and m.user_id = $2 and m.role = 'editor'
    ))`, [projectId, actor.id, requestId, agent]));
  if (!project) throw Object.assign(new Error(), { status: 404 });
  if (project.run_id) {
    if (project.status !== 'running') return { runId: project.run_id, status: project.status };
    const { rows: [run] } = await workflowStage('existing_run', () => db.query(`
      update public.agent_runs set status = 'failed'
      where id = $1 and actor_id = $2 and status = 'running'
        and updated_at < now() - interval '5 minutes'
      returning status`, [project.run_id, actor.id]));
    return { runId: project.run_id, status: run?.status ?? project.status };
  }
  if (agent === 'market-intelligence') {
    const { rowCount } = await workflowStage('assessment_prerequisite', () => db.query(`
      select 1 from public.assessment_versions
      where project_id = $1 and agent = 'idea-validator' and approval_status = 'approved'
      limit 1`, [projectId]));
    if (!rowCount) throw Object.assign(new Error(), { status: 409 });
  }
  await workflowStage('workflow_dispatch', () => start(runAssessment, [{ actorId: actor.id, projectId, requestId, agent }]));
  return { status: 'queued', requestId };
});
