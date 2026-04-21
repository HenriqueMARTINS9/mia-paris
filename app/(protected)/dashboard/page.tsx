import type { Metadata } from "next";

import { DashboardPage } from "@/features/dashboard/components/dashboard-page";
import { getDashboardPageData } from "@/features/dashboard/queries";

export const metadata: Metadata = {
  title: "Dashboard",
};

export const dynamic = "force-dynamic";

export default async function DashboardRoutePage() {
  const data = await getDashboardPageData();

  return <DashboardPage data={data} />;
}
