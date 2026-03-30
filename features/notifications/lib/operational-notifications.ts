import "server-only";

import { sendPushNotificationToEligibleUsers } from "@/features/notifications/lib/web-push";

export async function notifyNewUnprocessedEmails(input: {
  count: number;
  inboxEmail: string | null;
}) {
  if (input.count <= 0) {
    return;
  }

  await sendPushNotificationToEligibleUsers({
    body:
      input.count === 1
        ? `1 nouvel email attend dans la boîte ${input.inboxEmail ?? "partagée"}.`
        : `${input.count} nouveaux emails attendent dans la boîte ${input.inboxEmail ?? "partagée"}.`,
    tag: "mia-email-sync",
    title: "Nouvel email à trier",
    type: "email_new_unprocessed",
    url: "/emails",
  });
}

export async function notifyCriticalTask(input: {
  dueAt: string | null;
  requestId: string | null;
  title: string;
}) {
  await sendPushNotificationToEligibleUsers({
    body: input.dueAt
      ? `${input.title} est critique, avec échéance le ${formatNotificationDate(input.dueAt)}.`
      : `${input.title} est passée en priorité critique.`,
    tag: "mia-task-critical",
    title: "Tâche critique",
    type: "task_critical",
    url: input.requestId ? `/requests/${input.requestId}` : "/taches",
  });
}

export async function notifyUrgentDeadline(input: {
  deadlineAt: string | null;
  label: string;
  requestId: string | null;
}) {
  if (!input.deadlineAt || !isWithin24Hours(input.deadlineAt)) {
    return;
  }

  await sendPushNotificationToEligibleUsers({
    body: `${input.label} arrive à échéance le ${formatNotificationDate(input.deadlineAt)}.`,
    tag: "mia-deadline-24h",
    title: "Deadline < 24h",
    type: "deadline_24h",
    url: input.requestId ? `/requests/${input.requestId}` : "/deadlines",
  });
}

export async function notifyBlockedProduction(input: {
  blockingReason: string | null;
  productionId: string | null;
  title: string;
}) {
  await sendPushNotificationToEligibleUsers({
    body: input.blockingReason
      ? `${input.title} est bloquée: ${input.blockingReason}.`
      : `${input.title} est passée en statut bloqué.`,
    tag: "mia-production-blocked",
    title: "Production bloquée",
    type: "production_blocked",
    url: input.productionId ? `/productions?production=${input.productionId}` : "/productions",
  });
}

export async function notifyGmailSyncFailure(input: { message: string }) {
  await sendPushNotificationToEligibleUsers({
    body: input.message,
    tag: "mia-gmail-sync-failed",
    title: "Échec sync Gmail",
    type: "gmail_sync_failed",
    url: "/emails",
  });
}

function isWithin24Hours(value: string) {
  const timestamp = new Date(value).getTime();

  if (!Number.isFinite(timestamp)) {
    return false;
  }

  return timestamp - Date.now() <= 24 * 60 * 60 * 1000;
}

function formatNotificationDate(value: string) {
  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    month: "short",
  }).format(new Date(value));
}
