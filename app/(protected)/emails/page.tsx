import type { Metadata } from "next";

import { EmailsPage } from "@/features/emails/components/emails-page";
import { getEmailsPageData } from "@/features/emails/queries";

export const metadata: Metadata = {
  title: "Inbox emails",
};

export const dynamic = "force-dynamic";

export default async function EmailsRoutePage() {
  const data = await getEmailsPageData();

  return (
    <EmailsPage
      documentOptions={data.documentOptions}
      documentOptionsError={data.documentOptionsError}
      emails={data.emails}
      gmailInbox={data.gmailInbox}
      qualificationOptions={data.qualificationOptions}
      qualificationOptionsError={data.qualificationOptionsError}
      requestOptions={data.requestOptions}
      requestOptionsError={data.requestOptionsError}
      error={data.error}
    />
  );
}
