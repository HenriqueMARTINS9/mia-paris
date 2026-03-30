import type { EmailListItem } from "@/features/emails/types";
import { ReplyDraftPanel } from "@/features/replies/components/reply-draft-panel";

export function EmailReplyCard({
  email,
}: Readonly<{
  email: EmailListItem;
}>) {
  return (
    <ReplyDraftPanel
      key={`email-reply-${email.id}`}
      title="Brouillon de réponse email"
      context={{
        clientName: email.clientName !== "Client non détecté" ? email.clientName : null,
        dueAt: email.classification.suggestedFields.dueAt,
        recipientEmail: email.fromEmail,
        recipientName: email.fromName,
        requestPriority: email.classification.suggestedFields.priority,
        requestStatus: email.rawStatus,
        requestType: email.classification.suggestedFields.requestType,
        requestedAction: email.classification.suggestedFields.requestedAction,
        requestId: email.linkedRequestId,
        sourceId: email.id,
        sourceType: "email",
        subject: email.subject,
        summary: email.summary ?? email.previewText,
      }}
    />
  );
}
