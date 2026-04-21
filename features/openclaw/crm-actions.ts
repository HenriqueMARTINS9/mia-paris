import "server-only";

export {
  addNoteToProduction,
  addNoteToRequest,
  assignClientToEmail,
  createClient,
  createDeadline as createAssistantDeadline,
  createRequest as createAssistantRequest,
  createTask as createAssistantTask,
  getBlockedProductions,
  getHighRiskProductions,
  getRequestsWithoutAssignee,
  getTodayUrgencies,
  getUnprocessedEmails,
  prepareReplyDraft,
  runGmailSync,
  setEmailInboxBucket,
  searchClientHistory,
  searchModelHistory,
} from "@/features/assistant-actions/commands";
export { assistantActionCatalog as assistantReadyActions } from "@/features/assistant-actions/catalog";

import { getAssistantWorkspaceData } from "@/features/assistant-actions/commands";
import type { AssistantWorkspaceData } from "@/features/assistant-actions/types";

export async function getAssistantReadyWorkspaceData(): Promise<AssistantWorkspaceData> {
  return getAssistantWorkspaceData();
}
