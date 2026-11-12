-- Keep older Preview builds able to create projects during rollout.
alter table public.business_projects
  add column name text not null default 'Untitled project',
  add constraint business_projects_name_length
    check (char_length(btrim(name)) between 1 and 160);

grant insert (name), update (name) on public.business_projects to authenticated;
