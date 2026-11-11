begin;

create table public.customer_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null check (char_length(trim(display_name)) between 1 and 120),
  created_at timestamptz not null default now()
);
create table public.businesses (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.customer_profiles(user_id),
  name text not null check (char_length(trim(name)) between 1 and 160),
  profile jsonb not null default '{}' check (jsonb_typeof(profile) = 'object' and octet_length(profile::text) <= 32000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table public.business_memberships (
  business_id uuid not null references public.businesses(id),
  user_id uuid not null references public.customer_profiles(user_id),
  role text not null check (role in ('editor','viewer')),
  created_at timestamptz not null default now(),
  primary key (business_id,user_id)
);
create table public.business_projects (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id),
  goal text not null check (char_length(trim(goal)) between 1 and 2000),
  status text not null default 'active' check (status in ('active','completed','archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table public.agent_runs (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.business_projects(id),
  actor_id uuid not null references public.customer_profiles(user_id),
  agent text not null check (agent in ('idea-validator','market-intelligence')),
  request_id uuid not null,
  status text not null default 'queued' check (status in ('queued','running','succeeded','failed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(project_id,actor_id,agent,request_id),
  unique(id,project_id,agent)
);
create table public.assessments (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.business_projects(id),
  agent text not null check (agent in ('idea-validator','market-intelligence')),
  created_at timestamptz not null default now(),
  unique(project_id,agent),
  unique(id,project_id,agent)
);
create table public.assessment_versions (
  assessment_id uuid not null,
  project_id uuid not null,
  agent text not null,
  version integer not null check (version > 0),
  run_id uuid not null unique,
  result jsonb not null check (jsonb_typeof(result) = 'object' and octet_length(result::text) <= 64000),
  approval_status text not null default 'pending' check (approval_status in ('pending','approved','rejected')),
  approved_by uuid references public.customer_profiles(user_id),
  approved_at timestamptz,
  created_at timestamptz not null default now(),
  check ((approval_status = 'approved') = (approved_by is not null and approved_at is not null)),
  primary key(assessment_id,version),
  foreign key(assessment_id,project_id,agent) references public.assessments(id,project_id,agent),
  foreign key(run_id,project_id,agent) references public.agent_runs(id,project_id,agent)
);
create table public.workflow_progress (
  project_id uuid primary key references public.business_projects(id),
  stage text not null check (stage in ('intake','validate','approve','research','review')),
  next_agent text check (next_agent in ('idea-validator','market-intelligence')),
  outstanding_tasks jsonb not null default '[]' check (jsonb_typeof(outstanding_tasks) = 'array' and octet_length(outstanding_tasks::text) <= 16000),
  updated_at timestamptz not null default now()
);
create index businesses_owner_idx on public.businesses(owner_id);
create index memberships_user_idx on public.business_memberships(user_id,business_id);
create index projects_business_idx on public.business_projects(business_id);
create index runs_project_time_idx on public.agent_runs(project_id,created_at desc);
create index versions_project_idx on public.assessment_versions(project_id,agent,version desc);

create schema if not exists launchstudio_private;
revoke all on schema launchstudio_private from public;
grant usage on schema launchstudio_private to authenticated;
create function launchstudio_private.can_access_business(target uuid, write_access boolean default false)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.businesses b
    where b.id = target and (b.owner_id = (select auth.uid()) or exists (
      select 1 from public.business_memberships m where m.business_id=b.id and m.user_id=(select auth.uid())
      and (not write_access or m.role='editor')
    ))
  );
$$;
create function launchstudio_private.can_access_project(target uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.business_projects p where p.id=target and launchstudio_private.can_access_business(p.business_id));
$$;
revoke all on function launchstudio_private.can_access_business(uuid,boolean),launchstudio_private.can_access_project(uuid) from public;
grant execute on function launchstudio_private.can_access_business(uuid,boolean),launchstudio_private.can_access_project(uuid) to authenticated;

do $$
declare t text;
begin
  foreach t in array array['customer_profiles','businesses','business_memberships','business_projects','agent_runs','assessments','assessment_versions','workflow_progress'] loop
    execute format('alter table public.%I enable row level security',t);
    execute format('revoke all on public.%I from public, anon, authenticated',t);
    execute format('grant select on public.%I to authenticated',t);
  end loop;
end $$;
grant insert(user_id,display_name), update(display_name) on public.customer_profiles to authenticated;
grant insert(owner_id,name,profile), update(name,profile) on public.businesses to authenticated;
grant insert(business_id,goal), update(goal,status) on public.business_projects to authenticated;

create policy profile_read on public.customer_profiles for select to authenticated using(user_id=(select auth.uid()));
create policy profile_create on public.customer_profiles for insert to authenticated with check(user_id=(select auth.uid()));
create policy profile_update on public.customer_profiles for update to authenticated using(user_id=(select auth.uid())) with check(user_id=(select auth.uid()));
create policy business_read on public.businesses for select to authenticated using(owner_id=(select auth.uid()) or launchstudio_private.can_access_business(id));
create policy business_create on public.businesses for insert to authenticated with check(owner_id=(select auth.uid()));
create policy business_update on public.businesses for update to authenticated using(launchstudio_private.can_access_business(id,true)) with check(launchstudio_private.can_access_business(id,true));
create policy membership_read on public.business_memberships for select to authenticated using(user_id=(select auth.uid()));
create policy project_read on public.business_projects for select to authenticated using(launchstudio_private.can_access_business(business_id));
create policy project_create on public.business_projects for insert to authenticated with check(launchstudio_private.can_access_business(business_id,true));
create policy project_update on public.business_projects for update to authenticated using(launchstudio_private.can_access_business(business_id,true)) with check(launchstudio_private.can_access_business(business_id,true));
create policy run_read on public.agent_runs for select to authenticated using(launchstudio_private.can_access_project(project_id));
create policy assessment_read on public.assessments for select to authenticated using(launchstudio_private.can_access_project(project_id));
create policy version_read on public.assessment_versions for select to authenticated using(launchstudio_private.can_access_project(project_id));
create policy progress_read on public.workflow_progress for select to authenticated using(launchstudio_private.can_access_project(project_id));

create function launchstudio_private.touch_updated_at() returns trigger language plpgsql set search_path='' as $$
begin new.updated_at=now(); return new; end $$;
create trigger business_updated before update on public.businesses for each row execute function launchstudio_private.touch_updated_at();
create trigger project_updated before update on public.business_projects for each row execute function launchstudio_private.touch_updated_at();
create trigger run_updated before update on public.agent_runs for each row execute function launchstudio_private.touch_updated_at();
create trigger progress_updated before update on public.workflow_progress for each row execute function launchstudio_private.touch_updated_at();
commit;
