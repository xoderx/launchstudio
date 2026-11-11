begin;
alter table public.assessment_versions
  add constraint assessment_versions_project_identity
  unique (assessment_id, version, project_id, agent);
alter table public.agent_runs
  add column source_assessment_id uuid,
  add column source_assessment_version integer,
  add column source_agent text generated always as (
    case when source_assessment_id is not null then 'idea-validator' end
  ) stored,
  add constraint agent_runs_source_pair check (
    (source_assessment_id is null) = (source_assessment_version is null)
    and (source_assessment_id is null or agent = 'market-intelligence')
  ),
  add constraint agent_runs_source_version foreign key (
    source_assessment_id, source_assessment_version, project_id, source_agent
  ) references public.assessment_versions (assessment_id, version, project_id, agent);
commit;
