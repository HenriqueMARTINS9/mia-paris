grant select on table public.inboxes to authenticated;
grant select on table public.email_threads to authenticated;
grant select on table public.emails to authenticated;
grant select on table public.email_attachments to authenticated;
grant select on table public.productions to authenticated;

alter table if exists public.email_threads enable row level security;
alter table if exists public.emails enable row level security;
alter table if exists public.email_attachments enable row level security;
alter table if exists public.productions enable row level security;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'email_threads'
      and policyname = 'users_can_read_own_email_threads'
  ) then
    create policy users_can_read_own_email_threads
      on public.email_threads
      for select
      using (
        exists (
          select 1
          from public.inboxes
          join public.users on users.id = inboxes.user_id
          where inboxes.id = email_threads.inbox_id
            and users.auth_user_id = auth.uid()
        )
      );
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'emails'
      and policyname = 'users_can_read_own_emails'
  ) then
    create policy users_can_read_own_emails
      on public.emails
      for select
      using (
        exists (
          select 1
          from public.inboxes
          join public.users on users.id = inboxes.user_id
          where inboxes.id = emails.inbox_id
            and users.auth_user_id = auth.uid()
        )
      );
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'email_attachments'
      and policyname = 'users_can_read_own_email_attachments'
  ) then
    create policy users_can_read_own_email_attachments
      on public.email_attachments
      for select
      using (
        exists (
          select 1
          from public.emails
          join public.inboxes on inboxes.id = emails.inbox_id
          join public.users on users.id = inboxes.user_id
          where emails.id = email_attachments.email_id
            and users.auth_user_id = auth.uid()
        )
      );
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'productions'
      and policyname = 'authenticated_users_can_read_productions'
  ) then
    create policy authenticated_users_can_read_productions
      on public.productions
      for select
      using (auth.role() = 'authenticated');
  end if;
end $$;
