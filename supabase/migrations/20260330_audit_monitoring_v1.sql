alter table if exists public.activity_logs
  add column if not exists action_source text null,
  add column if not exists action_status text null,
  add column if not exists scope text null;

create index if not exists activity_logs_created_at_idx
  on public.activity_logs (created_at desc);

create index if not exists activity_logs_action_status_created_at_idx
  on public.activity_logs (action_status, created_at desc);

create index if not exists activity_logs_action_source_created_at_idx
  on public.activity_logs (action_source, created_at desc);
