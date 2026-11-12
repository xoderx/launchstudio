begin;
-- Confidential program records live outside the public Data API schema.
create table launchstudio_private.advanced_entitlements (
 business_id uuid not null references public.businesses(id), program text not null check(program in ('transform','exit')),
 enabled boolean not null default false, expires_at timestamptz,
 retention_days integer not null default 180 check(retention_days between 1 and 365), primary key(business_id,program)
);
create table launchstudio_private.advanced_access (
 business_id uuid not null references public.businesses(id), program text not null check(program in ('transform','exit')),
 user_id uuid not null references public.customer_profiles(user_id),
 role text not null check(role in ('reader','editor','approver')), expires_at timestamptz,
 primary key(business_id,program,user_id)
);
create table launchstudio_private.advanced_versions (
 id uuid primary key default gen_random_uuid(), project_id uuid not null references public.business_projects(id),
 program text not null check(program in ('transform','exit')), version integer not null check(version>0),
 actor_id uuid not null references public.customer_profiles(user_id), request_id uuid not null,
 content jsonb not null check(jsonb_typeof(content)='object' and octet_length(content::text)<=64000),
 created_at timestamptz not null default now(), expires_at timestamptz not null,
 approved_at timestamptz, approved_by uuid references public.customer_profiles(user_id),
 unique(project_id,program,version),unique(project_id,program,actor_id,request_id)
);
create table launchstudio_private.advanced_audit (
 id uuid primary key default gen_random_uuid(), actor_id uuid not null references public.customer_profiles(user_id),
 project_id uuid not null references public.business_projects(id), program text not null,
 action text not null check(action in ('read','save','approve')), version_id uuid,
 created_at timestamptz not null default now()
);
alter table launchstudio_private.advanced_entitlements enable row level security;
alter table launchstudio_private.advanced_access enable row level security;
alter table launchstudio_private.advanced_versions enable row level security;
alter table launchstudio_private.advanced_audit enable row level security;
revoke all on launchstudio_private.advanced_entitlements,launchstudio_private.advanced_access,
 launchstudio_private.advanced_versions,launchstudio_private.advanced_audit from public,anon,authenticated,launchstudio_worker;
create index advanced_version_history on launchstudio_private.advanced_versions(project_id,program,version desc);
create index advanced_audit_history on launchstudio_private.advanced_audit(project_id,created_at desc);

create function public.advanced_workspace(target uuid,program text,operation text default 'read',request uuid default null,draft jsonb default null,version_id uuid default null)
returns jsonb language plpgsql security definer set search_path='' as $$
declare access_role text; retention integer; saved uuid; payload jsonb; history jsonb;
begin
 if auth.uid() is null or program not in ('transform','exit') or operation not in ('read','save','approve') then
  raise exception 'Program unavailable' using errcode='42501'; end if;
 select a.role,e.retention_days into access_role,retention
 from public.business_projects p
 join launchstudio_private.advanced_entitlements e on e.business_id=p.business_id and e.program=advanced_workspace.program
 join launchstudio_private.advanced_access a on a.business_id=p.business_id and a.program=e.program and a.user_id=auth.uid()
 where p.id=target and e.enabled and (e.expires_at is null or e.expires_at>now())
 and (a.expires_at is null or a.expires_at>now()) and launchstudio_private.can_access_business(p.business_id)
 and (operation='read' or (p.status='active' and launchstudio_private.can_access_business(p.business_id,true)));
 if access_role is null or (operation='save' and access_role not in ('editor','approver'))
 or (operation='approve' and access_role<>'approver') then raise exception 'Program unavailable' using errcode='42501'; end if;
 if operation='save' then
  if request is null or draft is null or jsonb_typeof(draft)<>'object' or octet_length(draft::text)>64000
   or not(draft ?& array['intake','dimensions','artifacts','initiatives','decisions','scenario'])
   or jsonb_typeof(draft->'intake') is distinct from 'object' or jsonb_typeof(draft->'dimensions') is distinct from 'object'
   or jsonb_typeof(draft->'artifacts') is distinct from 'object' or jsonb_typeof(draft->'scenario') is distinct from 'object'
   or jsonb_typeof(draft->'initiatives') is distinct from 'array' or jsonb_typeof(draft->'decisions') is distinct from 'string'
   then raise exception 'Invalid planning package' using errcode='22023'; end if;
  if jsonb_array_length(draft->'initiatives')>20 then raise exception 'Too many initiatives' using errcode='22023'; end if;
  perform pg_advisory_xact_lock(hashtextextended(target::text||':'||program,0));
  select v.id into saved from launchstudio_private.advanced_versions v where v.project_id=target and v.program=advanced_workspace.program and v.actor_id=auth.uid() and v.request_id=request;
  if saved is not null then
   if not exists(select 1 from launchstudio_private.advanced_versions v where v.id=saved and v.content=draft and v.expires_at>now()) then raise exception 'Request already used; reload saved history' using errcode='22023'; end if;
  else
   insert into launchstudio_private.advanced_versions(project_id,program,version,actor_id,request_id,content,expires_at)
   select target,advanced_workspace.program,coalesce(max(v.version),0)+1,auth.uid(),request,draft,now()+make_interval(days=>retention)
   from launchstudio_private.advanced_versions v where v.project_id=target and v.program=advanced_workspace.program returning id into saved;
  end if;
 elsif operation='approve' then
  update launchstudio_private.advanced_versions v set approved_at=coalesce(v.approved_at,now()),approved_by=coalesce(v.approved_by,auth.uid())
   where v.id=version_id and v.project_id=target and v.program=advanced_workspace.program and v.expires_at>now() returning id into saved;
  if saved is null then raise exception 'Version unavailable' using errcode='42501'; end if;
 else
  select to_jsonb(v) into payload from launchstudio_private.advanced_versions v
   where v.project_id=target and v.program=advanced_workspace.program and v.expires_at>now() and (version_id is null or v.id=version_id)
   order by v.version desc limit 1;
  if version_id is not null and payload is null then raise exception 'Version unavailable' using errcode='42501'; end if;
 end if;
 insert into launchstudio_private.advanced_audit(actor_id,project_id,program,action,version_id) values(auth.uid(),target,program,operation,coalesce(saved,(payload->>'id')::uuid));
 select coalesce(jsonb_agg(x order by x.version desc),'[]'::jsonb) into history from (
  select v.id,v.version,v.created_at,v.approved_at,v.expires_at from launchstudio_private.advanced_versions v
  where v.project_id=target and v.program=advanced_workspace.program and v.expires_at>now() order by v.version desc limit 40
 ) x;
 return jsonb_build_object('access',access_role,'retentionDays',retention,'savedId',saved,'current',payload,'versions',history);
end;
$$;
revoke all on function public.advanced_workspace(uuid,text,text,uuid,jsonb,uuid) from public,anon,launchstudio_worker;
grant execute on function public.advanced_workspace(uuid,text,text,uuid,jsonb,uuid) to authenticated;
comment on function public.advanced_workspace(uuid,text,text,uuid,jsonb,uuid) is 'Audited private program boundary. Active individual grant + program entitlement + business membership required, including owners. No public table grants or broad AI worker access.';

-- Budget metadata extends the existing ledger; no competing execution ledger.
alter table public.workflow_requests add column provider text not null default 'pickaxe' check(provider in ('pickaxe','vercel-ai-gateway'));
alter table public.workflow_requests add column provider_model text;
alter table public.workflow_requests add column reserved_microusd bigint not null default 0 check(reserved_microusd>=0);
alter table public.workflow_requests add column reserved_tokens integer not null default 0 check(reserved_tokens>=0);
grant update(provider_model,reserved_microusd,reserved_tokens) on public.workflow_requests to launchstudio_worker;
create table public.ai_budget_accounts (
 actor_id uuid primary key references public.customer_profiles(user_id), plan text not null,
 enabled boolean not null default false,period_start timestamptz not null,period_end timestamptz not null check(period_end>period_start),
 limit_microusd bigint not null check(limit_microusd>=0),token_limit bigint not null check(token_limit>=0),
 spent_microusd bigint not null default 0 check(spent_microusd>=0),reserved_microusd bigint not null default 0 check(reserved_microusd>=0),
 used_tokens bigint not null default 0 check(used_tokens>=0),reserved_tokens bigint not null default 0 check(reserved_tokens>=0)
);
alter table public.ai_budget_accounts enable row level security;
revoke all on public.ai_budget_accounts from public,anon,authenticated,launchstudio_worker;
grant select on public.ai_budget_accounts to launchstudio_worker;
grant update(reserved_microusd,reserved_tokens) on public.ai_budget_accounts to launchstudio_worker;
create policy worker_budget_metadata on public.ai_budget_accounts for all to launchstudio_worker using(true) with check(true);

alter table public.marketing_leads drop constraint marketing_leads_interest_check;
alter table public.marketing_leads add constraint marketing_leads_interest_check check(interest in (
 'membership','growth-suite','covibecoder','managed-implementation','partnership','general','support',
 'transformation-assessment','transformation-blueprint','exit-assessment','value-advisory','done-with-you','outcaas'));
commit;
