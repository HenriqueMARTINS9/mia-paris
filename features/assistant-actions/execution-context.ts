import type { AssistantActionSource } from "@/features/assistant-actions/types";
import type { ServerPermissionOverride } from "@/features/auth/server-authorization";
import type { SupabaseRestExecutionContext } from "@/lib/supabase/rest";

export interface AssistantMutationActorContext {
  actorEmail: string | null;
  actorType: "assistant" | "system" | "user";
  actorUserId: string | null;
  source: AssistantActionSource;
}

export interface AssistantMutationExecutionContext {
  actor?: AssistantMutationActorContext | null;
  authorizationOverride?: ServerPermissionOverride | null;
  rest?: SupabaseRestExecutionContext | null;
}
