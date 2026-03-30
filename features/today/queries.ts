import "server-only";

import { unstable_noStore as noStore } from "next/cache";

import { getDashboardPageData } from "@/features/dashboard/queries";
import { getAutomationWorkspaceData } from "@/features/automations/queries";
import { getDeadlinesPageData } from "@/features/deadlines/queries";
import { getEmailsPageData } from "@/features/emails/queries";
import { getProductionsPageData } from "@/features/productions/queries";
import { getRequestsOverviewPageData } from "@/features/requests/queries";
import { getTasksPageData } from "@/features/tasks/queries";
import type { TodayOverviewData } from "@/features/today/types";

export async function getTodayOverviewData(): Promise<TodayOverviewData> {
  noStore();

  const [
    dashboard,
    automationOverview,
    requestsData,
    tasksData,
    deadlinesData,
    productionsData,
    emailsData,
  ] = await Promise.all([
    getDashboardPageData(),
    getAutomationWorkspaceData(),
    getRequestsOverviewPageData(),
    getTasksPageData(),
    getDeadlinesPageData(),
    getProductionsPageData(),
    getEmailsPageData(),
  ]);

  const now = Date.now();
  const next24Hours = now + 24 * 60 * 60 * 1000;
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const endOfToday = startOfToday.getTime() + 24 * 60 * 60 * 1000;

  const emailsToTriage = [...emailsData.emails]
    .filter((email) => email.status !== "processed")
    .sort(
      (left, right) =>
        new Date(right.receivedAt).getTime() - new Date(left.receivedAt).getTime(),
    )
    .slice(0, 6);

  const unassignedRequests = [...requestsData.requests]
    .filter((request) => request.assignedUserId === null || request.owner === "Non assigné")
    .sort((left, right) => right.urgencyScore - left.urgencyScore)
    .slice(0, 6);

  const urgencies24h = [...deadlinesData.deadlines]
    .filter((deadline) => {
      if (!deadline.deadlineAt || deadline.status === "done") {
        return false;
      }

      const time = new Date(deadline.deadlineAt).getTime();
      return Number.isFinite(time) && (time <= next24Hours || deadline.isOverdue);
    })
    .sort((left, right) => {
      const leftTime = left.deadlineAt
        ? new Date(left.deadlineAt).getTime()
        : Number.MAX_SAFE_INTEGER;
      const rightTime = right.deadlineAt
        ? new Date(right.deadlineAt).getTime()
        : Number.MAX_SAFE_INTEGER;

      return leftTime - rightTime;
    })
    .slice(0, 6);

  const tasksToday = [...tasksData.tasks]
    .filter((task) => {
      if (task.isOverdue) {
        return true;
      }

      if (!task.dueAt) {
        return task.priority === "critical";
      }

      const time = new Date(task.dueAt).getTime();

      return (
        Number.isFinite(time) &&
        time >= startOfToday.getTime() &&
        time < endOfToday
      );
    })
    .sort((left, right) => {
      if (left.isOverdue !== right.isOverdue) {
        return left.isOverdue ? -1 : 1;
      }

      const leftTime = left.dueAt
        ? new Date(left.dueAt).getTime()
        : Number.MAX_SAFE_INTEGER;
      const rightTime = right.dueAt
        ? new Date(right.dueAt).getTime()
        : Number.MAX_SAFE_INTEGER;

      return leftTime - rightTime;
    })
    .slice(0, 6);

  const blockedProductions = [...productionsData.productions]
    .filter((production) => production.isBlocked || production.risk !== "low")
    .sort((left, right) => {
      if (left.isBlocked !== right.isBlocked) {
        return left.isBlocked ? -1 : 1;
      }

      return riskWeight(right.risk) - riskWeight(left.risk);
    })
    .slice(0, 6);

  return {
    automationOverview,
    blockedProductions,
    emailsToTriage,
    error:
      [
        dashboard.error,
        requestsData.error,
        tasksData.error,
        deadlinesData.error,
        productionsData.error,
        emailsData.error,
      ]
        .filter(Boolean)
        .join(" · ") || null,
    gmailInbox: dashboard.gmailInbox,
    kpis: {
      blockedProductions: blockedProductions.length,
      emailsToTriage: emailsToTriage.length,
      pendingValidations: dashboard.kpis.pendingValidations,
      tasksToday: tasksToday.length,
      unassignedRequests: unassignedRequests.length,
      urgencies24h: urgencies24h.length,
    },
    latestSyncs: dashboard.latestSyncs,
    pendingValidations: dashboard.kpis.pendingValidations,
    tasksToday,
    unassignedRequests,
    urgencies24h,
  };
}

function riskWeight(value: string) {
  if (value === "critical") {
    return 4;
  }

  if (value === "high") {
    return 3;
  }

  if (value === "normal") {
    return 2;
  }

  return 1;
}
