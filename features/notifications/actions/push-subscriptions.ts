"use server";

import { getCurrentUserContext } from "@/features/auth/queries";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type {
  NotificationMutationResult,
  PushSubscriptionInput,
} from "@/features/notifications/types";

export async function upsertPushSubscriptionAction(
  input: PushSubscriptionInput,
): Promise<NotificationMutationResult> {
  const currentUser = await getCurrentUserContext();

  if (!currentUser?.appUser?.id) {
    return {
      ok: false,
      message: "Profil métier requis pour activer les notifications push.",
    };
  }

  try {
    const supabase = await createSupabaseServerClient();
    const timestamp = new Date().toISOString();
    const [subscriptionResult, preferenceResult] = await Promise.all([
      supabase.from("push_subscriptions" as never).upsert(
        {
          auth_key: input.keys.auth,
          enabled: true,
          endpoint: input.endpoint,
          last_error: null,
          last_used_at: timestamp,
          p256dh_key: input.keys.p256dh,
          updated_at: timestamp,
          user_agent: input.userAgent,
          user_id: currentUser.appUser.id,
        } as never,
        {
          onConflict: "endpoint",
        },
      ),
      supabase.from("notification_preferences" as never).upsert(
        {
          push_enabled: true,
          updated_at: timestamp,
          user_id: currentUser.appUser.id,
        } as never,
        {
          onConflict: "user_id",
        },
      ),
    ]);

    if (subscriptionResult.error || preferenceResult.error) {
      return {
        ok: false,
        message:
          subscriptionResult.error?.message ??
          preferenceResult.error?.message ??
          "Impossible d’activer les notifications push.",
      };
    }

    return {
      ok: true,
      message: "Notifications push activées sur cet appareil.",
    };
  } catch (error) {
    return {
      ok: false,
      message:
        error instanceof Error
          ? error.message
          : "Activation des notifications impossible.",
    };
  }
}

export async function removePushSubscriptionAction(
  endpoint: string | null,
): Promise<NotificationMutationResult> {
  const currentUser = await getCurrentUserContext();

  if (!currentUser?.appUser?.id) {
    return {
      ok: false,
      message: "Profil métier requis pour désactiver les notifications push.",
    };
  }

  try {
    const supabase = await createSupabaseServerClient();
    const timestamp = new Date().toISOString();
    const subscriptionQuery = supabase
      .from("push_subscriptions" as never)
      .delete()
      .eq("user_id", currentUser.appUser.id);

    const subscriptionResult = endpoint
      ? await subscriptionQuery.eq("endpoint", endpoint)
      : await subscriptionQuery;
    const preferenceResult = await supabase
      .from("notification_preferences" as never)
      .upsert(
        {
          push_enabled: false,
          updated_at: timestamp,
          user_id: currentUser.appUser.id,
        } as never,
        {
          onConflict: "user_id",
        },
      );

    if (subscriptionResult.error || preferenceResult.error) {
      return {
        ok: false,
        message:
          subscriptionResult.error?.message ??
          preferenceResult.error?.message ??
          "Impossible de désactiver les notifications push.",
      };
    }

    return {
      ok: true,
      message: "Notifications push désactivées sur cet appareil.",
    };
  } catch (error) {
    return {
      ok: false,
      message:
        error instanceof Error
          ? error.message
          : "Désactivation des notifications impossible.",
    };
  }
}

export async function updateNotificationPreferencesAction(input: {
  deadline24h: boolean;
  emailNewUnprocessed: boolean;
  gmailSyncFailed: boolean;
  productionBlocked: boolean;
  pushEnabled: boolean;
  taskCritical: boolean;
}): Promise<NotificationMutationResult> {
  const currentUser = await getCurrentUserContext();

  if (!currentUser?.appUser?.id) {
    return {
      ok: false,
      message: "Profil métier requis pour enregistrer les préférences.",
    };
  }

  try {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase
      .from("notification_preferences" as never)
      .upsert(
        {
          deadline_24h: input.deadline24h,
          email_new_unprocessed: input.emailNewUnprocessed,
          gmail_sync_failed: input.gmailSyncFailed,
          production_blocked: input.productionBlocked,
          push_enabled: input.pushEnabled,
          task_critical: input.taskCritical,
          updated_at: new Date().toISOString(),
          user_id: currentUser.appUser.id,
        } as never,
        {
          onConflict: "user_id",
        },
      );

    if (error) {
      return {
        ok: false,
        message: error.message,
      };
    }

    return {
      ok: true,
      message: "Préférences de notifications enregistrées.",
    };
  } catch (error) {
    return {
      ok: false,
      message:
        error instanceof Error
          ? error.message
          : "Enregistrement des préférences impossible.",
    };
  }
}
