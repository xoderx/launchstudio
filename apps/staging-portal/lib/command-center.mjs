import { loadHistoryPage, visibleRequest } from './history.mjs';

export const agentNames = {
  'idea-validator': 'Idea Validator',
  'market-intelligence': 'Market Intelligence',
};

function rows({ data, error }) {
  if (error) throw error;
  return data;
}

export async function loadProject(db, projectId) {
  const project = rows(await db.from('business_projects').select('id').eq('id', projectId).maybeSingle());
  if (project?.id !== projectId) throw Object.assign(Error('Project unavailable'), { status: 404 });
  const version = (agent, approved = false) => {
    let query = db.from('assessment_versions').select('project_id, assessment_id, agent, version, approval_status')
      .eq('project_id', projectId).eq('agent', agent);
    if (approved) query = query.eq('approval_status', 'approved');
    return query.order('version', { ascending: false }).limit(1).maybeSingle();
  };
  const requestFields = 'project_id, actor_id, agent, request_id, status, can_reconcile, updated_at, created_at';
  const [versions, runs, progress, active, recent, idea, approvedIdea, market] = await Promise.all([
    loadHistoryPage(db, projectId, 'versions'),
    loadHistoryPage(db, projectId, 'runs'),
    db.from('workflow_progress').select('project_id, stage, next_agent, outstanding_tasks')
      .eq('project_id', projectId).maybeSingle(),
    db.from('workflow_requests').select(requestFields).eq('project_id', projectId)
      .in('status', ['queued', 'running', 'unknown']).limit(1).maybeSingle(),
    db.from('workflow_requests').select(requestFields).eq('project_id', projectId)
      .order('created_at', { ascending: false }).limit(12),
    version('idea-validator'), version('idea-validator', true), version('market-intelligence'),
  ]);
  const scoped = result => {
    const row = rows(result);
    return row?.project_id === projectId ? row : null;
  };
  return {
    projectId, versions: versions.items, runs: runs.items, progress: scoped(progress),
    pages: { versions, runs },
    summary: { idea: scoped(idea), approvedIdea: scoped(approvedIdea), market: scoped(market) },
    requests: rows(recent).filter(item => item.project_id === projectId).map(item => visibleRequest(item)),
    activeRequest: scoped(active) ? visibleRequest(active.data) : null,
  };
}

export function projectView(snapshot, projectId) {
  if (!projectId || snapshot?.projectId !== projectId) return null;
  const { versions, runs, progress } = snapshot;
  const approvedIdea = snapshot.summary ? snapshot.summary.approvedIdea : versions.filter(item => item.agent === 'idea-validator' && item.approval_status === 'approved')
    .sort((a, b) => b.version - a.version)[0];
  const pendingIdea = snapshot.summary ? snapshot.summary.idea?.approval_status === 'pending' :
    versions.find(item => item.agent === 'idea-validator' && item.approval_status === 'pending');
  const savedMarket = snapshot.summary ? snapshot.summary.market : versions.find(item => item.agent === 'market-intelligence');
  const completed = [
    (snapshot.summary ? snapshot.summary.idea : versions.some(item => item.agent === 'idea-validator')) && 'Save an Idea Validator assessment',
    approvedIdea && 'Approve an Idea Validator version',
    savedMarket && 'Save a Market Intelligence assessment',
  ].filter(Boolean);
  const active = snapshot.activeRequest;
  const recoveryAction = active?.status === 'unknown'
    ? active.can_reconcile ? 'Check the existing provider submission' : 'Contact support to verify the submission'
    : active ? 'Wait for the current workflow request' : undefined;
  const next = recoveryAction ?? progress?.outstanding_tasks?.find(task => typeof task === 'string' && task.trim()) ??
    (savedMarket ? 'Review the market analysis' : approvedIdea ? 'Run Market Intelligence' :
      pendingIdea ? 'Review the pending Idea Validator assessment' : 'Run Idea Validator');
  return { ...snapshot, approvedIdea, completed, next, runById: new Map([...runs, ...(snapshot.pages?.versions.sources ?? [])].map(run => [run.id, run])) };
}

export function workflowState(runs = [], pending, actor) {
  const matched = pending && runs.find(run => run.request_id === pending.requestId &&
    run.agent === pending.agent && run.actor_id === actor);
  const active = runs.find(run => ['queued', 'running'].includes(run.status));
  if (pending && !matched) return pending.status;
  return active?.status ?? matched?.status ?? 'idle';
}
