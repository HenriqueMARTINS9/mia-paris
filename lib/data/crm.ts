import "server-only";

import { unstable_noStore as noStore } from "next/cache";

import { createSupabaseServerClient, hasSupabaseEnv } from "@/lib/supabase/server";
import type { CrmSummary } from "@/types/crm";

const fallbackSummary: CrmSummary = {
  openTasks: 0,
  criticalDeadlines: 0,
  pendingValidations: 0,
  inboundEmails: 0,
  activeProductions: 0,
};

export async function getCrmSummary() {
  noStore();

  if (!hasSupabaseEnv) {
    return fallbackSummary;
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

    const [pendingValidationsResult, activeProductionsResult] =
      await Promise.all([
        supabase
          .from("v_requests_overview")
          .select("*", { count: "exact", head: true })
          .eq("request_type", "trim_validation"),
        supabase.from("productions").select("*", { count: "exact", head: true }),
      ]);

    return {
      openTasks: openTasksResult.count ?? fallbackSummary.openTasks,
      criticalDeadlines:
        criticalDeadlinesResult.count ?? fallbackSummary.criticalDeadlines,
      inboundEmails: inboundEmailsResult.count ?? fallbackSummary.inboundEmails,
      pendingValidations:
        pendingValidationsResult.count ?? fallbackSummary.pendingValidations,
      activeProductions:
        activeProductionsResult.count ?? fallbackSummary.activeProductions,
    };
  } catch {
    return fallbackSummary;
  }
}
