import type { Metadata } from "next";

import { DemandesPage } from "@/components/crm/requests/demandes-page";
import { getRequestsOverviewPageData } from "@/features/requests/queries";

export const metadata: Metadata = {
  title: "Demandes",
};

export const dynamic = "force-dynamic";

export default async function DemandesRoutePage() {
  const { requests, assignees, assigneesError, error } =
    await getRequestsOverviewPageData();

  return (
    <DemandesPage
      requests={requests}
      assignees={assignees}
      assigneesError={assigneesError}
      error={error}
    />
  );
}
