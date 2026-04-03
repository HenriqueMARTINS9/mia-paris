import type { Metadata } from "next";

import { WorkspacePage } from "@/features/workspaces/components/workspace-page";
import { getWorkspacePageData } from "@/features/workspaces/queries";

export const metadata: Metadata = {
  title: "Logistique",
};

export const dynamic = "force-dynamic";

export default async function LogisticsWorkspaceRoute() {
  const data = await getWorkspacePageData("logistics");

  return <WorkspacePage data={data} workspace="logistics" />;
}
