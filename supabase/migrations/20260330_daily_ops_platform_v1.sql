create table if not exists public.gmail_sync_runs (
  id uuid primary key default gen_random_uuid(),
  inbox_id uuid null references public.inboxes (id) on delete set null,
  triggered_by_user_id uuid null references public.users (id) on delete set null,
  sync_mode text not null default 'incremental',
  query_used text null,
  imported_threads integer not null default 0,
  imported_messages integer not null default 0,
  ignored_messages integer not null default 0,
  error_count integer not null default 0,
  ok boolean not null default true,
  message text null,
  error_message text null,
  started_at timestamptz not null default now(),
  finished_at timestamptz null,
  metadata jsonb null,
  created_at timestamptz not null default now()
);

create index if not exists gmail_sync_runs_inbox_id_created_at_idx
  on public.gmail_sync_runs (inbox_id, created_at desc);

grant select on table public.gmail_sync_runs to authenticated;
alter table if exists public.gmail_sync_runs enable row level security;

drop policy if exists authenticated_users_can_read_gmail_sync_runs on public.gmail_sync_runs;

create policy authenticated_users_can_read_gmail_sync_runs
  on public.gmail_sync_runs
  for select
  using (auth.role() = 'authenticated');

create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  endpoint text not null unique,
  p256dh_key text not null,
  auth_key text not null,
  user_agent text null,
  enabled boolean not null default true,
  last_error text null,
  last_used_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists push_subscriptions_user_id_idx
  on public.push_subscriptions (user_id);

grant select, insert, update, delete on table public.push_subscriptions to authenticated;
alter table if exists public.push_subscriptions enable row level security;

drop policy if exists users_manage_own_push_subscriptions on public.push_subscriptions;

create policy users_manage_own_push_subscriptions
  on public.push_subscriptions
  for all
  using (
    exists (
      select 1
      from public.users
      where users.id = push_subscriptions.user_id
        and users.auth_user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1
      from public.users
      where users.id = push_subscriptions.user_id
        and users.auth_user_id = auth.uid()
    )
  );

create table if not exists public.notification_preferences (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references public.users (id) on delete cascade,
  push_enabled boolean not null default false,
  email_new_unprocessed boolean not null default true,
  deadline_24h boolean not null default true,
  task_critical boolean not null default true,
  production_blocked boolean not null default true,
  gmail_sync_failed boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

grant select, insert, update, delete on table public.notification_preferences to authenticated;
alter table if exists public.notification_preferences enable row level security;

drop policy if exists users_manage_own_notification_preferences on public.notification_preferences;

create policy users_manage_own_notification_preferences
  on public.notification_preferences
  for all
  using (
    exists (
      select 1
      from public.users
      where users.id = notification_preferences.user_id
        and users.auth_user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1
      from public.users
      where users.id = notification_preferences.user_id
        and users.auth_user_id = auth.uid()
    )
  );

create table if not exists public.reply_drafts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  source_type text not null,
  source_id text not null,
  reply_type text not null,
  subject text not null,
  body text not null,
  context jsonb null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists reply_drafts_user_source_type_source_id_reply_type_key
  on public.reply_drafts (user_id, source_type, source_id, reply_type);

grant select, insert, update, delete on table public.reply_drafts to authenticated;
alter table if exists public.reply_drafts enable row level security;

drop policy if exists users_manage_own_reply_drafts on public.reply_drafts;

create policy users_manage_own_reply_drafts
  on public.reply_drafts
  for all
  using (
    exists (
      select 1
      from public.users
      where users.id = reply_drafts.user_id
        and users.auth_user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1
      from public.users
      where users.id = reply_drafts.user_id
        and users.auth_user_id = auth.uid()
    )
  );
