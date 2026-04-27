import "server-only";

export {
  addNoteToProduction,
  addNoteToRequest,
  assignClientToEmail,
  attachEmailToRequest,
  createClient,
  createDeadline as createAssistantDeadline,
  createRequest as createAssistantRequest,
  createTask as createAssistantTask,
  getBlockedProductions,
  getEmailActivity,
  getHighRiskProductions,
  getRequestsWithoutAssignee,
  getTodayUrgencies,
  getUnprocessedEmails,
  prepareReplyDraft,
  runEmailOpsCycle,
  runGmailSync,
  setEmailInboxBucket,
  searchClientHistory,
  searchModelHistory,
  updateRequest,
  updateTask,
  writeDailySummary,
} from "@/features/assistant-actions/commands";
export { assistantActionCatalog as assistantReadyActions } from "@/features/assistant-actions/catalog";

import { getAssistantWorkspaceData } from "@/features/assistant-actions/commands";
import type { AssistantWorkspaceData } from "@/features/assistant-actions/types";

export async function getAssistantReadyWorkspaceData(): Promise<AssistantWorkspaceData> {
  return getAssistantWorkspaceData();
}
