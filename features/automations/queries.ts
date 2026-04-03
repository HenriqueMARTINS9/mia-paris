import "server-only";

import { unstable_noStore as noStore } from "next/cache";
import { cache } from "react";

import { getAutomationOverviewData } from "@/features/automations/engine";

const getAutomationWorkspaceDataInternal = async () => {
  noStore();

  return getAutomationOverviewData();
};

export const getAutomationWorkspaceData = cache(
  getAutomationWorkspaceDataInternal,
);
