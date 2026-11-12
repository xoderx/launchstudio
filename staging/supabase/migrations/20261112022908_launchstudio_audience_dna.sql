alter table public.agent_runs drop constraint agent_runs_agent_check,
  add constraint agent_runs_agent_check check (agent in ('idea-validator','market-intelligence','audience-dna')),
  drop constraint agent_runs_source_pair,
  add constraint agent_runs_source_pair check (
    (source_assessment_id is null) = (source_assessment_version is null)
    and (source_assessment_id is null or agent in ('market-intelligence','audience-dna'))
  ),
  add column market_assessment_id uuid,
  add column market_assessment_version integer,
  add column market_source_agent text generated always as (
    case when market_assessment_id is not null then 'market-intelligence' end
  ) stored,
  add constraint agent_runs_market_source_pair check (
    (market_assessment_id is null) = (market_assessment_version is null)
    and (market_assessment_id is not null) = (agent = 'audience-dna')
    and (agent <> 'audience-dna' or source_assessment_id is not null)
  ),
  add constraint agent_runs_market_source_version foreign key (
    market_assessment_id,market_assessment_version,project_id,market_source_agent
  ) references public.assessment_versions(assessment_id,version,project_id,agent);

alter table public.assessments drop constraint assessments_agent_check,
  add constraint assessments_agent_check check (agent in ('idea-validator','market-intelligence','audience-dna'));
alter table public.workflow_requests drop constraint workflow_requests_agent_check,
  add constraint workflow_requests_agent_check check (agent in ('idea-validator','market-intelligence','audience-dna'));

grant insert (market_assessment_id,market_assessment_version) on public.agent_runs to launchstudio_worker;

create function public.approve_targeting_assessment(target uuid, target_version integer) returns void
language plpgsql security definer set search_path='' as $$
begin
  update public.assessment_versions v
    set approval_status='approved',approved_by=auth.uid(),approved_at=now()
    from public.business_projects p
    where p.id=v.project_id and p.status='active'
      and v.assessment_id=target and v.version=target_version
      and v.agent in ('market-intelligence','audience-dna') and v.approval_status='pending'
      and launchstudio_private.can_access_business(p.business_id,true);
  if not found then raise exception 'Assessment unavailable' using errcode='42501'; end if;
end;
$$;
revoke all on function public.approve_targeting_assessment(uuid,integer) from public, anon;
grant execute on function public.approve_targeting_assessment(uuid,integer) to authenticated;
