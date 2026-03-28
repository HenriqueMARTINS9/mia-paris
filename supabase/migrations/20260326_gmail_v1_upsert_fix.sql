create extension if not exists pgcrypto;

create table if not exists public.inboxes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  provider text not null default 'google',
  email_address text not null,
  display_name text,
  provider_account_id text,
  access_token text,
  refresh_token text,
  token_expires_at timestamptz,
  scope text,
  sync_cursor text,
  last_synced_at timestamptz,
  last_error text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.email_threads
  add column if not exists inbox_id uuid references public.inboxes(id) on delete cascade,
  add column if not exists external_thread_id text,
  add column if not exists snippet text,
  add column if not exists participants jsonb not null default '[]'::jsonb,
  add column if not exists gmail_label_ids jsonb not null default '[]'::jsonb,
  add column if not exists has_unread boolean not null default false,
  add column if not exists message_count integer not null default 0,
  add column if not exists last_message_at timestamptz,
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

alter table public.emails
  add column if not exists inbox_id uuid references public.inboxes(id) on delete set null,
  add column if not exists request_id uuid references public.requests(id) on delete set null,
  add column if not exists client_id uuid references public.clients(id) on delete set null,
  add column if not exists contact_id uuid references public.contacts(id) on delete set null,
  add column if not exists assigned_user_id uuid references public.users(id) on delete set null,
  add column if not exists external_thread_id text,
  add column if not exists external_message_id text,
  add column if not exists from_name text,
  add column if not exists from_email text,
  add column if not exists to_emails jsonb not null default '[]'::jsonb,
  add column if not exists cc_emails jsonb not null default '[]'::jsonb,
  add column if not exists bcc_emails jsonb not null default '[]'::jsonb,
  add column if not exists preview_text text,
  add column if not exists body_text text,
  add column if not exists body_html text,
  add column if not exists direction text,
  add column if not exists labels jsonb not null default '[]'::jsonb,
  add column if not exists status text,
  add column if not exists processing_status text,
  add column if not exists triage_status text,
  add column if not exists is_processed boolean not null default false,
  add column if not exists is_unread boolean not null default true,
  add column if not exists ai_summary text,
  add column if not exists ai_classification jsonb,
  add column if not exists classification_json jsonb,
  add column if not exists synced_at timestamptz,
  add column if not exists received_at timestamptz,
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

create table if not exists public.email_attachments (
  id uuid primary key default gen_random_uuid(),
  email_id uuid not null references public.emails(id) on delete cascade,
  bucket_name text,
  storage_bucket text,
  storage_path text,
  external_attachment_id text,
  file_name text,
  content_type text,
  file_size integer,
  filename text,
  mime_type text,
  size_bytes integer,
  is_inline boolean not null default false,
  content_id text,
  part_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.email_attachments
  add column if not exists bucket_name text,
  add column if not exists storage_bucket text,
  add column if not exists storage_path text,
  add column if not exists external_attachment_id text,
  add column if not exists file_name text,
  add column if not exists content_type text,
  add column if not exists file_size integer,
  add column if not exists filename text,
  add column if not exists mime_type text,
  add column if not exists size_bytes integer,
  add column if not exists is_inline boolean not null default false,
  add column if not exists content_id text,
  add column if not exists part_id text,
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

alter table public.email_threads
  drop constraint if exists email_threads_external_thread_id_key;

alter table public.emails
  drop constraint if exists emails_external_message_id_key;

drop index if exists public.email_threads_external_thread_id_key;
drop index if exists public.emails_external_message_id_key;

create unique index if not exists email_threads_inbox_external_thread_key
  on public.email_threads (inbox_id, external_thread_id);

create unique index if not exists emails_inbox_external_message_key
  on public.emails (inbox_id, external_message_id);

create unique index if not exists email_attachments_email_attachment_key
  on public.email_attachments (email_id, external_attachment_id);

create index if not exists email_threads_inbox_id_idx
  on public.email_threads (inbox_id);

create index if not exists emails_external_thread_id_idx
  on public.emails (external_thread_id);

create index if not exists emails_inbox_id_idx
  on public.emails (inbox_id);

create index if not exists email_attachments_email_id_idx
  on public.email_attachments (email_id);

notify pgrst, 'reload schema';
