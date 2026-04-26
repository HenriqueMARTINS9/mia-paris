export type RequestStatus =
  | "new"
  | "qualification"
  | "costing"
  | "awaiting_validation"
  | "approved"
  | "in_production";

export type RequestPriority = "critical" | "high" | "normal";

export type ProductionStage =
  | "brief"
  | "sourcing"
  | "sampling"
  | "approved"
  | "production";

export type SourceChannel = "email" | "meeting" | "phone";

export interface RequestContact {
  name: string;
  role: string;
  company: string;
  email: string;
}

export interface RequestMilestone {
  label: string;
  date: string;
  tone: "done" | "next" | "risk";
}

export interface RequestDocument {
  name: string;
  type: string;
  updatedAt: string;
}

export interface RequestTimelineEvent {
  id: string;
  title: string;
  date: string;
  category: "email" | "task" | "deadline" | "validation" | "production";
}

export interface RequestOverviewListItem {
  id: string;
  title: string;
  reference: string;
  clientName: string;
  clientCode: string;
  department: string;
  requestType: string;
  requestTypeLabel: string;
  internalRef: string | null;
  clientRef: string | null;
  sourceChannel: SourceChannel;
  sourceSubject: string;
  emailFrom: string;
  emailPreview: string;
  status: RequestStatus;
  priority: RequestPriority;
  productionStage: ProductionStage;
  assignedUserId: string | null;
  owner: string;
  ownerRole: string;
  dueAt: string;
  lastInboundAt: string;
  urgencyScore: number;
  aiConfidence: number | null;
  createdAt: string;
  rawStatus: string;
  rawPriority: string;
  updatedAt: string;
  tags: string[];
  notes: string;
  nextActions: string[];
  contacts: RequestContact[];
  milestones: RequestMilestone[];
  documents: RequestDocument[];
  timeline: RequestTimelineEvent[];
}

export interface RequestAssigneeOption {
  id: string;
  fullName: string;
  email: string | null;
}

export interface RequestLinkOption {
  id: string;
  label: string;
  clientName: string;
}

export interface RequestFormOption {
  id: string;
  label: string;
  secondary: string | null;
  clientId?: string | null;
}

export interface RequestFormOptions {
  assignees: RequestAssigneeOption[];
  clients: RequestFormOption[];
  contacts: RequestFormOption[];
  models: RequestFormOption[];
  productDepartments: RequestFormOption[];
}

export type RequestMutationField =
  | "status"
  | "priority"
  | "assigned_user_id"
  | "due_at"
  | "deadline_at"
  | "note"
  | "task";

export interface RequestMutationResult {
  ok: boolean;
  field: RequestMutationField;
  message: string;
}

export interface CreateRequestInput {
  assignedUserId: string | null;
  clientId: string | null;
  contactId: string | null;
  dueAt: string | null;
  modelId: string | null;
  priority: RequestPriority;
  productDepartmentId: string | null;
  requestType: string;
  requestedAction: string | null;
  status: RequestStatus;
  summary: string | null;
  title: string;
}
