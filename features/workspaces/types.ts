import type { LucideIcon } from "lucide-react";

import type { EmailListItem } from "@/features/emails/types";
import type { ProductionListItem } from "@/features/productions/types";
import type { RequestOverviewListItem } from "@/features/requests/types";
import type { TaskListItem } from "@/features/tasks/types";

export type WorkspaceKey = "development" | "logistics" | "billing";

export interface WorkspaceDocumentItem {
  id: string;
  relatedLabel: string | null;
  title: string;
  type: string;
  updatedAt: string | null;
  url: string | null;
}

export interface WorkspaceMetric {
  accent?: "primary" | "accent" | "danger";
  hint: string;
  icon: LucideIcon;
  label: string;
  value: string;
}

export interface WorkspaceDefinition {
  badge: string;
  description: string;
  documentTypes: string[];
  emailTypes: string[];
  eyebrow: string;
  primaryActionHref: string;
  primaryActionLabel: string;
  requestTypes: string[];
  secondaryActionHref: string;
  secondaryActionLabel: string;
  taskTypes: string[];
  title: string;
}

export interface WorkspacePageData {
  documents: WorkspaceDocumentItem[];
  emails: EmailListItem[];
  error: string | null;
  metrics: WorkspaceMetric[];
  productions: ProductionListItem[];
  requests: RequestOverviewListItem[];
  tasks: TaskListItem[];
}
