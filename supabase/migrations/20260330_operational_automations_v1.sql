create table if not exists public.automation_runs (
  id uuid primary key default gen_random_uuid(),
  triggered_by_user_id uuid null references public.users (id) on delete set null,
  mode text not null default 'manual',
  ok boolean not null default true,
  total_open integer not null default 0,
  process_open integer not null default 0,
  decide_open integer not null default 0,
  created_count integer not null default 0,
  resolved_count integer not null default 0,
  message text null,
  error_message text null,
  metadata jsonb null,
  started_at timestamptz not null default now(),
  finished_at timestamptz null,
  created_at timestamptz not null default now()
);

create index if not exists automation_runs_created_at_idx
  on public.automation_runs (created_at desc);

grant select, insert, update on table public.automation_runs to authenticated;
alter table if exists public.automation_runs enable row level security;

drop policy if exists authenticated_users_can_read_automation_runs on public.automation_runs;
drop policy if exists authenticated_users_can_insert_automation_runs on public.automation_runs;
drop policy if exists authenticated_users_can_update_automation_runs on public.automation_runs;

create policy authenticated_users_can_read_automation_runs
  on public.automation_runs
  for select
  using (auth.role() = 'authenticated');

create policy authenticated_users_can_insert_automation_runs
  on public.automation_runs
  for insert
  with check (auth.role() = 'authenticated');

create policy authenticated_users_can_update_automation_runs
  on public.automation_runs
  for update
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

create table if not exists public.automation_alerts (
  id uuid primary key default gen_random_uuid(),
  rule_key text not null,
  rule_label text not null,
  lane text not null default 'process',
  entity_type text not null,
  entity_id text not null,
  request_id uuid null references public.requests (id) on delete set null,
  client_id uuid null references public.clients (id) on delete set null,
  model_id uuid null references public.models (id) on delete set null,
  production_id uuid null references public.productions (id) on delete set null,
  title text not null,
  subtitle text null,
  client_name text null,
  reason text not null,
  priority text not null default 'normal',
  next_action text null,
  link_href text null,
  status text not null default 'open',
  detected_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  resolved_at timestamptz null,
  metadata jsonb null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists automation_alerts_rule_entity_key
  on public.automation_alerts (rule_key, entity_type, entity_id);

create index if not exists automation_alerts_lane_status_priority_idx
  on public.automation_alerts (lane, status, priority, last_seen_at desc);

grant select, insert, update, delete on table public.automation_alerts to authenticated;
alter table if exists public.automation_alerts enable row level security;

drop policy if exists authenticated_users_can_read_automation_alerts on public.automation_alerts;
drop policy if exists authenticated_users_can_insert_automation_alerts on public.automation_alerts;
drop policy if exists authenticated_users_can_update_automation_alerts on public.automation_alerts;
drop policy if exists authenticated_users_can_delete_automation_alerts on public.automation_alerts;

create policy authenticated_users_can_read_automation_alerts
  on public.automation_alerts
  for select
  using (auth.role() = 'authenticated');

create policy authenticated_users_can_insert_automation_alerts
  on public.automation_alerts
  for insert
  with check (auth.role() = 'authenticated');

create policy authenticated_users_can_update_automation_alerts
  on public.automation_alerts
  for update
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

create policy authenticated_users_can_delete_automation_alerts
  on public.automation_alerts
  for delete
  using (auth.role() = 'authenticated');
