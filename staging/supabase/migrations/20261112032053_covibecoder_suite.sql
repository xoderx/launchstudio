begin;
-- Separate membership entitlement. No existing customer is enrolled implicitly.
create table public.business_suite_entitlements (
  business_id uuid not null references public.businesses(id),
  suite text not null check (suite='covibecoder'),
  enabled boolean not null default false,
  expires_at timestamptz,
  updated_at timestamptz not null default now(),
  primary key(business_id,suite)
);
alter table public.business_suite_entitlements enable row level security;
revoke all on public.business_suite_entitlements from public,anon,authenticated;
grant select on public.business_suite_entitlements to authenticated;
create policy suite_entitlement_read on public.business_suite_entitlements for select to authenticated
  using (launchstudio_private.can_access_business(business_id));

create function launchstudio_private.can_access_covibecoder(target uuid, write_access boolean default false)
returns boolean language sql stable security definer set search_path='' as $$
  select auth.uid() is not null and exists (
    select 1 from public.business_projects p
    join public.business_suite_entitlements e on e.business_id=p.business_id and e.suite='covibecoder'
    where p.id=target and e.enabled and (e.expires_at is null or e.expires_at>now())
      and launchstudio_private.can_access_business(p.business_id,write_access)
  );
$$;
revoke all on function launchstudio_private.can_access_covibecoder(uuid,boolean) from public,anon;
grant execute on function launchstudio_private.can_access_covibecoder(uuid,boolean) to authenticated;

alter table public.tool_deliverables drop constraint tool_deliverables_tool_position_check;
alter table public.tool_deliverables add constraint tool_deliverables_tool_position_check
  check(tool_position between 1 and 65);
alter policy tool_deliverable_read on public.tool_deliverables using (
  (tool_position<=52 and launchstudio_private.can_access_project(project_id)) or
  (tool_position>=53 and launchstudio_private.can_access_covibecoder(project_id))
);

create table public.covibecoder_contexts (
  project_id uuid primary key references public.business_projects(id),
  source_project_id uuid not null references public.business_projects(id),
  imported_by uuid not null references public.customer_profiles(user_id),
  imported_at timestamptz not null default now(),
  snapshot jsonb not null check(jsonb_typeof(snapshot)='object' and octet_length(snapshot::text)<=128000)
);
alter table public.covibecoder_contexts enable row level security;
revoke all on public.covibecoder_contexts from public,anon,authenticated;
grant select on public.covibecoder_contexts to authenticated;
create policy covibecoder_context_read on public.covibecoder_contexts for select to authenticated
  using (launchstudio_private.can_access_covibecoder(project_id));
create index covibecoder_context_source_idx on public.covibecoder_contexts(source_project_id);

create function public.import_covibecoder_context(target uuid, source uuid) returns void
language plpgsql security definer set search_path='' as $$
declare context jsonb;
begin
  if not launchstudio_private.can_access_covibecoder(target,true) or not exists (
    select 1 from public.business_projects t join public.business_projects s on s.business_id=t.business_id
    where t.id=target and s.id=source and t.status='active'
      and launchstudio_private.can_access_project(source)
  ) then raise exception 'Context unavailable' using errcode='42501'; end if;
  select jsonb_build_object('sourceProjectId',p.id,'sourceName',p.name,'sourceGoal',p.goal,
    'assessments',coalesce((select jsonb_agg(jsonb_build_object(
      'assessmentId',v.assessment_id,'projectId',v.project_id,'version',v.version,'agent',v.agent,'result',v.result) order by v.agent)
      from (select distinct on (agent) * from public.assessment_versions
        where project_id=source and approval_status='approved' order by agent,version desc) v),'[]'::jsonb),
    'deliverables',coalesce((select jsonb_agg(jsonb_build_object(
      'deliverableId',d.id,'projectId',d.project_id,'toolPosition',d.tool_position,'version',d.version,'content',d.content) order by d.tool_position)
      from (select distinct on (tool_position) * from public.tool_deliverables
        where project_id=source and tool_position<=52 and approved_at is not null
        order by tool_position,version desc) d),'[]'::jsonb)) into context
  from public.business_projects p where p.id=source;
  if jsonb_array_length(context->'assessments')+jsonb_array_length(context->'deliverables')=0
    then raise exception 'Approve source work before importing' using errcode='22023'; end if;
  if octet_length(context::text)>128000 then raise exception 'Approved context exceeds import size limit' using errcode='22023'; end if;
  insert into public.covibecoder_contexts(project_id,source_project_id,imported_by,snapshot)
    values(target,source,auth.uid(),context)
  on conflict(project_id) do update set source_project_id=excluded.source_project_id,
    imported_by=excluded.imported_by,imported_at=now(),snapshot=excluded.snapshot;
end;
$$;
revoke all on function public.import_covibecoder_context(uuid,uuid) from public,anon;
grant execute on function public.import_covibecoder_context(uuid,uuid) to authenticated;

-- Preserve the original RPC signature and the original 52-tool behavior.
create or replace function public.save_tool_deliverable(target uuid, tool integer, request uuid, draft jsonb)
returns uuid language plpgsql security definer set search_path='' as $$
declare saved uuid; imported jsonb;
begin
  if auth.uid() is null or not exists (
    select 1 from public.business_projects p where p.id=target and p.status='active'
      and launchstudio_private.can_access_business(p.business_id,true)
  ) or (tool>=53 and not launchstudio_private.can_access_covibecoder(target,true))
    then raise exception 'Project unavailable' using errcode='42501'; end if;
  if tool is null or tool not between 1 and 65 or request is null or draft is null or
     jsonb_typeof(draft) <> 'object' or octet_length(draft::text)>32000 or
     not (draft ?& array['input','summary','deliverables','evidence','assumptions','recommendations','actionPlan','checklist']) or
     jsonb_typeof(draft->'deliverables') is distinct from 'array' or
     nullif(btrim(draft->>'summary'),'') is null or nullif(btrim(draft->>'input'),'') is null
  then raise exception 'Invalid draft' using errcode='22023'; end if;
  if jsonb_array_length(draft->'deliverables')<>3 or exists (
    select from jsonb_array_elements(draft->'deliverables') item
    where jsonb_typeof(item) <> 'string' or nullif(btrim(item #>> '{}'),'') is null
  ) then raise exception 'Invalid deliverable sections' using errcode='22023'; end if;
  if tool>=53 and (jsonb_typeof(draft->'inputs') is distinct from 'object' or exists (
    select from unnest(array['field1','field2','field3']) f
    where jsonb_typeof(draft->'inputs'->f) is distinct from 'string'
      or nullif(btrim(draft->'inputs'->>f),'') is null or char_length(draft->'inputs'->>f)>1800
  )) then raise exception 'Complete the tool-specific inputs' using errcode='22023'; end if;
  perform pg_advisory_xact_lock(hashtextextended(target::text || ':' || tool::text,0));
  select id into saved from public.tool_deliverables
    where project_id=target and tool_position=tool and author_id=auth.uid() and request_id=request;
  if saved is not null then return saved; end if;
  if tool>=53 then
    select coalesce((select jsonb_agg(item-'result') from jsonb_array_elements(c.snapshot->'assessments') item),'[]'::jsonb)
      || coalesce((select jsonb_agg(item-'content') from jsonb_array_elements(c.snapshot->'deliverables') item),'[]'::jsonb)
      into imported from public.covibecoder_contexts c where c.project_id=target;
  end if;
  insert into public.tool_deliverables(project_id,tool_position,version,spec_version,request_id,author_id,content,sources)
  select target,tool,coalesce((select max(version) from public.tool_deliverables where project_id=target and tool_position=tool),0)+1,
    1,request,auth.uid(),draft,coalesce((
      select jsonb_agg(jsonb_build_object('assessmentId',s.assessment_id,'version',s.version,'agent',s.agent) order by s.agent)
      from (select distinct on (agent) agent,assessment_id,version from public.assessment_versions
        where project_id=target and approval_status='approved' order by agent,version desc) s
    ),'[]'::jsonb) || coalesce(imported,'[]'::jsonb) || coalesce((
      select jsonb_build_array(jsonb_build_object('deliverableId',d.id,'toolPosition',d.tool_position,'version',d.version))
      from public.tool_deliverables d where d.project_id=target and d.tool_position<tool and d.approved_at is not null
        and (tool<=52 or d.tool_position>=53)
      order by d.tool_position desc,d.version desc limit 1
    ),'[]'::jsonb)
  returning id into saved;
  return saved;
end;
$$;

create or replace function public.approve_tool_deliverable(target uuid) returns void
language plpgsql security definer set search_path='' as $$
begin
  update public.tool_deliverables d set approved_at=now(), approved_by=auth.uid()
  from public.business_projects p where d.id=target and p.id=d.project_id and p.status='active'
    and d.approved_at is null and auth.uid() is not null
    and launchstudio_private.can_access_business(p.business_id,true)
    and (d.tool_position<=52 or launchstudio_private.can_access_covibecoder(p.id,true));
  if not found then raise exception 'Deliverable unavailable' using errcode='42501'; end if;
end;
$$;
-- Invoker execution preserves RLS and entitlement checks while aggregating all
-- versions; the UI does not infer completion from a truncated history page.
create function public.covibecoder_progress(target uuid)
returns table(tool_position integer,version integer,approved_at timestamptz,created_at timestamptz,has_approved boolean)
language sql stable security invoker set search_path='' as $$
  with latest as (
    select d.tool_position,max(d.version) as version,bool_or(d.approved_at is not null) as has_approved
    from public.tool_deliverables d where d.project_id=target and d.tool_position between 53 and 65
    group by d.tool_position
  )
  select d.tool_position,d.version,d.approved_at,d.created_at,l.has_approved
  from latest l join public.tool_deliverables d on d.project_id=target
    and d.tool_position=l.tool_position and d.version=l.version;
$$;
revoke all on function public.covibecoder_progress(uuid) from public,anon;
grant execute on function public.covibecoder_progress(uuid) to authenticated;
commit;
