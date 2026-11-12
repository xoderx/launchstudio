import { createWorkflow } from '../../../staging/workflow.mjs';
import { agentRunner, database } from './runtime.mjs';
import { claimDispatch, updateDispatch } from './workflow-requests.mjs';

export async function runAssessment(job) {
  'use workflow';
  return executeAssessment(job);
}

async function executeAssessment(job) {
  'use step';
  const db = database();
  const workflow = createWorkflow({
    database: db,
    verifySession: async () => ({ id: job.actorId }),
    runAgent: agentRunner(),
  });
  if (!job.dispatchId) {
    await workflow(job);
    return;
  }
  const claim = await claimDispatch(db, job);
  if (!claim) return;
  let status;
  try {
    const result = await workflow({
      ...job,
      recovery: {
        providerId: claim.provider_submission_id,
        acknowledge: id => updateDispatch(db, job, 'running', id),
      },
    });
    status = result.status === 'succeeded' ? 'completed' : result.status === 'failed' ? 'failed' : 'unknown';
  } catch (error) {
    status = error.terminal === true ? 'failed' : 'unknown';
    console.error(JSON.stringify({ event: 'workflow_request_failure', requestId: job.requestId, status }));
  }
  await updateDispatch(db, job, status);
}
executeAssessment.maxRetries = 0;
