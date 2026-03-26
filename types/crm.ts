export type JsonValue =
  | string
  | number
  | boolean
  | null
  | { [key: string]: JsonValue }
  | JsonValue[];

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
  request_type: string | null;
  status: string | null;
  priority: string | null;
  assigned_user_id: string | null;
  source_email_id?: string | null;
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

export interface EmailRecord {
  id: string;
  thread_id?: string | null;
  request_id?: string | null;
  client_id?: string | null;
  subject?: string | null;
  status?: string | null;
  received_at?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  [key: string]: JsonValue | undefined;
}

export interface EmailThreadRecord {
  id: string;
  subject?: string | null;
  [key: string]: JsonValue | undefined;
}

export interface CrmSummary {
  openTasks: number;
  criticalDeadlines: number;
  pendingValidations: number;
  inboundEmails: number;
  activeProductions: number;
}
