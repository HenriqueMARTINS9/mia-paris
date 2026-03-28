alter table if exists public.documents
  add column if not exists email_attachment_id uuid references public.email_attachments(id) on delete set null,
  add column if not exists external_source_type text,
  add column if not exists external_source_id text;

create index if not exists documents_email_attachment_id_idx
  on public.documents(email_attachment_id);

create index if not exists documents_external_source_idx
  on public.documents(external_source_type, external_source_id);
