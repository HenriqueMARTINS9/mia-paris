import type { ReplyDraft, ReplyDraftContext, ReplyDraftType } from "@/features/replies/types";
export type {
  AssistantActionDefinition as AssistantReadyActionDefinition,
  AssistantHistorySearchResult as AssistantHistoryResult,
  AssistantWorkspaceData as AssistantReadyWorkspaceData,
} from "@/features/assistant-actions/types";

export interface PrepareReplyDraftInput {
  context: ReplyDraftContext;
  replyType: ReplyDraftType;
}

export interface PrepareReplyDraftResult {
  draft: ReplyDraft | null;
  message: string;
  ok: boolean;
}
