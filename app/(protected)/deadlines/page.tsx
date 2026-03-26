import type { Metadata } from "next";

import { DeadlinesPage } from "@/features/deadlines/components/deadlines-page";
import { getDeadlinesPageData } from "@/features/deadlines/queries";

export const metadata: Metadata = {
  title: "Deadlines",
};

export const dynamic = "force-dynamic";

interface DeadlinesRoutePageProps {
  searchParams?: Promise<{
    requestId?: string;
  }>;
}

export default async function DeadlinesRoutePage({
  searchParams,
}: Readonly<DeadlinesRoutePageProps>) {
  const resolvedSearchParams = (await searchParams) ?? {};
  const data = await getDeadlinesPageData();

  return (
    <DeadlinesPage
      deadlines={data.deadlines}
      requestOptions={data.requestOptions}
      requestOptionsError={data.requestOptionsError}
      error={data.error}
      preselectedRequestId={resolvedSearchParams.requestId ?? null}
    />
  );
}
