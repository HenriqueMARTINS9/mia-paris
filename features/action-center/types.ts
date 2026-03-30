import type { GmailInboxStatus } from "@/features/emails/types";
import type { RequestAssigneeOption } from "@/features/requests/types";
import type { AutomationAlertItem, AutomationOverviewData } from "@/features/automations/types";

export interface ActionCenterItem extends AutomationAlertItem {
  objectTypeLabel: string;
}

export interface ActionCenterPageData {
  assignees: RequestAssigneeOption[];
  assigneesError: string | null;
  currentAppUserId: string | null;
  error: string | null;
  gmailInbox: GmailInboxStatus;
  overview: AutomationOverviewData;
  toDecide: ActionCenterItem[];
  toProcess: ActionCenterItem[];
}
