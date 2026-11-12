create table public.tool_deliverables (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.business_projects(id),
  tool_position integer not null check (tool_position between 1 and 52),
  version integer not null check (version > 0),
  spec_version integer not null check (spec_version > 0),
  request_id uuid not null,
  author_id uuid not null references public.customer_profiles(user_id),
  content jsonb not null check (jsonb_typeof(content)='object' and octet_length(content::text)<=32000),
  sources jsonb not null default '[]' check (jsonb_typeof(sources)='array'),
  approved_by uuid references public.customer_profiles(user_id),
  approved_at timestamptz,
  created_at timestamptz not null default now(),
  unique(project_id,tool_position,version),
  unique(project_id,author_id,tool_position,request_id)
);
alter table public.tool_deliverables enable row level security;
revoke all on public.tool_deliverables from public, anon, authenticated;
grant select on public.tool_deliverables to authenticated;
create policy tool_deliverable_read on public.tool_deliverables for select to authenticated
  using (launchstudio_private.can_access_project(project_id));

create function public.save_tool_deliverable(target uuid, tool integer, request uuid, draft jsonb)
returns uuid language plpgsql security definer set search_path='' as $$
declare saved uuid;
begin
  if auth.uid() is null or not exists (
    select 1 from public.business_projects p where p.id=target and p.status='active'
      and launchstudio_private.can_access_business(p.business_id,true)
  ) then raise exception 'Project unavailable' using errcode='42501'; end if;
  if tool is null or tool not between 1 and 52 or request is null or draft is null or
     jsonb_typeof(draft) <> 'object' or octet_length(draft::text)>32000 or
     not (draft ?& array['input','summary','deliverables','evidence','assumptions','recommendations','actionPlan','checklist']) or
     jsonb_typeof(draft->'deliverables') is distinct from 'array' or
     nullif(btrim(draft->>'summary'),'') is null or nullif(btrim(draft->>'input'),'') is null
  then raise exception 'Invalid draft' using errcode='22023'; end if;
  if jsonb_array_length(draft->'deliverables')<>3 or exists (
    select from jsonb_array_elements(draft->'deliverables') item
    where jsonb_typeof(item) <> 'string' or nullif(btrim(item #>> '{}'),'') is null
  ) then raise exception 'Invalid deliverable sections' using errcode='22023'; end if;
  perform pg_advisory_xact_lock(hashtextextended(target::text || ':' || tool::text,0));
  select id into saved from public.tool_deliverables
    where project_id=target and tool_position=tool and author_id=auth.uid() and request_id=request;
  if saved is not null then return saved; end if;
  insert into public.tool_deliverables(project_id,tool_position,version,spec_version,request_id,author_id,content,sources)
  select target,tool,coalesce((select max(version) from public.tool_deliverables where project_id=target and tool_position=tool),0)+1,
    1,request,auth.uid(),draft,coalesce((
      select jsonb_agg(jsonb_build_object('assessmentId',s.assessment_id,'version',s.version,'agent',s.agent) order by s.agent)
      from (select distinct on (agent) agent,assessment_id,version from public.assessment_versions
        where project_id=target and approval_status='approved' order by agent,version desc) s
    ),'[]'::jsonb) || coalesce((
      select jsonb_build_array(jsonb_build_object('deliverableId',d.id,'toolPosition',d.tool_position,'version',d.version))
      from public.tool_deliverables d where d.project_id=target and d.tool_position<tool and d.approved_at is not null
      order by d.tool_position desc,d.version desc limit 1
    ),'[]'::jsonb)
  returning id into saved;
  return saved;
end;
$$;

create function public.approve_tool_deliverable(target uuid) returns void
language plpgsql security definer set search_path='' as $$
begin
  update public.tool_deliverables d set approved_at=now(), approved_by=auth.uid()
  from public.business_projects p where d.id=target and p.id=d.project_id and p.status='active'
    and d.approved_at is null and auth.uid() is not null
    and launchstudio_private.can_access_business(p.business_id,true);
  if not found then raise exception 'Deliverable unavailable' using errcode='42501'; end if;
end;
$$;
revoke all on function public.save_tool_deliverable(uuid,integer,uuid,jsonb) from public, anon;
revoke all on function public.approve_tool_deliverable(uuid) from public, anon;
grant execute on function public.save_tool_deliverable(uuid,integer,uuid,jsonb) to authenticated;
grant execute on function public.approve_tool_deliverable(uuid) to authenticated;
