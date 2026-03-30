export type NotificationEventType =
  | "email_new_unprocessed"
  | "deadline_24h"
  | "task_critical"
  | "production_blocked"
  | "gmail_sync_failed";

export interface NotificationPreferencesState {
  deadline24h: boolean;
  emailNewUnprocessed: boolean;
  error: string | null;
  gmailSyncFailed: boolean;
  hasSubscription: boolean;
  productionBlocked: boolean;
  pushEnabled: boolean;
  subscriptionCount: number;
  taskCritical: boolean;
}

export interface PushSubscriptionInput {
  endpoint: string;
  keys: {
    auth: string;
    p256dh: string;
  };
  userAgent: string | null;
}

export interface NotificationMutationResult {
  message: string;
  ok: boolean;
}
