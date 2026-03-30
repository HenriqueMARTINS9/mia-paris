import type { Metadata } from "next";

import { AnalyticsOverviewPage } from "@/features/analytics/components/analytics-overview-page";
import { getAnalyticsOverviewData } from "@/features/analytics/queries";

export const metadata: Metadata = {
  title: "Analytics métier",
};

export const dynamic = "force-dynamic";

export default async function AnalyticsRoutePage() {
  const data = await getAnalyticsOverviewData();

  return <AnalyticsOverviewPage data={data} />;
}
