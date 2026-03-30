grant select on table public.inboxes to authenticated;
grant select on table public.email_threads to authenticated;
grant select on table public.emails to authenticated;
grant select on table public.email_attachments to authenticated;
grant update on table public.emails to authenticated;

alter table if exists public.inboxes enable row level security;
alter table if exists public.email_threads enable row level security;
alter table if exists public.emails enable row level security;
alter table if exists public.email_attachments enable row level security;

drop policy if exists users_can_read_own_inboxes on public.inboxes;
drop policy if exists users_can_read_own_email_threads on public.email_threads;
drop policy if exists users_can_read_own_emails on public.emails;
drop policy if exists users_can_read_own_email_attachments on public.email_attachments;
drop policy if exists authenticated_users_can_read_shared_inboxes on public.inboxes;
drop policy if exists authenticated_users_can_read_shared_email_threads on public.email_threads;
drop policy if exists authenticated_users_can_read_shared_emails on public.emails;
drop policy if exists authenticated_users_can_read_shared_email_attachments on public.email_attachments;
drop policy if exists authenticated_users_can_update_shared_emails on public.emails;

create policy authenticated_users_can_read_shared_inboxes
  on public.inboxes
  for select
  using (auth.role() = 'authenticated');

create policy authenticated_users_can_read_shared_email_threads
  on public.email_threads
  for select
  using (auth.role() = 'authenticated');

create policy authenticated_users_can_read_shared_emails
  on public.emails
  for select
  using (auth.role() = 'authenticated');

create policy authenticated_users_can_read_shared_email_attachments
  on public.email_attachments
  for select
  using (auth.role() = 'authenticated');

create policy authenticated_users_can_update_shared_emails
  on public.emails
  for update
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

with ranked_google_inboxes as (
  select
    id,
    row_number() over (
      order by updated_at desc nulls last, created_at desc nulls last, id desc
    ) as row_number
  from public.inboxes
  where provider = 'google'
    and is_active = true
)
update public.inboxes
set
  is_active = false,
  updated_at = now()
where id in (
  select id
  from ranked_google_inboxes
  where row_number > 1
);

create unique index if not exists inboxes_single_active_google_account_key
  on public.inboxes (provider)
  where provider = 'google'
    and is_active = true;
