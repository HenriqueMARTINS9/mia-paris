import type { AssistantMutationExecutionContext } from "@/features/assistant-actions/execution-context";
import type { AppUserRole } from "@/types/crm";

export const OPENCLAW_ACTOR_USER_ID = "a1665f0b-c74d-40fe-b568-4a32edd9218a";
export const OPENCLAW_ACTOR_EMAIL = "openclaw@miaparis.com";

const OPENCLAW_ACTOR_ROLE: AppUserRole = "admin";

export function getOpenClawAssistantExecutionContext(): AssistantMutationExecutionContext {
  return {
    actor: {
      actorEmail: OPENCLAW_ACTOR_EMAIL,
      actorType: "assistant",
      actorUserId: OPENCLAW_ACTOR_USER_ID,
      source: "assistant",
    },
    authorizationOverride: {
      actorId: OPENCLAW_ACTOR_USER_ID,
      actorType: "assistant",
      role: OPENCLAW_ACTOR_ROLE,
      source: "assistant",
    },
    rest: {
      authMode: "service_role",
    },
  };
}
