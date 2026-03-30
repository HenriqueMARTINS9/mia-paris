import "server-only";

import { unstable_noStore as noStore } from "next/cache";

import { getCurrentUserContext } from "@/features/auth/queries";
import { getAutomationWorkspaceData } from "@/features/automations/queries";
import { getCurrentUserGmailInboxStatus } from "@/features/emails/lib/gmail-sync";
import { getRequestAssigneeOptions } from "@/features/requests/queries";
import type { AutomationAlertItem } from "@/features/automations/types";
import type {
  ActionCenterItem,
  ActionCenterPageData,
} from "@/features/action-center/types";

export async function getActionCenterPageData(): Promise<ActionCenterPageData> {
  noStore();

  const [currentUser, overview, assigneesResult, gmailInbox] = await Promise.all([
    getCurrentUserContext(),
    getAutomationWorkspaceData(),
    getRequestAssigneeOptions(),
    getCurrentUserGmailInboxStatus(),
  ]);

  const items = overview.alerts.map(mapActionCenterItem);

  return {
    assignees: assigneesResult.assignees,
    assigneesError: assigneesResult.error,
    currentAppUserId: currentUser?.appUser?.id ?? null,
    error: overview.error,
    gmailInbox,
    overview,
    toDecide: items.filter((item) => item.lane === "decide"),
    toProcess: items.filter((item) => item.lane === "process"),
  };
}

function mapActionCenterItem(item: AutomationAlertItem): ActionCenterItem {
  return {
    ...item,
    objectTypeLabel: humanizeEntityType(item.entityType),
  };
}

function humanizeEntityType(value: string) {
  if (value === "request") {
    return "Demande";
  }

  if (value === "task") {
    return "Tâche";
  }

  if (value === "deadline") {
    return "Deadline";
  }

  if (value === "production") {
    return "Production";
  }

  if (value === "validation") {
    return "Validation";
  }

  if (value === "email") {
    return "Email";
  }

  return "Objet métier";
}
