import type { RequestDetailItem } from "@/features/requests/detail-types";
import type { RequestHistoryPanelData } from "@/features/history/types";
import { AdvancedReplyDraftPanel } from "@/features/replies/components/advanced-reply-draft-panel";

export async function RequestReplyCard({
  historyContext = null,
  request,
}: Readonly<{
  historyContext?: RequestHistoryPanelData | null;
  request: RequestDetailItem;
}>) {
  const primaryContact = request.contacts[0] ?? null;
  const historicalSignals = [
    ...(historyContext?.requestSignals.map((signal) => signal.title) ?? []),
    ...(historyContext?.productionHistory?.signals.map((signal) => signal.title) ?? []),
  ].slice(0, 4);

  return (
    <AdvancedReplyDraftPanel
      key={`request-reply-advanced-${request.id}`}
      eyebrow="Réponse depuis demande"
      title="Brouillon de réponse client"
      context={{
        clientName: request.clientName,
        dueAt: request.dueAt,
        historicalSignals,
        linkedRequestTitle: request.title,
        productionLabel: request.modelReference ?? request.modelName,
        productionStatus: request.productionStage,
        recipientEmail: primaryContact?.email ?? null,
        recipientName: primaryContact?.name ?? request.clientName,
        requestPriority: request.priority,
        requestReference: request.reference,
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
