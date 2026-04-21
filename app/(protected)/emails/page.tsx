import type { Metadata } from "next";

import { EmailsPage } from "@/features/emails/components/emails-page";
import { getPaginatedEmailsPageData } from "@/features/emails/queries";

export const metadata: Metadata = {
  title: "Inbox emails",
};

export const dynamic = "force-dynamic";

interface EmailsRoutePageProps {
  searchParams?: Promise<{
    bucket?: string;
    email?: string;
    page?: string;
    perPage?: string;
    search?: string;
    status?: string;
  }>;
}

export default async function EmailsRoutePage({
  searchParams,
}: Readonly<EmailsRoutePageProps>) {
  const resolvedSearchParams = (await searchParams) ?? {};
  const data = await getPaginatedEmailsPageData(
    Number(resolvedSearchParams.page ?? 1),
    Number(resolvedSearchParams.perPage ?? 15) as 10 | 15,
    resolvedSearchParams.search ?? "",
    (resolvedSearchParams.bucket as "all" | "important" | "promotional" | "to_review" | undefined) ??
      "important",
    (resolvedSearchParams.status as "all" | "new" | "review" | "processed" | undefined) ??
      "all",
    resolvedSearchParams.email ?? null,
  );

  return (
    <EmailsPage
      bucketCounts={data.bucketCounts}
      counts={data.counts}
      documentOptions={data.documentOptions}
      documentOptionsError={data.documentOptionsError}
      emails={data.emails}
      gmailInbox={data.gmailInbox}
      filters={data.filters}
      pagination={data.pagination}
      qualificationOptions={data.qualificationOptions}
      qualificationOptionsError={data.qualificationOptionsError}
      requestOptions={data.requestOptions}
      requestOptionsError={data.requestOptionsError}
      selectedEmailId={data.selectedEmailId}
      error={data.error}
    />
  );
}
