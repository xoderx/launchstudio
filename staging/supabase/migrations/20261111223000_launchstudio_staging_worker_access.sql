-- Staging-only provisioning, separate from the deployed schema migrations.
-- Run as the authorized administrator after verifying the project.
-- Set a password with a secure credential tool before enabling LOGIN.
begin;
create role launchstudio_worker nologin noinherit nobypassrls;
grant usage on schema public to launchstudio_worker;

grant select on public.businesses, public.business_memberships, public.business_projects,
  public.agent_runs, public.assessments, public.assessment_versions, public.workflow_progress
  to launchstudio_worker;
-- PostgreSQL requires an UPDATE grant for SELECT FOR SHARE. WITH CHECK
-- prevents this role from changing a business row.
grant update (updated_at) on public.businesses to launchstudio_worker;
grant insert (project_id, actor_id, agent, request_id, status, source_assessment_id, source_assessment_version),
  update (status) on public.agent_runs to launchstudio_worker;
grant insert (project_id, agent), update (agent) on public.assessments to launchstudio_worker;
grant insert (assessment_id, project_id, agent, version, run_id, result)
  on public.assessment_versions to launchstudio_worker;
grant insert (project_id, stage, next_agent, outstanding_tasks),
  update (stage, next_agent, outstanding_tasks) on public.workflow_progress to launchstudio_worker;

create policy worker_business_read on public.businesses for select to launchstudio_worker using (true);
create policy worker_business_lock on public.businesses for update to launchstudio_worker using (true) with check (false);
create policy worker_membership_read on public.business_memberships for select to launchstudio_worker using (true);
create policy worker_project_read on public.business_projects for select to launchstudio_worker using (true);
create policy worker_run_read on public.agent_runs for select to launchstudio_worker using (true);
create policy worker_run_create on public.agent_runs for insert to launchstudio_worker with check (true);
create policy worker_run_update on public.agent_runs for update to launchstudio_worker using (true) with check (true);
create policy worker_assessment_read on public.assessments for select to launchstudio_worker using (true);
create policy worker_assessment_create on public.assessments for insert to launchstudio_worker with check (true);
create policy worker_assessment_update on public.assessments for update to launchstudio_worker using (true) with check (true);
create policy worker_version_read on public.assessment_versions for select to launchstudio_worker using (true);
create policy worker_version_create on public.assessment_versions for insert to launchstudio_worker with check (true);
create policy worker_progress_read on public.workflow_progress for select to launchstudio_worker using (true);
create policy worker_progress_create on public.workflow_progress for insert to launchstudio_worker with check (true);
create policy worker_progress_update on public.workflow_progress for update to launchstudio_worker using (true) with check (true);
commit;
