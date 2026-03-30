import type { Metadata } from "next";

import { SystemMonitoringPage } from "@/features/monitoring/components/system-monitoring-page";
import { getMonitoringRouteData } from "@/features/monitoring/queries";

export const metadata: Metadata = {
  title: "System / Monitoring",
};

export const dynamic = "force-dynamic";

export default async function SystemPage() {
  const { data } = await getMonitoringRouteData();

  return <SystemMonitoringPage data={data} />;
}
