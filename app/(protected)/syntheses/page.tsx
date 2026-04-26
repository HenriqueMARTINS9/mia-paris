import type { Metadata } from "next";

import { DailySummariesPage } from "@/features/daily-summaries/components/daily-summaries-page";
import { getDailySummariesPageData } from "@/features/daily-summaries/queries";

export const metadata: Metadata = {
  title: "Synthèses",
};

export const dynamic = "force-dynamic";

export default async function SynthesesRoutePage() {
  const data = await getDailySummariesPageData();

  return <DailySummariesPage data={data} />;
}
