alter table if exists public.users
  add column if not exists role text;

update public.users
set role = coalesce(role, 'admin')
where role is null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'users_role_check'
  ) then
    alter table public.users
      add constraint users_role_check
      check (role in ('admin', 'development', 'production', 'logistics', 'sales'));
  end if;
end $$;

create index if not exists users_role_idx on public.users(role);
