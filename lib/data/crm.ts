import "server-only";

import { unstable_noStore as noStore } from "next/cache";

import { fallbackCrmSummary } from "@/lib/data/crm-summary";
import { createSupabaseServerClient, hasSupabaseEnv } from "@/lib/supabase/server";

export async function getCrmSummary() {
  noStore();

  if (!hasSupabaseEnv) {
    return fallbackCrmSummary;
  }

  try {
    const supabase = await createSupabaseServerClient();
    const [openTasksResult, criticalDeadlinesResult, inboundEmailsResult] =
      await Promise.all([
        supabase.from("v_tasks_open").select("*", { count: "exact", head: true }),
        supabase
          .from("v_deadlines_critical")
          .select("*", { count: "exact", head: true })
          .eq("priority", "critical"),
        supabase.from("emails").select("*", { count: "exact", head: true }),
      ]);

    const [pendingValidationsResult, activeProductionsResult, actionItemsResult] =
      await Promise.all([
        supabase
          .from("v_requests_overview")
          .select("*", { count: "exact", head: true })
          .eq("request_type", "trim_validation"),
        supabase.from("productions").select("*", { count: "exact", head: true }),
        supabase
          .from("automation_alerts")
          .select("*", { count: "exact", head: true })
          .eq("status", "open"),
      ]);

    return {
      actionItems: actionItemsResult.count ?? fallbackCrmSummary.actionItems,
      openTasks: openTasksResult.count ?? fallbackCrmSummary.openTasks,
      criticalDeadlines:
        criticalDeadlinesResult.count ?? fallbackCrmSummary.criticalDeadlines,
      inboundEmails: inboundEmailsResult.count ?? fallbackCrmSummary.inboundEmails,
      pendingValidations:
        pendingValidationsResult.count ?? fallbackCrmSummary.pendingValidations,
      activeProductions:
        activeProductionsResult.count ?? fallbackCrmSummary.activeProductions,
    };
  } catch {
    return fallbackCrmSummary;
  }
}
