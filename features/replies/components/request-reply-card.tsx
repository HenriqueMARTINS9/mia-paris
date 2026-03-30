import type { RequestDetailItem } from "@/features/requests/detail-types";
import { ReplyDraftPanel } from "@/features/replies/components/reply-draft-panel";
import { getSavedReplyDraft } from "@/features/replies/queries";

export async function RequestReplyCard({
  request,
}: Readonly<{
  request: RequestDetailItem;
}>) {
  const primaryContact = request.contacts[0] ?? null;
  const savedDraft = await getSavedReplyDraft("request", request.id);

  return (
    <ReplyDraftPanel
      key={`request-reply-${request.id}`}
      eyebrow="Réponse depuis demande"
      initialSavedDraft={savedDraft}
      title="Brouillon de réponse client"
      context={{
        clientName: request.clientName,
        dueAt: request.dueAt,
        recipientEmail: primaryContact?.email ?? null,
        recipientName: primaryContact?.name ?? request.clientName,
        requestPriority: request.priority,
        requestStatus: request.status,
        requestType: request.requestType,
        requestedAction: request.nextActions[0] ?? null,
        requestId: request.id,
        sourceId: request.id,
        sourceType: "request",
        subject: request.sourceSubject || request.title,
        summary: request.requestSummary,
      }}
    />
  );
}
