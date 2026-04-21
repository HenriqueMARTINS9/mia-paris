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
    gmail?: string;
    gmail_account?: string;
    gmail_message?: string;
    page?: string;
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
    10,
    resolvedSearchParams.search ?? "",
    (resolvedSearchParams.bucket as "all" | "important" | "promotional" | "to_review" | undefined) ??
      "important",
    (resolvedSearchParams.status as "all" | "review" | "processed" | undefined) ??
      "all",
    resolvedSearchParams.email ?? null,
  );
  const oauthFeedbackMessage = resolveGmailOauthFeedbackMessage(
    resolvedSearchParams.gmail,
    resolvedSearchParams.gmail_message,
    resolvedSearchParams.gmail_account,
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
      oauthFeedbackMessage={oauthFeedbackMessage}
    />
  );
}

function resolveGmailOauthFeedbackMessage(
  status: string | undefined,
  rawMessage: string | undefined,
  gmailAccount: string | undefined,
) {
  if (!status) {
    return null;
  }

  if (status === "connected") {
    return gmailAccount
      ? `Boîte Gmail reconnectée: ${gmailAccount}.`
      : "Boîte Gmail reconnectée.";
  }

  if (status === "config_missing") {
    return "Configuration Google OAuth manquante. Vérifie GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET et GOOGLE_REDIRECT_URI.";
  }

  if (status === "supabase_service_role_missing") {
    return "SUPABASE_SERVICE_ROLE_KEY manquante. Impossible d'enregistrer la connexion Gmail.";
  }

  if (status === "oauth_state_error") {
    return "La validation de sécurité OAuth a échoué (state invalide). Relance la connexion Gmail depuis l'application.";
  }

  if (status === "callback_error") {
    return rawMessage
      ? `La reconnexion Gmail a échoué: ${safeDecodeURIComponent(rawMessage)}`
      : "La reconnexion Gmail a échoué lors du callback OAuth.";
  }

  return "La reconnexion Gmail a échoué. Réessaie depuis ce navigateur.";
}

function safeDecodeURIComponent(value: string) {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}
