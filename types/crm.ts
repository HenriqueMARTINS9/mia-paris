export type JsonValue =
  | string
  | number
  | boolean
  | null
  | { [key: string]: JsonValue }
  | JsonValue[];

export type AppUserRole =
  | "admin"
  | "development"
  | "production"
  | "logistics"
  | "sales";

export interface RequestOverview {
  id: string;
  title: string;
  request_type: string | null;
  priority: string | null;
  status: string | null;
  due_at: string | null;
  urgency_score: number | null;
  ai_confidence: number | null;
  client_name: string | null;
  contact_name: string | null;
  department_name: string | null;
  internal_ref: string | null;
  client_ref: string | null;
  assigned_user_name: string | null;
  created_at: string;
  updated_at: string;
}

export interface RequestRecord {
  id: string;
  title?: string | null;
  client_id?: string | null;
  contact_id?: string | null;
  product_department_id?: string | null;
  model_id?: string | null;
  request_type: string | null;
  status: string | null;
  priority: string | null;
  assigned_user_id: string | null;
  source_email_id?: string | null;
  source_type?: string | null;
  due_at?: string | null;
  raw_source_excerpt?: string | null;
  requires_human_validation?: boolean | null;
  requested_action?: string | null;
  ai_confidence?: number | null;
  summary?: string | null;
  internal_notes?: string | null;
  notes?: string | null;
  updated_at: string | null;
  created_at?: string | null;
  [key: string]: JsonValue | undefined;
}

export interface UserRecord {
  id: string;
  auth_user_id: string | null;
  full_name: string | null;
  email: string | null;
  role?: string | null;
  [key: string]: JsonValue | undefined;
}

export interface TaskOpen {
  id: string;
  title: string;
  task_type: string | null;
  status: string | null;
  priority: string | null;
  due_at: string | null;
  client_name: string | null;
  assigned_user_name: string | null;
  request_title: string | null;
  order_number: string | null;
  production_status: string | null;
}

export interface TaskRecord {
  id: string;
  title: string | null;
  task_type: string | null;
  status: string | null;
  priority: string | null;
  request_id: string | null;
  assigned_user_id: string | null;
  due_at: string | null;
  created_at: string | null;
  updated_at: string | null;
  [key: string]: JsonValue | undefined;
}

export interface DeadlineCritical {
  id: string;
  label: string;
  deadline_at: string | null;
  status: string | null;
  priority: string | null;
  request_title: string | null;
  order_number: string | null;
  production_status: string | null;
  client_name: string | null;
}

export interface DeadlineRecord {
  id: string;
  label: string | null;
  status: string | null;
  priority: string | null;
  request_id: string | null;
  deadline_at: string | null;
  created_at: string | null;
  updated_at: string | null;
  [key: string]: JsonValue | undefined;
}

export interface ProductionRecord {
  id: string;
  order_id?: string | null;
  model_id?: string | null;
  client_id?: string | null;
  request_id?: string | null;
  status?: string | null;
  risk_level?: string | null;
  production_mode?: string | null;
  planned_start_at?: string | null;
  planned_end_at?: string | null;
  blocking_reason?: string | null;
  notes?: string | null;
  order_number?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  [key: string]: JsonValue | undefined;
}

export interface OrderRecord {
  id: string;
  client_id?: string | null;
  model_id?: string | null;
  request_id?: string | null;
  order_number?: string | null;
  status?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  [key: string]: JsonValue | undefined;
}

export interface ModelRecord {
  id: string;
  client_id?: string | null;
  name?: string | null;
  reference?: string | null;
  [key: string]: JsonValue | undefined;
}

export interface ClientRecord {
  id: string;
  name?: string | null;
  code?: string | null;
  [key: string]: JsonValue | undefined;
}

export interface ContactRecord {
  id: string;
  client_id?: string | null;
  full_name?: string | null;
  name?: string | null;
  email?: string | null;
  [key: string]: JsonValue | undefined;
}

export interface ProductDepartmentRecord {
  id: string;
  name?: string | null;
  label?: string | null;
  code?: string | null;
  [key: string]: JsonValue | undefined;
}

export interface InboxRecord {
  id: string;
  user_id?: string | null;
  provider?: string | null;
  email_address?: string | null;
  display_name?: string | null;
  provider_account_id?: string | null;
  access_token?: string | null;
  refresh_token?: string | null;
  token_expires_at?: string | null;
  scope?: string | null;
  sync_cursor?: string | null;
  last_synced_at?: string | null;
  last_error?: string | null;
  is_active?: boolean | null;
  created_at?: string | null;
  updated_at?: string | null;
  [key: string]: JsonValue | undefined;
}

export interface GmailSyncRunRecord {
  id: string;
  inbox_id?: string | null;
  triggered_by_user_id?: string | null;
  sync_mode?: string | null;
  query_used?: string | null;
  imported_threads?: number | null;
  imported_messages?: number | null;
  ignored_messages?: number | null;
  error_count?: number | null;
  ok?: boolean | null;
  message?: string | null;
  error_message?: string | null;
  started_at?: string | null;
  finished_at?: string | null;
  metadata?: JsonValue;
  created_at?: string | null;
  [key: string]: JsonValue | undefined;
}

export interface AutomationRunRecord {
  id: string;
  triggered_by_user_id?: string | null;
  mode?: string | null;
  ok?: boolean | null;
  total_open?: number | null;
  process_open?: number | null;
  decide_open?: number | null;
  created_count?: number | null;
  resolved_count?: number | null;
  message?: string | null;
  error_message?: string | null;
  metadata?: JsonValue;
  started_at?: string | null;
  finished_at?: string | null;
  created_at?: string | null;
  [key: string]: JsonValue | undefined;
}

export interface AutomationAlertRecord {
  id: string;
  rule_key?: string | null;
  rule_label?: string | null;
  lane?: string | null;
  entity_type?: string | null;
  entity_id?: string | null;
  request_id?: string | null;
  client_id?: string | null;
  model_id?: string | null;
  production_id?: string | null;
  title?: string | null;
  subtitle?: string | null;
  client_name?: string | null;
  reason?: string | null;
  priority?: string | null;
  next_action?: string | null;
  link_href?: string | null;
  status?: string | null;
  detected_at?: string | null;
  last_seen_at?: string | null;
  resolved_at?: string | null;
  metadata?: JsonValue;
  created_at?: string | null;
  updated_at?: string | null;
  [key: string]: JsonValue | undefined;
}

export interface EmailRecord {
  id: string;
  inbox_id?: string | null;
  thread_id?: string | null;
  external_thread_id?: string | null;
  external_message_id?: string | null;
  request_id?: string | null;
  client_id?: string | null;
  contact_id?: string | null;
  assigned_user_id?: string | null;
  from_name?: string | null;
  from_email?: string | null;
  to_emails?: JsonValue;
  cc_emails?: JsonValue;
  bcc_emails?: JsonValue;
  subject?: string | null;
  preview_text?: string | null;
  body_text?: string | null;
  body_html?: string | null;
  direction?: string | null;
  labels?: JsonValue;
  status?: string | null;
  processing_status?: string | null;
  is_processed?: boolean | null;
  is_unread?: boolean | null;
  ai_summary?: string | null;
  ai_classification?: JsonValue;
  received_at?: string | null;
  created_at?: string | null;
  synced_at?: string | null;
  updated_at?: string | null;
  [key: string]: JsonValue | undefined;
}

export interface EmailThreadRecord {
  id: string;
  inbox_id?: string | null;
  external_thread_id?: string | null;
  subject?: string | null;
  snippet?: string | null;
  participants?: JsonValue;
  gmail_label_ids?: JsonValue;
  has_unread?: boolean | null;
  message_count?: number | null;
  last_message_at?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  [key: string]: JsonValue | undefined;
}

export interface EmailAttachmentRecord {
  id: string;
  email_id?: string | null;
  bucket_name?: string | null;
  storage_bucket?: string | null;
  storage_path?: string | null;
  external_attachment_id?: string | null;
  file_name?: string | null;
  content_type?: string | null;
  file_size?: number | null;
  filename?: string | null;
  mime_type?: string | null;
  size_bytes?: number | null;
  is_inline?: boolean | null;
  content_id?: string | null;
  part_id?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  [key: string]: JsonValue | undefined;
}

export interface DocumentRecord {
  id: string;
  client_id?: string | null;
  model_id?: string | null;
  order_id?: string | null;
  production_id?: string | null;
  request_id?: string | null;
  email_attachment_id?: string | null;
  external_source_type?: string | null;
  external_source_id?: string | null;
  document_type?: string | null;
  title?: string | null;
  name?: string | null;
  file_name?: string | null;
  status?: string | null;
  storage_path?: string | null;
  url?: string | null;
  file_url?: string | null;
  public_url?: string | null;
  version?: number | null;
  uploaded_by_user_id?: string | null;
  metadata?: JsonValue;
  created_at?: string | null;
  updated_at?: string | null;
  [key: string]: JsonValue | undefined;
}

export interface PushSubscriptionRecord {
  id: string;
  user_id?: string | null;
  endpoint?: string | null;
  p256dh_key?: string | null;
  auth_key?: string | null;
  user_agent?: string | null;
  enabled?: boolean | null;
  last_error?: string | null;
  last_used_at?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  [key: string]: JsonValue | undefined;
}

export interface NotificationPreferenceRecord {
  id: string;
  user_id?: string | null;
  push_enabled?: boolean | null;
  email_new_unprocessed?: boolean | null;
  deadline_24h?: boolean | null;
  task_critical?: boolean | null;
  production_blocked?: boolean | null;
  gmail_sync_failed?: boolean | null;
  created_at?: string | null;
  updated_at?: string | null;
  [key: string]: JsonValue | undefined;
}

export interface ReplyDraftRecord {
  id: string;
  user_id?: string | null;
  source_type?: string | null;
  source_id?: string | null;
  reply_type?: string | null;
  subject?: string | null;
  body?: string | null;
  context?: JsonValue;
  created_at?: string | null;
  updated_at?: string | null;
  [key: string]: JsonValue | undefined;
}

export interface ValidationRecord {
  id: string;
  request_id?: string | null;
  model_id?: string | null;
  order_id?: string | null;
  validation_type?: string | null;
  status?: string | null;
  validated_by_contact_id?: string | null;
  validated_by_user_id?: string | null;
  validated_at?: string | null;
  notes?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  [key: string]: JsonValue | undefined;
}

export interface ActivityLogRecord {
  id: string;
  entity_id?: string | null;
  entity_type?: string | null;
  request_id?: string | null;
  action?: string | null;
  action_source?: string | null;
  action_status?: string | null;
  action_type?: string | null;
  description?: string | null;
  payload?: JsonValue;
  metadata?: JsonValue;
  actor_type?: string | null;
  actor_id?: string | null;
  scope?: string | null;
  source?: string | null;
  status?: string | null;
  created_at?: string | null;
  [key: string]: JsonValue | undefined;
}

export interface CrmSummary {
  actionItems: number;
  openTasks: number;
  criticalDeadlines: number;
  pendingValidations: number;
  inboundEmails: number;
  activeProductions: number;
}
