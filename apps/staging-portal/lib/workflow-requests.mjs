import { randomUUID } from 'node:crypto';

export const requestKey = 'project_id=$1 and actor_id=$2 and agent=$3 and request_id=$4';
export const requestArgs = ({ projectId, actorId, agent, requestId }) => [projectId, actorId, agent, requestId];
const stale = "updated_at < now() - interval '5 minutes'";

export async function reserveDispatch(db, job, reconcile) {
  const args = requestArgs(job);
  const dispatchId = randomUUID();
  const { rows: [reservation] } = reconcile
    ? await db.query(`
        update public.workflow_requests set status='queued', dispatch_id=$5
        where ${requestKey} and provider_submission_id is not null
          and (status='unknown' or (status in ('queued','running') and ${stale}))
        returning status`, [...args, dispatchId])
    : await db.query(`
        insert into public.workflow_requests(project_id, actor_id, agent, request_id, dispatch_id)
        select $1,$2,$3,$4,$5
        where not exists (
          select 1 from public.agent_runs r
          where r.project_id=$1 and r.status in ('queued','running')
            and not exists (select 1 from public.workflow_requests w
              where (w.project_id,w.actor_id,w.agent,w.request_id)=(r.project_id,r.actor_id,r.agent,r.request_id))
        ) and not exists (
          select 1 from (
            select * from public.agent_runs where project_id=$1 and agent=$3
            order by created_at desc,id desc limit 1
          ) r where r.status='failed'
            and not exists (select 1 from public.workflow_requests w
              where (w.project_id,w.actor_id,w.agent,w.request_id)=(r.project_id,r.actor_id,r.agent,r.request_id))
        )
        on conflict do nothing returning status`, [...args, dispatchId]);
  if (reservation) return { dispatchId, status: reservation.status };

  const { rows: [existing] } = await db.query(`
    select status from public.workflow_requests where ${requestKey}`, args);
  if (existing) return { status: existing.status };
  throw Object.assign(Error('Workflow conflict'), { status: 409 });
}

export async function claimDispatch(db, job) {
  const { rows: [row] } = await db.query(`
    update public.workflow_requests set status='running'
    where ${requestKey} and dispatch_id=$5 and status='queued' and provider='pickaxe'
    returning provider_submission_id`, [...requestArgs(job), job.dispatchId]);
  return row;
}

export async function updateDispatch(db, job, status, providerId = null) {
  const { rowCount } = await db.query(`
    update public.workflow_requests
    set status=$6, provider_submission_id=coalesce(provider_submission_id,$7)
    where ${requestKey} and dispatch_id=$5 and status='running'
      and ($7::text is null or provider_submission_id is null or provider_submission_id=$7)
  `, [...requestArgs(job), job.dispatchId, status, providerId]);
  if (!rowCount) throw Error('Workflow reservation is no longer active');
}
