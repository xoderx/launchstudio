create table public.workflow_requests (
  project_id uuid not null references public.business_projects(id),
  actor_id uuid not null references public.customer_profiles(user_id),
  agent text not null check (agent in ('idea-validator', 'market-intelligence')),
  request_id uuid not null,
  dispatch_id uuid not null,
  status text not null default 'queued' check (status in ('queued', 'running', 'completed', 'failed', 'unknown')),
  provider_submission_id text check (char_length(provider_submission_id) between 1 and 128),
  can_reconcile boolean generated always as (provider_submission_id is not null) stored,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  primary key (project_id, actor_id, agent, request_id)
);
alter table public.workflow_requests enable row level security;
revoke all on public.workflow_requests from public, anon, authenticated;
grant select (project_id, actor_id, agent, request_id, status, can_reconcile, updated_at, created_at)
  on public.workflow_requests to authenticated;
create policy workflow_request_read on public.workflow_requests for select to authenticated
  using (launchstudio_private.can_access_project(project_id));
grant select on public.workflow_requests to launchstudio_worker;
grant insert (project_id, actor_id, agent, request_id, dispatch_id),
  update (status, dispatch_id, provider_submission_id) on public.workflow_requests to launchstudio_worker;
create policy workflow_request_worker_read on public.workflow_requests for select to launchstudio_worker using (true);
create policy workflow_request_worker_insert on public.workflow_requests for insert to launchstudio_worker with check (true);
create policy workflow_request_worker_update on public.workflow_requests for update to launchstudio_worker using (true) with check (true);
create trigger workflow_request_updated before update on public.workflow_requests
  for each row execute function launchstudio_private.touch_updated_at();
create unique index workflow_request_one_active_per_project
  on public.workflow_requests(project_id) where status in ('queued', 'running', 'unknown');
create index workflow_request_history_idx on public.workflow_requests(project_id, created_at desc, request_id desc);
create index agent_run_history_idx on public.agent_runs(project_id, created_at desc, id desc);
create index assessment_version_history_idx on public.assessment_versions(project_id, created_at desc, run_id desc);
