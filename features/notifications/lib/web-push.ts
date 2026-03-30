import "server-only";

import webpush from "web-push";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { hasSupabaseAdminEnv } from "@/lib/supabase/env";
import type { Database } from "@/lib/supabase/database.types";
import type {
  NotificationEventType,
} from "@/features/notifications/types";
import type {
  NotificationPreferenceRecord,
  PushSubscriptionRecord,
} from "@/types/crm";

const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;
const vapidSubject = process.env.VAPID_SUBJECT;

export const hasWebPushEnv = Boolean(
  vapidPublicKey && vapidPrivateKey && vapidSubject,
);

export async function sendPushNotificationToEligibleUsers(input: {
  body: string;
  data?: Record<string, unknown>;
  tag?: string;
  title: string;
  type: NotificationEventType;
  url: string;
}) {
  if (!hasSupabaseAdminEnv || !hasWebPushEnv) {
    return {
      failedCount: 0,
      ok: false,
      sentCount: 0,
    };
  }

  webpush.setVapidDetails(vapidSubject!, vapidPublicKey!, vapidPrivateKey!);

  const admin = createSupabaseAdminClient();
  const [subscriptionsResult, preferencesResult] = await Promise.all([
    admin
      .from("push_subscriptions" as never)
      .select("*")
      .eq("enabled", true),
    admin
      .from("notification_preferences" as never)
      .select("*")
      .eq("push_enabled", true),
  ]);

  if (subscriptionsResult.error || preferencesResult.error) {
    return {
      failedCount: 0,
      ok: false,
      sentCount: 0,
    };
  }

  const subscriptions =
    (subscriptionsResult.data as PushSubscriptionRecord[] | null) ?? [];
  const preferences =
    (preferencesResult.data as NotificationPreferenceRecord[] | null) ?? [];
  const allowedUserIds = new Set(
    preferences
      .filter((preference) => isPreferenceEnabled(preference, input.type))
      .map((preference) => preference.user_id)
      .filter((value): value is string => Boolean(value)),
  );

  let sentCount = 0;
  let failedCount = 0;

  await Promise.all(
    subscriptions
      .filter(
        (subscription) =>
          Boolean(subscription.user_id) &&
          allowedUserIds.has(subscription.user_id as string),
      )
      .map(async (subscription) => {
        if (
          !subscription.endpoint ||
          !subscription.auth_key ||
          !subscription.p256dh_key
        ) {
          return;
        }

        try {
          await webpush.sendNotification(
            {
              endpoint: subscription.endpoint,
              expirationTime: null,
              keys: {
                auth: subscription.auth_key,
                p256dh: subscription.p256dh_key,
              },
            },
            JSON.stringify({
              body: input.body,
              data: {
                ...(input.data ?? {}),
                url: input.url,
              },
              tag: input.tag ?? `mia-${input.type}`,
              title: input.title,
            }),
          );

          sentCount += 1;

          await admin
            .from("push_subscriptions" as never)
            .update(
              {
                last_error: null,
                last_used_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
              } as Database["public"]["Tables"]["push_subscriptions"]["Update"] as never,
            )
            .eq("id", subscription.id);
        } catch (error) {
          failedCount += 1;
          const message =
            error instanceof Error ? error.message : "Push notification impossible.";
          const shouldDisable =
            message.includes("410") ||
            message.includes("404") ||
            message.toLowerCase().includes("gone");

          await admin
            .from("push_subscriptions" as never)
            .update(
              {
                enabled: shouldDisable ? false : true,
                last_error: message,
                updated_at: new Date().toISOString(),
              } as Database["public"]["Tables"]["push_subscriptions"]["Update"] as never,
            )
            .eq("id", subscription.id);
        }
      }),
  );

  return {
    failedCount,
    ok: true,
    sentCount,
  };
}

function isPreferenceEnabled(
  preference: NotificationPreferenceRecord,
  type: NotificationEventType,
) {
  if (type === "email_new_unprocessed") {
    return preference.email_new_unprocessed !== false;
  }

  if (type === "deadline_24h") {
    return preference.deadline_24h !== false;
  }

  if (type === "task_critical") {
    return preference.task_critical !== false;
  }

  if (type === "production_blocked") {
    return preference.production_blocked !== false;
  }

  return preference.gmail_sync_failed !== false;
}
