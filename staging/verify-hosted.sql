-- Read-only checks. Confirm the project in the Supabase UI before running.
begin read only;
select current_setting('server_version') as postgres_version;
select tablename, rowsecurity from pg_tables
where schemaname = 'public' order by tablename;
select conrelid::regclass as relation, conname, pg_get_constraintdef(oid) as definition
from pg_constraint
where connamespace = 'public'::regnamespace and contype in ('f', 'u')
order by conrelid::regclass::text, conname;
select tablename, policyname, roles, cmd, qual, with_check from pg_policies
where schemaname = 'public' order by tablename, policyname;
select table_name, grantee, privilege_type, column_name
from information_schema.column_privileges
where table_schema = 'public' and grantee in ('PUBLIC', 'anon', 'authenticated')
order by table_name, grantee, privilege_type, column_name;
select p.oid::regprocedure as routine, p.prosecdef as security_definer,
       p.proconfig as routine_settings,
       has_function_privilege('anon', p.oid, 'execute') as anonymous_execute,
       has_function_privilege('authenticated', p.oid, 'execute') as authenticated_execute
from pg_proc p
where p.oid = 'public.approve_idea_assessment(uuid,integer)'::regprocedure;
select version, name, statements from supabase_migrations.schema_migrations order by version;
commit;
