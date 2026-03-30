import "server-only";

export {
  addNoteToProduction,
  addNoteToRequest,
  createDeadline as createAssistantDeadline,
  createTask as createAssistantTask,
  getBlockedProductions,
  getHighRiskProductions,
  getRequestsWithoutAssignee,
  getTodayUrgencies,
  getUnprocessedEmails,
  prepareReplyDraft,
  searchClientHistory,
  searchModelHistory,
} from "@/features/assistant-actions/commands";
export { assistantActionCatalog as assistantReadyActions } from "@/features/assistant-actions/catalog";

import { getAssistantWorkspaceData } from "@/features/assistant-actions/commands";
import type { AssistantWorkspaceData } from "@/features/assistant-actions/types";

export async function getAssistantReadyWorkspaceData(): Promise<AssistantWorkspaceData> {
  return getAssistantWorkspaceData();
}
