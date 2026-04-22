import type { EmailListItem } from "@/features/emails/types";
import type { ReplyDraftType } from "@/features/replies/types";
import { ActionErrorBoundary } from "@/components/crm/action-error-boundary";
import { ReplyContextSummary } from "@/features/replies/components/reply-context-summary";
import { ReplyDraftPanel } from "@/features/replies/components/reply-draft-panel";

export function EmailReplyCard({
  email,
}: Readonly<{
  email: EmailListItem;
}>) {
  const initialReplyType = resolveSuggestedReplyType(email);
  const context = {
    clientName: email.clientName !== "Client non détecté" ? email.clientName : null,
    dueAt: email.classification.suggestedFields.dueAt,
    historicalSignals: [
      email.linkedRequestId ? "Une demande liée existe déjà dans le CRM." : null,
      email.attachments.length > 0
        ? `${email.attachments.length} pièce(s) jointe(s) sont présentes sur ce mail.`
        : null,
      email.status === "review" ? "Cet email est déjà marqué à revoir." : null,
      email.detectedType ? `Type détecté: ${email.detectedType}.` : null,
    ].filter((value): value is string => Boolean(value)),
    linkedRequestTitle: email.linkedRequestLabel,
    recipientEmail: email.fromEmail,
    recipientName: email.fromName,
    requestPriority: email.classification.suggestedFields.priority,
    requestReference: email.linkedRequestId,
    requestStatus: email.rawStatus,
    requestType: email.classification.suggestedFields.requestType,
    requestedAction: email.classification.suggestedFields.requestedAction,
    requestId: email.linkedRequestId,
    sourceId: email.id,
    sourceType: "email" as const,
    subject: email.subject,
    summary: email.summary ?? email.previewText,
  };

  return (
    <div className="space-y-4">
      <ReplyContextSummary context={context} />
      <ActionErrorBoundary
        title="Le brouillon email a rencontré une erreur"
        description="Le reste du panneau email reste disponible. Réessaie la génération si besoin."
      >
        <ReplyDraftPanel
          key={`email-reply-${email.id}`}
          initialReplyType={initialReplyType}
          title="Brouillon de réponse email"
          context={context}
        />
      </ActionErrorBoundary>
    </div>
  );
}

function resolveSuggestedReplyType(email: EmailListItem): ReplyDraftType {
  const requestType = email.classification.suggestedFields.requestType;

  switch (requestType) {
    case "deadline_request":
      return "deadline_confirmation";
    case "production_followup":
      return "production_update";
    case "logistics":
      return "logistics_response";
    case "trim_validation":
      return "validation_feedback";
    case "compliance":
      return "waiting_validation";
    default:
      return email.linkedRequestId ? "ownership" : "acknowledgement";
  }
}
