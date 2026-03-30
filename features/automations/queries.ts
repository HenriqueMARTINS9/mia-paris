import "server-only";

import { unstable_noStore as noStore } from "next/cache";

import { getAutomationOverviewData } from "@/features/automations/engine";

export async function getAutomationWorkspaceData() {
  noStore();

  return getAutomationOverviewData();
}
