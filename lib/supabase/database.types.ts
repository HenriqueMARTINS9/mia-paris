import type {
  DeadlineCritical,
  DeadlineRecord,
  RequestOverview,
  RequestRecord,
  TaskOpen,
  TaskRecord,
  UserRecord,
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
