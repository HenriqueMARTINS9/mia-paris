import { ActionErrorBoundary } from "@/components/crm/action-error-boundary";
import { ReplyDraftPanel } from "@/features/replies/components/reply-draft-panel";
import { ReplyContextSummary } from "@/features/replies/components/reply-context-summary";
import { ReplyHistoryPanel } from "@/features/replies/components/reply-history-panel";
import { getReplyDraftHistory, getSavedReplyDraft } from "@/features/replies/queries";
import type { ReplyDraftContext } from "@/features/replies/types";

export async function AdvancedReplyDraftPanel({
  context,
  eyebrow = "Réponse assistée avancée",
  title,
}: Readonly<{
  context: ReplyDraftContext;
  eyebrow?: string;
  title: string;
}>) {
  const [initialSavedDraft, historyItems] = await Promise.all([
    getSavedReplyDraft(context.sourceType, context.sourceId),
    getReplyDraftHistory(context.sourceType, context.sourceId),
  ]);

  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
      <div className="space-y-4">
        <ReplyContextSummary context={context} />
        <ReplyHistoryPanel items={historyItems} />
      </div>
      <ActionErrorBoundary
        title="Le brouillon de réponse a rencontré une erreur"
        description="Le contexte reste visible. Recharge le panneau ou réessaie la génération."
      >
        <ReplyDraftPanel
          context={context}
          eyebrow={eyebrow}
          initialSavedDraft={initialSavedDraft}
          title={title}
        />
      </ActionErrorBoundary>
    </div>
  );
}
