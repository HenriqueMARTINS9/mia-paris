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
  request_type: string | null;
  status: string | null;
  priority: string | null;
  assigned_user_id: string | null;
  updated_at: string | null;
}

export interface UserRecord {
  id: string;
  auth_user_id: string | null;
  full_name: string | null;
  email: string | null;
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
}

export interface CrmSummary {
  openTasks: number;
  criticalDeadlines: number;
  pendingValidations: number;
  inboundEmails: number;
  activeProductions: number;
}
