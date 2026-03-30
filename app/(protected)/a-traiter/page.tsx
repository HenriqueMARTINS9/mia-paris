import type { Metadata } from "next";

import { ActionCenterPage } from "@/features/action-center/components/action-center-page";
import { getActionCenterPageData } from "@/features/action-center/queries";

export const metadata: Metadata = {
  title: "À traiter / À décider",
};

export const dynamic = "force-dynamic";

export default async function ActionCenterRoutePage() {
  const data = await getActionCenterPageData();

  return <ActionCenterPage data={data} />;
}
