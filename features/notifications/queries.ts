import "server-only";

import { getCurrentUserContext } from "@/features/auth/queries";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type {
  NotificationPreferenceRecord,
  PushSubscriptionRecord,
} from "@/types/crm";
import type { NotificationPreferencesState } from "@/features/notifications/types";

const defaultPreferences: NotificationPreferencesState = {
  deadline24h: true,
  emailNewUnprocessed: true,
  error: null,
  gmailSyncFailed: true,
  hasSubscription: false,
  productionBlocked: true,
  pushEnabled: false,
  subscriptionCount: 0,
  taskCritical: true,
};

export async function getNotificationPreferencesState() {
  const currentUser = await getCurrentUserContext();

  if (!currentUser?.authUser) {
    return defaultPreferences;
  }

  if (!currentUser.appUser?.id) {
    return {
      ...defaultPreferences,
      error:
        "Profil métier introuvable dans public.users. Les notifications push restent indisponibles.",
    };
  }

  try {
    const supabase = await createSupabaseServerClient();
    const [preferencesResult, subscriptionsResult] = await Promise.all([
      supabase
        .from("notification_preferences" as never)
        .select("*")
        .eq("user_id", currentUser.appUser.id)
        .maybeSingle(),
      supabase
        .from("push_subscriptions" as never)
        .select("id,enabled")
        .eq("user_id", currentUser.appUser.id),
    ]);

    const subscriptions =
      (subscriptionsResult.data as PushSubscriptionRecord[] | null) ?? [];
    const enabledSubscriptions = subscriptions.filter(
      (subscription) => subscription.enabled !== false,
    );
    const preferences =
      (preferencesResult.data as NotificationPreferenceRecord | null) ?? null;

    return {
      deadline24h: preferences?.deadline_24h ?? true,
      emailNewUnprocessed: preferences?.email_new_unprocessed ?? true,
      error: preferencesResult.error?.message ?? subscriptionsResult.error?.message ?? null,
      gmailSyncFailed: preferences?.gmail_sync_failed ?? true,
      hasSubscription: enabledSubscriptions.length > 0,
      productionBlocked: preferences?.production_blocked ?? true,
      pushEnabled:
        (preferences?.push_enabled ?? false) && enabledSubscriptions.length > 0,
      subscriptionCount: enabledSubscriptions.length,
      taskCritical: preferences?.task_critical ?? true,
    } satisfies NotificationPreferencesState;
  } catch (error) {
    return {
      ...defaultPreferences,
      error:
        error instanceof Error
          ? error.message
          : "Impossible de charger les préférences de notifications.",
    };
  }
}
