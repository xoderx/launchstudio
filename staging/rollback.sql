-- Staging rollback. Remove the route first and take a verified database backup.
begin;
drop table if exists public.workflow_requests;
drop function if exists public.approve_targeting_assessment(uuid, integer);
drop function public.approve_idea_assessment(uuid, integer);
drop table public.workflow_progress, public.assessment_versions, public.assessments,
  public.agent_runs, public.business_projects, public.business_memberships,
  public.businesses, public.customer_profiles;
drop function launchstudio_private.can_access_project(uuid);
drop function launchstudio_private.can_access_business(uuid, boolean);
drop function launchstudio_private.touch_updated_at();
drop schema launchstudio_private;
commit;
