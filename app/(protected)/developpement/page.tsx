import type { Metadata } from "next";

import { WorkspacePage } from "@/features/workspaces/components/workspace-page";
import { getWorkspacePageData } from "@/features/workspaces/queries";

export const metadata: Metadata = {
  title: "Développement",
};

export const dynamic = "force-dynamic";

export default async function DevelopmentWorkspaceRoute() {
  const data = await getWorkspacePageData("development");

  return <WorkspacePage data={data} workspace="development" />;
}
