import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { ErrorState } from "@/components/crm/error-state";
import { RequestDetailPage } from "@/features/requests/components/request-detail-page";
import { getRequestDetailPageData } from "@/features/requests/detail-queries";

interface RequestDetailRoutePageProps {
  params: Promise<{
    id: string;
  }>;
}

export const metadata: Metadata = {
  title: "Détail demande",
};

export const dynamic = "force-dynamic";

export default async function RequestDetailRoutePage({
  params,
}: Readonly<RequestDetailRoutePageProps>) {
  const { id } = await params;
  const data = await getRequestDetailPageData(id);

  if (data.error) {
    return (
      <ErrorState
        title="Connexion Supabase impossible pour la demande"
        description={data.error}
      />
    );
  }

  if (!data.request) {
    notFound();
  }

  return <RequestDetailPage data={data} />;
}
