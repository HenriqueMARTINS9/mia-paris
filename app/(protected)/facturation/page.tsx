import type { Metadata } from "next";

import { WorkspacePage } from "@/features/workspaces/components/workspace-page";
import { getWorkspacePageData } from "@/features/workspaces/queries";

export const metadata: Metadata = {
  title: "Facturation",
};

export const dynamic = "force-dynamic";

export default async function BillingWorkspaceRoute() {
  const data = await getWorkspacePageData("billing");

  return <WorkspacePage data={data} workspace="billing" />;
}
