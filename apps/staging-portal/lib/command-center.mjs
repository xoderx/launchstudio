export const agentNames = {
  'idea-validator': 'Idea Validator',
  'market-intelligence': 'Market Intelligence',
};

function rows({ data, error }) {
  if (error) throw error;
  return data;
}

export async function loadProject(db, projectId) {
  const [versions, runs, progress] = await Promise.all([
    db.from('assessment_versions').select('project_id, assessment_id, run_id, agent, version, result, approval_status, approved_at, created_at')
      .eq('project_id', projectId).order('created_at', { ascending: false }),
    db.from('agent_runs').select('project_id, id, actor_id, request_id, agent, status, source_assessment_id, source_assessment_version, created_at')
      .eq('project_id', projectId).order('created_at', { ascending: false }),
    db.from('workflow_progress').select('project_id, stage, next_agent, outstanding_tasks')
      .eq('project_id', projectId).maybeSingle(),
  ]);
  return {
    projectId,
    versions: rows(versions).filter(item => item.project_id === projectId),
    runs: rows(runs).filter(item => item.project_id === projectId),
    progress: rows(progress)?.project_id === projectId ? progress.data : null,
  };
}

export function projectView(snapshot, projectId) {
  if (!projectId || snapshot?.projectId !== projectId) return null;
  const { versions, runs, progress } = snapshot;
  const approvedIdea = versions.filter(item => item.agent === 'idea-validator' && item.approval_status === 'approved')
    .sort((a, b) => b.version - a.version)[0];
  const pendingIdea = versions.find(item => item.agent === 'idea-validator' && item.approval_status === 'pending');
  const savedMarket = versions.find(item => item.agent === 'market-intelligence');
  const completed = [
    versions.some(item => item.agent === 'idea-validator') && 'Save an Idea Validator assessment',
    approvedIdea && 'Approve an Idea Validator version',
    savedMarket && 'Save a Market Intelligence assessment',
  ].filter(Boolean);
  const next = progress?.outstanding_tasks?.find(task => typeof task === 'string' && task.trim()) ??
    (savedMarket ? 'Review the market analysis' : approvedIdea ? 'Run Market Intelligence' :
      pendingIdea ? 'Review the pending Idea Validator assessment' : 'Run Idea Validator');
  return { ...snapshot, approvedIdea, completed, next, runById: new Map(runs.map(run => [run.id, run])) };
}

export function workflowState(runs = [], pending, actor) {
  const matched = pending && runs.find(run => run.request_id === pending.requestId &&
    run.agent === pending.agent && run.actor_id === actor);
  const active = runs.find(run => ['queued', 'running'].includes(run.status));
  if (pending && !matched) return pending.status;
  return active?.status ?? matched?.status ?? 'idle';
}
