-- Public interest capture is server-only and creates no customer entitlement.
begin;
create table public.marketing_leads (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null unique,
  email text not null check (char_length(email) between 3 and 254 and position('@' in email)>1),
  goal text not null check (char_length(btrim(goal)) between 5 and 2000),
  interest text not null check (interest in ('membership','growth-suite','covibecoder','managed-implementation','partnership','general','support')),
  business_name text check (char_length(business_name)<=120),
  source text not null check (source in ('early-access','contact','partners','pricing')),
  consent boolean not null check(consent=true),
  consent_version text not null check(consent_version='early-access-v1'),
  ip_hash text not null check(ip_hash ~ '^[a-f0-9]{64}$'),
  created_at timestamptz not null default now()
);
alter table public.marketing_leads enable row level security;
revoke all on public.marketing_leads from public,anon,authenticated,launchstudio_worker;
-- The worker may insert inquiries, but cannot retrieve their email or content.
grant insert(request_id,email,goal,interest,business_name,source,consent,consent_version,ip_hash)
  on public.marketing_leads to launchstudio_worker;
grant select(id,request_id,ip_hash,created_at) on public.marketing_leads to launchstudio_worker;
create policy marketing_lead_worker_insert on public.marketing_leads for insert to launchstudio_worker
  with check(consent=true);
create policy marketing_lead_worker_metadata on public.marketing_leads for select to launchstudio_worker using(true);
create index marketing_leads_ip_time_idx on public.marketing_leads(ip_hash,created_at desc);
create index marketing_leads_created_idx on public.marketing_leads(created_at desc);
comment on table public.marketing_leads is 'Admin-only interest inquiries. No account, subscription, billing or suite access is created. Retention policy requires review before public launch.';
commit;
