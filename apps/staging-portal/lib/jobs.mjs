import { createWorkflow } from '../../../staging/workflow.mjs';
import { agentRunner, database } from './runtime.mjs';

export async function runAssessment(job) {
  'use workflow';
  return executeAssessment(job);
}

async function executeAssessment({ actorId, ...request }) {
  'use step';
  // Only the authenticated queue entry point supplies actorId. The workflow
  // rechecks current membership when claiming and saving the assessment.
  const workflow = createWorkflow({
    database: database(),
    verifySession: async () => ({ id: actorId }),
    runAgent: agentRunner(),
  });
  // The HTTP route supplies request identifiers only. Keep assessment results
  // and business context in the database, outside durable step arguments.
  await workflow(request);
}
executeAssessment.maxRetries = 0;
