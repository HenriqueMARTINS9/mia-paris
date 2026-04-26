create table if not exists public.daily_summaries (
  id uuid primary key default gen_random_uuid(),
  summary_date date not null,
  summary_time time without time zone not null,
  generated_at timestamptz not null default now(),
  title text not null,
  overview text not null,
  highlights jsonb not null default '[]'::jsonb,
  risks jsonb not null default '[]'::jsonb,
  next_actions jsonb not null default '[]'::jsonb,
  client_summaries jsonb not null default '[]'::jsonb,
  source text not null default 'assistant',
  created_by uuid null references public.users(id) on delete set null,
  updated_by uuid null references public.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists daily_summaries_date_idx
  on public.daily_summaries (summary_date desc, generated_at desc);

create index if not exists daily_summaries_source_idx
  on public.daily_summaries (source);

alter table if exists public.daily_summaries enable row level security;

grant select on table public.daily_summaries to authenticated;

drop policy if exists authenticated_users_can_read_daily_summaries
  on public.daily_summaries;

create policy authenticated_users_can_read_daily_summaries
  on public.daily_summaries
  for select
  using (auth.role() = 'authenticated');

notify pgrst, 'reload schema';
