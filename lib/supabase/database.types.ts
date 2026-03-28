import type {
  ActivityLogRecord,
  ClientRecord,
  ContactRecord,
  DeadlineCritical,
  DeadlineRecord,
  DocumentRecord,
  EmailAttachmentRecord,
  EmailRecord,
  EmailThreadRecord,
  InboxRecord,
  ModelRecord,
  OrderRecord,
  ProductDepartmentRecord,
  ProductionRecord,
  RequestOverview,
  RequestRecord,
  TaskOpen,
  TaskRecord,
  UserRecord,
  ValidationRecord,
} from "@/types/crm";

export interface Database {
  public: {
    Tables: {
      requests: {
        Row: RequestRecord;
        Insert: Partial<RequestRecord>;
        Update: Partial<RequestRecord>;
        Relationships: [];
      };
      tasks: {
        Row: TaskRecord;
        Insert: Partial<TaskRecord>;
        Update: Partial<TaskRecord>;
        Relationships: [];
      };
      deadlines: {
        Row: DeadlineRecord;
        Insert: Partial<DeadlineRecord>;
        Update: Partial<DeadlineRecord>;
        Relationships: [];
      };
      documents: {
        Row: DocumentRecord;
        Insert: Partial<DocumentRecord>;
        Update: Partial<DocumentRecord>;
        Relationships: [];
      };
      productions: {
        Row: ProductionRecord;
        Insert: Partial<ProductionRecord>;
        Update: Partial<ProductionRecord>;
        Relationships: [];
      };
      orders: {
        Row: OrderRecord;
        Insert: Partial<OrderRecord>;
        Update: Partial<OrderRecord>;
        Relationships: [];
      };
      models: {
        Row: ModelRecord;
        Insert: Partial<ModelRecord>;
        Update: Partial<ModelRecord>;
        Relationships: [];
      };
      clients: {
        Row: ClientRecord;
        Insert: Partial<ClientRecord>;
        Update: Partial<ClientRecord>;
        Relationships: [];
      };
      inboxes: {
        Row: InboxRecord;
        Insert: Partial<InboxRecord>;
        Update: Partial<InboxRecord>;
        Relationships: [];
      };
      contacts: {
        Row: ContactRecord;
        Insert: Partial<ContactRecord>;
        Update: Partial<ContactRecord>;
        Relationships: [];
      };
      product_departments: {
        Row: ProductDepartmentRecord;
        Insert: Partial<ProductDepartmentRecord>;
        Update: Partial<ProductDepartmentRecord>;
        Relationships: [];
      };
      emails: {
        Row: EmailRecord;
        Insert: Partial<EmailRecord>;
        Update: Partial<EmailRecord>;
        Relationships: [];
      };
      activity_logs: {
        Row: ActivityLogRecord;
        Insert: Partial<ActivityLogRecord>;
        Update: Partial<ActivityLogRecord>;
        Relationships: [];
      };
      email_threads: {
        Row: EmailThreadRecord;
        Insert: Partial<EmailThreadRecord>;
        Update: Partial<EmailThreadRecord>;
        Relationships: [];
      };
      email_attachments: {
        Row: EmailAttachmentRecord;
        Insert: Partial<EmailAttachmentRecord>;
        Update: Partial<EmailAttachmentRecord>;
        Relationships: [];
      };
      validations: {
        Row: ValidationRecord;
        Insert: Partial<ValidationRecord>;
        Update: Partial<ValidationRecord>;
        Relationships: [];
      };
      users: {
        Row: UserRecord;
        Insert: Partial<UserRecord>;
        Update: Partial<UserRecord>;
        Relationships: [];
      };
    };
    Views: {
      v_requests_overview: {
        Row: RequestOverview;
        Relationships: [];
      };
      v_tasks_open: {
        Row: TaskOpen;
        Relationships: [];
      };
      v_deadlines_critical: {
        Row: DeadlineCritical;
        Relationships: [];
      };
    };
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}
