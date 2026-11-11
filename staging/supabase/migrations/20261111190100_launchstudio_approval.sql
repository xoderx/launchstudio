begin;
create function public.approve_idea_assessment(target uuid, target_version integer) returns void
language plpgsql security definer set search_path='' as $$
declare project uuid;
begin
  select v.project_id into project from public.assessment_versions v
    join public.business_projects p on p.id=v.project_id
    where v.assessment_id=target and v.version=target_version
      and v.agent='idea-validator' and p.status='active'
      and launchstudio_private.can_access_business(p.business_id,true);
  if project is null then raise exception 'Assessment unavailable' using errcode='42501'; end if;
  update public.assessment_versions set approval_status='approved',approved_by=auth.uid(),approved_at=now()
    where assessment_id=target and version=target_version and approval_status='pending';
  if not found then raise exception 'Assessment unavailable' using errcode='42501'; end if;
  insert into public.workflow_progress(project_id,stage,next_agent,outstanding_tasks)
  values(project,'research','market-intelligence','["Run Market Intelligence"]')
  on conflict(project_id) do update set stage=excluded.stage,next_agent=excluded.next_agent,outstanding_tasks=excluded.outstanding_tasks;
end;
$$;
revoke all on function public.approve_idea_assessment(uuid,integer) from public, anon;
grant execute on function public.approve_idea_assessment(uuid,integer) to authenticated;
commit;
