alter table if exists public.emails
  add column if not exists ai_confidence double precision null,
  add column if not exists classification_confidence double precision null,
  add column if not exists assistant_bucket text null,
  add column if not exists assistant_bucket_confidence double precision null,
  add column if not exists assistant_bucket_reason text null,
  add column if not exists detected_client_name text null,
  add column if not exists detected_deadline timestamptz null,
  add column if not exists detected_department text null,
  add column if not exists detected_priority text null,
  add column if not exists detected_type text null,
  add column if not exists model_id uuid null references public.models(id) on delete set null,
  add column if not exists product_department_id uuid null references public.product_departments(id) on delete set null,
  add column if not exists requested_action text null,
  add column if not exists requires_human_validation boolean not null default false,
  add column if not exists triage_source text null,
  add column if not exists triaged_at timestamptz null;

create index if not exists emails_assistant_bucket_idx
  on public.emails (assistant_bucket);

create index if not exists emails_triaged_at_idx
  on public.emails (triaged_at desc nulls last);

create index if not exists emails_model_id_idx
  on public.emails (model_id);

create index if not exists emails_product_department_id_idx
  on public.emails (product_department_id);

update public.emails
set classification_confidence = ai_confidence
where classification_confidence is null
  and ai_confidence is not null;

update public.emails
set assistant_bucket = case
  when coalesce(processing_status, triage_status, status) = 'review' then 'to_review'
  when request_id is not null or client_id is not null then 'important'
  else 'to_review'
end
where assistant_bucket is null;

notify pgrst, 'reload schema';
