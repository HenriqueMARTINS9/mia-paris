import "server-only";

import { cache } from "react";

import { getCurrentUserContext } from "@/features/auth/queries";
import { recordGmailSyncRun } from "@/features/emails/lib/gmail-sync-history";
import { resolveGmailSyncFailureMessage } from "@/features/emails/lib/gmail-sync-errors";
import { parseGmailMessage } from "@/features/emails/lib/gmail-parser";
import type { GmailSyncMode, GmailSyncResult } from "@/features/emails/types";
import {
  notifyGmailSyncFailure,
  notifyNewUnprocessedEmails,
} from "@/features/notifications/lib/operational-notifications";
import { insertActivityLogViaAdmin } from "@/lib/activity-logs";
import { getGoogleGmailEnv } from "@/lib/google/env";
import { getGmailMessage, listGmailMessages } from "@/lib/google/gmail";
import { refreshGoogleAccessToken } from "@/lib/google/oauth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { Database } from "@/lib/supabase/database.types";
import { hasSupabaseAdminEnv } from "@/lib/supabase/env";
import type { EmailRecord, InboxRecord } from "@/types/crm";

export async function syncLatestGmailMessagesForCurrentUser(
  limit = 50,
): Promise<GmailSyncResult> {
  const currentUser = await getCurrentUserContext();

  if (!currentUser?.authUser) {
    return {
      connectedInboxEmail: null,
      ignoredMessages: 0,
      importedMessages: 0,
      importedThreads: 0,
      message: "Session Supabase introuvable pour synchroniser Gmail.",
      ok: false,
      queryUsed: null,
      syncMode: "incremental",
      syncedAt: null,
    };
  }

  if (!hasSupabaseAdminEnv) {
    return {
      connectedInboxEmail: null,
      ignoredMessages: 0,
      importedMessages: 0,
      importedThreads: 0,
      message:
        "SUPABASE_SERVICE_ROLE_KEY est requis pour stocker les emails Gmail synchronisés.",
      ok: false,
      queryUsed: null,
      syncMode: "incremental",
      syncedAt: null,
    };
  }

  const admin = createSupabaseAdminClient();
  const sharedInboxResult = await getSharedActiveGoogleInbox(admin);

  if (sharedInboxResult.error) {
    return {
      connectedInboxEmail: null,
      ignoredMessages: 0,
      importedMessages: 0,
      importedThreads: 0,
      message: `Impossible de charger la boîte Gmail partagée: ${sharedInboxResult.error}`,
      ok: false,
      queryUsed: null,
      syncMode: "incremental",
      syncedAt: null,
    };
  }

  const inbox = sharedInboxResult.inbox;

  if (!inbox) {
    return {
      connectedInboxEmail: null,
      ignoredMessages: 0,
      importedMessages: 0,
      importedThreads: 0,
      message: "Aucune boîte Gmail partagée n'est connectée dans l'application.",
      ok: false,
      queryUsed: null,
      syncMode: "incremental",
      syncedAt: null,
    };
  }

  const syncState = buildSyncState({
    lastSyncedAt: inbox.last_synced_at ?? null,
    syncCursor: inbox.sync_cursor ?? null,
  });
  const syncMode = syncState.mode;

  try {
    const syncResult = await syncInbox({
      inbox,
      limit,
    });

    console.info("[gmail-sync]", {
      connectedInboxEmail: syncResult.connectedInboxEmail,
      ignoredMessages: syncResult.ignoredMessages,
      importedMessages: syncResult.importedMessages,
      importedThreads: syncResult.importedThreads,
      ok: syncResult.ok,
    });

    await recordGmailSyncEvent({
      actorId: currentUser.appUser?.id ?? null,
      inbox,
      result: syncResult,
      success: true,
    });

    await recordGmailSyncRun({
      errorCount: syncResult.errorCount ?? 0,
      errorMessage: syncResult.ok ? null : syncResult.message,
      ignoredMessages: syncResult.ignoredMessages,
      importedMessages: syncResult.importedMessages,
      importedThreads: syncResult.importedThreads,
      inboxId: inbox.id,
      message: syncResult.message,
      metadata: {
        connectedInboxEmail: syncResult.connectedInboxEmail,
      },
      ok: syncResult.ok,
      queryUsed: syncResult.queryUsed ?? null,
      syncMode: syncResult.syncMode ?? syncMode,
      triggeredByUserId: currentUser.appUser?.id ?? null,
    });

    await notifyNewUnprocessedEmails({
      count: syncResult.importedMessages,
      inboxEmail: syncResult.connectedInboxEmail,
    });

    return syncResult;
  } catch (error) {
    const baseMessage = resolveGmailSyncFailureMessage(
      error instanceof Error
        ? error.message
        : "Synchronisation Gmail impossible.",
    );
    const message =
      baseMessage.toLowerCase().includes("bad request") && syncState.query
        ? `${baseMessage} Query Gmail utilisée: ${syncState.query}`
        : baseMessage;

    await admin
      .from("inboxes")
      .update(
        {
          last_error: message,
          updated_at: new Date().toISOString(),
        } as Database["public"]["Tables"]["inboxes"]["Update"] as never,
      )
      .eq("id", inbox.id);

    await recordGmailSyncEvent({
      actorId: currentUser.appUser?.id ?? null,
      inbox,
      result: {
        connectedInboxEmail: inbox.email_address ?? null,
        errorCount: 1,
        ignoredMessages: 0,
        importedMessages: 0,
        importedThreads: 0,
        message,
        ok: false,
        queryUsed: syncState.query,
        syncMode,
        syncedAt: new Date().toISOString(),
      },
      success: false,
    });

    await recordGmailSyncRun({
      errorCount: 1,
      errorMessage: message,
      ignoredMessages: 0,
      importedMessages: 0,
      importedThreads: 0,
      inboxId: inbox.id,
      message,
      metadata: {
        connectedInboxEmail: inbox.email_address ?? null,
      },
      ok: false,
      queryUsed: syncState.query,
      syncMode,
      triggeredByUserId: currentUser.appUser?.id ?? null,
    });

    await notifyGmailSyncFailure({
      message,
    });

    return {
      connectedInboxEmail: inbox.email_address ?? null,
      errorCount: 1,
      ignoredMessages: 0,
      importedMessages: 0,
      importedThreads: 0,
      message,
      ok: false,
      queryUsed: syncState.query,
      syncMode,
      syncedAt: new Date().toISOString(),
    };
  }
}

async function recordGmailSyncEvent(input: {
  actorId: string | null;
  inbox: InboxRecord;
  result: GmailSyncResult;
  success: boolean;
}) {
  await insertActivityLogViaAdmin({
    action: input.success ? "gmail_sync_succeeded" : "gmail_sync_failed",
    actorId: input.actorId,
    actorType: "user",
    description: input.result.message,
    entityId: input.inbox.id,
    entityType: "gmail_sync",
    payload: {
      connectedInboxEmail: input.result.connectedInboxEmail,
      ignoredMessages: input.result.ignoredMessages,
      importedMessages: input.result.importedMessages,
      importedThreads: input.result.importedThreads,
      message: input.result.message,
      ok: input.result.ok,
      queryUsed: input.result.queryUsed ?? null,
      syncMode: input.result.syncMode ?? null,
      syncedAt: input.result.syncedAt ?? null,
    },
    requestId: null,
  });
}

const getCurrentUserGmailInboxStatusInternal = async () => {
  const currentUser = await getCurrentUserContext();

  if (!currentUser?.authUser) {
    return {
      connected: false,
      emailAddress: null,
      error: null,
      inboxId: null,
      lastSyncedAt: null,
    };
  }

  if (!hasSupabaseAdminEnv) {
    return {
      connected: false,
      emailAddress: null,
      error:
        "SUPABASE_SERVICE_ROLE_KEY manquante pour la synchronisation Gmail.",
      inboxId: null,
      lastSyncedAt: null,
    };
  }

  const admin = createSupabaseAdminClient();
  const result = await getSharedActiveGoogleInbox(admin);
  const inbox = result.inbox;

  if (result.error || !inbox) {
    return {
      connected: false,
      emailAddress: null,
      error: result.error,
      inboxId: null,
      lastSyncedAt: null,
    };
  }

    return {
      connected: true,
      emailAddress: inbox.email_address ?? null,
      error: inbox.last_error ? resolveGmailSyncFailureMessage(inbox.last_error) : null,
      inboxId: inbox.id,
      lastSyncedAt: inbox.last_synced_at ?? null,
    };
};

export const getCurrentUserGmailInboxStatus = cache(
  getCurrentUserGmailInboxStatusInternal,
);

async function getSharedActiveGoogleInbox(admin: ReturnType<typeof createSupabaseAdminClient>) {
  const result = await admin
    .from("inboxes")
    .select("*")
    .eq("provider", "google")
    .eq("is_active", true)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return {
    error: result.error?.message ?? null,
    inbox: (result.data as InboxRecord | null) ?? null,
  };
}

async function syncInbox(input: {
  inbox: InboxRecord;
  limit: number;
}): Promise<GmailSyncResult> {
  const admin = createSupabaseAdminClient();
  const accessToken = await ensureActiveAccessToken(input.inbox);
  const env = getGoogleGmailEnv();
  const maxResults = Math.max(1, Math.min(input.limit || env.googleGmailInitialSyncLimit, 100));
  const syncState = buildSyncState({
    lastSyncedAt: input.inbox.last_synced_at ?? null,
    syncCursor: input.inbox.sync_cursor ?? null,
  });
  const syncTimestamp = new Date().toISOString();
  const listResult = await listGmailMessages({
    accessToken,
    maxResults,
    query: syncState.query,
  });
  const messageRefs = listResult.messages ?? [];

  if (messageRefs.length === 0) {
    await admin
      .from("inboxes")
      .update(
        {
          last_error: null,
          last_synced_at: syncTimestamp,
          updated_at: syncTimestamp,
        } as Database["public"]["Tables"]["inboxes"]["Update"] as never,
      )
      .eq("id", input.inbox.id);

    return {
      connectedInboxEmail: input.inbox.email_address ?? null,
      errorCount: 0,
      ignoredMessages: 0,
      importedMessages: 0,
      importedThreads: 0,
      message: "Aucun nouvel email Gmail à importer.",
      ok: true,
      queryUsed: syncState.query,
      syncMode: syncState.mode,
      syncedAt: syncTimestamp,
    };
  }

  const messageIds = messageRefs.map((messageRef) => messageRef.id);
  const externalThreadIds = Array.from(
    new Set(messageRefs.map((messageRef) => messageRef.threadId)),
  );

  const [existingMessagesResult, existingThreadsResult] = await Promise.all([
    admin
      .from("emails")
      .select("external_message_id")
      .eq("inbox_id", input.inbox.id)
      .in("external_message_id", messageIds),
    admin
      .from("email_threads")
      .select("external_thread_id")
      .eq("inbox_id", input.inbox.id)
      .in("external_thread_id", externalThreadIds),
  ]);

  const existingMessageIds = new Set(
    ((existingMessagesResult.data as Array<{ external_message_id: string | null }> | null) ?? [])
      .map((row) => row.external_message_id)
      .filter((value): value is string => Boolean(value)),
  );
  const existingThreadIds = new Set(
    ((existingThreadsResult.data as Array<{ external_thread_id: string | null }> | null) ?? [])
      .map((row) => row.external_thread_id)
      .filter((value): value is string => Boolean(value)),
  );

  const gmailMessages = [] as Awaited<ReturnType<typeof getGmailMessage>>[];

  for (const messageRef of messageRefs) {
    gmailMessages.push(
      await getGmailMessage({
        accessToken,
        messageId: messageRef.id,
      }),
    );
  }

  const parsedMessages = gmailMessages.map((message) =>
    parseGmailMessage(message, input.inbox.email_address ?? null),
  );
  const threadRows = buildInitialThreadRows(parsedMessages, input.inbox.id);
  const threadUpsertResult = await upsertEmailThreads(admin, input.inbox.id, threadRows);

  const threadIdByExternal = new Map(
    (((threadUpsertResult.data as Array<{ external_thread_id: string | null; id: string }> | null) ?? []).map((thread) => [
      thread.external_thread_id as string,
      thread.id as string,
    ])),
  );
  const emailRows = parsedMessages.map((message) => ({
    body_html: message.bodyHtml,
    body_text: message.bodyText,
    cc_emails: message.ccEmails,
    direction: message.direction,
    external_message_id: message.externalMessageId,
    external_thread_id: message.externalThreadId,
    from_email: message.fromEmail,
    from_name: message.fromName,
    inbox_id: input.inbox.id,
    is_processed: false,
    is_unread: message.isUnread,
    labels: message.labels,
    preview_text: message.previewText,
    processing_status: "pending",
    received_at: message.receivedAt,
    status: "pending",
    subject: message.subject,
    synced_at: new Date().toISOString(),
    thread_id: threadIdByExternal.get(message.externalThreadId) ?? null,
    to_emails: message.toEmails,
    updated_at: new Date().toISOString(),
  }));
  const emailUpsertResult = await upsertEmails(admin, input.inbox.id, emailRows);

  const emailIdByExternal = new Map(
    (((emailUpsertResult.data as Array<{ external_message_id: string | null; id: string }> | null) ?? []).map((email) => [
      email.external_message_id as string,
      email.id as string,
    ])),
  );
  const attachmentRows = parsedMessages.flatMap((message) => {
    const emailId = emailIdByExternal.get(message.externalMessageId);

    if (!emailId) {
      return [];
    }

    return message.attachments.map((attachment) => {
      const attachmentFileName = resolveAttachmentFileName(attachment);
      const attachmentStoragePath = buildAttachmentStoragePath({
        externalMessageId: message.externalMessageId,
        fileName: attachmentFileName,
        inboxId: input.inbox.id,
        partId: attachment.partId,
      });

      return {
        bucket_name: "gmail",
        content_id: attachment.contentId,
        content_type: attachment.mimeType,
        created_at: new Date().toISOString(),
        email_id: emailId,
        external_attachment_id: attachment.externalAttachmentId,
        file_name: attachmentFileName,
        file_size: attachment.sizeBytes,
        filename: attachmentFileName,
        is_inline: attachment.isInline,
        mime_type: attachment.mimeType,
        part_id: attachment.partId,
        size_bytes: attachment.sizeBytes,
        storage_bucket: "gmail",
        storage_path: attachmentStoragePath,
        updated_at: new Date().toISOString(),
      };
    });
  });

  if (attachmentRows.length > 0) {
    const attachmentUpsertResult = await upsertEmailAttachmentsWithFallback(
      admin,
      attachmentRows,
    );

    if (attachmentUpsertResult.error) {
      throw new Error(
        `Upsert des pièces jointes Gmail impossible: ${attachmentUpsertResult.error.message}`,
      );
    }
  }

  const localEmailsResult = await admin
    .from("emails")
    .select("external_thread_id,from_email,to_emails,received_at,is_unread,subject,preview_text")
    .eq("inbox_id", input.inbox.id)
    .in("external_thread_id", externalThreadIds);

  if (localEmailsResult.error) {
    throw new Error(
      `Relecture locale des emails Gmail impossible: ${localEmailsResult.error.message}`,
    );
  }

  const threadAggregateRows = buildAggregateThreadRows(
    ((localEmailsResult.data as typeof localEmailsResult.data | null) ?? []) as Pick<
      EmailRecord,
      | "external_thread_id"
      | "from_email"
      | "is_unread"
      | "preview_text"
      | "received_at"
      | "subject"
      | "to_emails"
    >[],
    input.inbox.id,
  );
  await upsertEmailThreads(admin, input.inbox.id, threadAggregateRows);

  const maxReceivedAt = parsedMessages.reduce((latest, message) => {
    return new Date(message.receivedAt).getTime() > latest
      ? new Date(message.receivedAt).getTime()
      : latest;
  }, 0);

  await admin
    .from("inboxes")
    .update(
        {
          last_error: null,
          last_synced_at: syncTimestamp,
          sync_cursor: maxReceivedAt > 0 ? String(maxReceivedAt) : input.inbox.sync_cursor,
          updated_at: syncTimestamp,
        } as Database["public"]["Tables"]["inboxes"]["Update"] as never,
    )
    .eq("id", input.inbox.id);

  const importedMessages = parsedMessages.filter(
    (message) => !existingMessageIds.has(message.externalMessageId),
  ).length;
  const importedThreads = Array.from(
    new Set(parsedMessages.map((message) => message.externalThreadId)),
  ).filter((threadId) => !existingThreadIds.has(threadId)).length;
  const ignoredMessages = parsedMessages.length - importedMessages;

  return {
    connectedInboxEmail: input.inbox.email_address ?? null,
    errorCount: 0,
    ignoredMessages,
    importedMessages,
    importedThreads,
    message: `Synchronisation Gmail terminée: ${importedThreads} thread(s), ${importedMessages} email(s) importé(s), ${ignoredMessages} déjà présent(s).`,
    ok: true,
    queryUsed: syncState.query,
    syncMode: syncState.mode,
    syncedAt: syncTimestamp,
  };
}

async function ensureActiveAccessToken(inbox: InboxRecord) {
  const accessToken = inbox.access_token ?? null;
  const tokenExpiresAt = inbox.token_expires_at
    ? new Date(inbox.token_expires_at)
    : null;
  const tokenStillValid =
    accessToken &&
    tokenExpiresAt &&
    tokenExpiresAt.getTime() - Date.now() > 60_000;

  if (tokenStillValid) {
    return accessToken;
  }

  if (!inbox.refresh_token) {
    throw new Error(
      "Aucun refresh token Google disponible. Reconnecte le compte Gmail.",
    );
  }

  const refreshedToken = await refreshGoogleAccessToken({
    refreshToken: inbox.refresh_token,
  });
  const admin = createSupabaseAdminClient();
  const nextExpiresAt = new Date(
    Date.now() + refreshedToken.expires_in * 1000,
  ).toISOString();

  await admin
    .from("inboxes")
    .update(
      {
        access_token: refreshedToken.access_token,
        scope: refreshedToken.scope ?? inbox.scope ?? null,
        token_expires_at: nextExpiresAt,
        updated_at: new Date().toISOString(),
      } as Database["public"]["Tables"]["inboxes"]["Update"] as never,
    )
    .eq("id", inbox.id);

  return refreshedToken.access_token;
}

function buildSyncState(input: {
  lastSyncedAt: string | null;
  syncCursor: string | null;
}) {
  return {
    mode: resolveSyncMode(input),
    query: buildSyncQuery(input),
  };
}

function resolveSyncMode(input: {
  lastSyncedAt: string | null;
  syncCursor: string | null;
}): GmailSyncMode {
  return input.lastSyncedAt || input.syncCursor ? "incremental" : "initial";
}

function buildSyncQuery(input: {
  lastSyncedAt: string | null;
  syncCursor: string | null;
}) {
  const env = getGoogleGmailEnv();
  const queryParts = [] as string[];

  if (env.googleGmailSyncQuery.trim().length > 0) {
    queryParts.push(env.googleGmailSyncQuery.trim());
  }

  const syncCursorEpoch = input.syncCursor ? Number(input.syncCursor) : null;
  const lastSyncedEpoch = input.lastSyncedAt
    ? new Date(input.lastSyncedAt).getTime()
    : null;
  const referenceEpoch = Math.max(
    0,
    syncCursorEpoch && Number.isFinite(syncCursorEpoch)
      ? syncCursorEpoch
      : lastSyncedEpoch && Number.isFinite(lastSyncedEpoch)
        ? lastSyncedEpoch
        : 0,
  );

  if (referenceEpoch > 0) {
    const afterEpoch = Math.max(0, Math.floor((referenceEpoch - 3_600_000) / 1000));
    queryParts.push(`after:${afterEpoch}`);
  }

  return queryParts.join(" ").trim() || null;
}

function buildInitialThreadRows(
  parsedMessages: Array<{
    externalThreadId: string;
    previewText: string | null;
    receivedAt: string;
    subject: string;
  }>,
  inboxId: string,
) {
  const byThread = new Map<
    string,
    {
      lastMessageAt: string;
      previewText: string | null;
      subject: string;
    }
  >();

  for (const message of parsedMessages) {
    const current = byThread.get(message.externalThreadId);

    if (
      !current ||
      new Date(message.receivedAt).getTime() > new Date(current.lastMessageAt).getTime()
    ) {
      byThread.set(message.externalThreadId, {
        lastMessageAt: message.receivedAt,
        previewText: message.previewText,
        subject: message.subject,
      });
    }
  }

  return Array.from(byThread.entries()).map(([externalThreadId, value]) => ({
    created_at: new Date().toISOString(),
    external_thread_id: externalThreadId,
    inbox_id: inboxId,
    last_message_at: value.lastMessageAt,
    snippet: value.previewText,
    subject: value.subject,
    updated_at: new Date().toISOString(),
  }));
}

function buildAggregateThreadRows(
  localEmails: Pick<
    EmailRecord,
    | "external_thread_id"
    | "from_email"
    | "is_unread"
    | "preview_text"
    | "received_at"
    | "subject"
    | "to_emails"
  >[],
  inboxId: string,
) {
  const byThread = new Map<
    string,
    {
      hasUnread: boolean;
      lastMessageAt: string;
      messageCount: number;
      participants: Set<string>;
      previewText: string | null;
      subject: string | null;
    }
  >();

  for (const email of localEmails) {
    const externalThreadId = email.external_thread_id;

    if (!externalThreadId) {
      continue;
    }

    const current = byThread.get(externalThreadId) ?? {
      hasUnread: false,
      lastMessageAt: email.received_at ?? new Date().toISOString(),
      messageCount: 0,
      participants: new Set<string>(),
      previewText: email.preview_text ?? null,
      subject: email.subject ?? null,
    };

    current.messageCount += 1;
    current.hasUnread = current.hasUnread || Boolean(email.is_unread);

    if (email.from_email) {
      current.participants.add(email.from_email);
    }

    for (const recipient of normalizeRecipientArray(email.to_emails)) {
      current.participants.add(recipient);
    }

    if (
      email.received_at &&
      new Date(email.received_at).getTime() >=
        new Date(current.lastMessageAt).getTime()
    ) {
      current.lastMessageAt = email.received_at;
      current.previewText = email.preview_text ?? current.previewText;
      current.subject = email.subject ?? current.subject;
    }

    byThread.set(externalThreadId, current);
  }

  return Array.from(byThread.entries()).map(([externalThreadId, value]) => ({
    external_thread_id: externalThreadId,
    gmail_label_ids: [],
    has_unread: value.hasUnread,
    inbox_id: inboxId,
    last_message_at: value.lastMessageAt,
    message_count: value.messageCount,
    participants: Array.from(value.participants),
    snippet: value.previewText,
    subject: value.subject,
    updated_at: new Date().toISOString(),
  }));
}

function normalizeRecipientArray(value: EmailRecord["to_emails"]) {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
}

function resolveAttachmentFileName(attachment: {
  externalAttachmentId: string | null;
  filename: string | null;
  mimeType: string | null;
  partId: string | null;
}) {
  const candidate = attachment.filename?.trim();

  if (candidate) {
    return candidate;
  }

  const extension = guessExtensionFromMimeType(attachment.mimeType);
  const suffix =
    attachment.partId?.trim() ||
    attachment.externalAttachmentId?.trim() ||
    "item";

  return extension ? `attachment-${suffix}.${extension}` : `attachment-${suffix}`;
}

function buildAttachmentStoragePath(input: {
  externalMessageId: string;
  fileName: string;
  inboxId: string;
  partId: string | null;
}) {
  const safeFileName = sanitizeStorageSegment(input.fileName);
  const safeInboxId = sanitizeStorageSegment(input.inboxId);
  const safeMessageId = sanitizeStorageSegment(input.externalMessageId);
  const safePartId = sanitizeStorageSegment(input.partId ?? "attachment");

  return `gmail/${safeInboxId}/${safeMessageId}/${safePartId}-${safeFileName}`;
}

function sanitizeStorageSegment(value: string) {
  return value.trim().toLowerCase().replace(/[^a-z0-9._-]+/g, "-");
}

function guessExtensionFromMimeType(mimeType: string | null) {
  const normalized = mimeType?.trim().toLowerCase() ?? "";

  if (normalized === "application/pdf") {
    return "pdf";
  }

  if (normalized === "image/jpeg") {
    return "jpg";
  }

  if (normalized === "image/png") {
    return "png";
  }

  if (normalized === "text/plain") {
    return "txt";
  }

  if (normalized === "text/csv") {
    return "csv";
  }

  if (normalized === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet") {
    return "xlsx";
  }

  if (normalized === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") {
    return "docx";
  }

  return null;
}

function stripEmailStatusFields<T extends Record<string, unknown>>(payload: T): T {
  const nextPayload = {
    ...payload,
  };

  delete nextPayload.processing_status;
  delete nextPayload.status;
  delete nextPayload.triage_status;

  return nextPayload as T;
}

function isEmailProcessingEnumError(error: { message?: string | null } | null) {
  return (error?.message ?? "").toLowerCase().includes("email_processing_status");
}

function isMissingColumnError(error: { message?: string | null } | null) {
  const message = (error?.message ?? "").toLowerCase();

  return message.includes("could not find the") && message.includes("column");
}

function extractMissingColumnName(error: { message?: string | null } | null) {
  const message = error?.message ?? "";
  const match = message.match(/could not find the '([^']+)' column/i);

  return match?.[1] ?? null;
}

function formatSyncStorageError(error: {
  code?: string | null;
  details?: string | null;
  hint?: string | null;
  message?: string | null;
}) {
  return [error.message, error.details, error.hint].filter(Boolean).join(" · ");
}

function stripColumnFromRows<T extends Record<string, unknown>>(rows: T[], column: string) {
  return rows.map((row) => {
    const nextRow = {
      ...row,
    };

    delete nextRow[column];

    return nextRow as T;
  });
}

async function upsertEmailThreads(
  admin: ReturnType<typeof createSupabaseAdminClient>,
  inboxId: string,
  rows: Database["public"]["Tables"]["email_threads"]["Insert"][],
) {
  const externalThreadIds = Array.from(
    new Set(
      rows
        .map((row) => row.external_thread_id)
        .filter((value): value is string => typeof value === "string" && value.length > 0),
    ),
  );

  if (externalThreadIds.length === 0) {
    return { data: [] as Array<{ external_thread_id: string | null; id: string }> };
  }

  const existingResult = await admin
    .from("email_threads")
    .select("id,external_thread_id")
    .eq("inbox_id", inboxId)
    .in("external_thread_id", externalThreadIds);

  if (existingResult.error) {
    throw new Error(
      `Lecture des threads Gmail existants impossible: ${formatSyncStorageError(existingResult.error)}`,
    );
  }

  const existingByExternal = new Map(
    (
      (existingResult.data as Array<{ external_thread_id: string | null; id: string }> | null) ?? []
    )
      .filter(
        (thread): thread is { external_thread_id: string; id: string } =>
          typeof thread.external_thread_id === "string" && thread.external_thread_id.length > 0,
      )
      .map((thread) => [thread.external_thread_id, thread.id]),
  );

  const rowsToInsert = rows.filter(
    (row) =>
      typeof row.external_thread_id === "string" &&
      row.external_thread_id.length > 0 &&
      !existingByExternal.has(row.external_thread_id),
  );
  const rowsToUpdate = rows.filter(
    (row) =>
      typeof row.external_thread_id === "string" &&
      row.external_thread_id.length > 0 &&
      existingByExternal.has(row.external_thread_id),
  );

  if (rowsToInsert.length > 0) {
    const insertResult = await insertEmailThreadsWithFallback(admin, rowsToInsert);

    if (insertResult.error) {
      throw new Error(
        `Insertion des threads Gmail impossible: ${formatSyncStorageError(insertResult.error)}`,
      );
    }
  }

  const updateResults = await Promise.all(
    rowsToUpdate.map(async (row) => {
      const threadId = existingByExternal.get(row.external_thread_id as string);

      if (!threadId) {
        return null;
      }

      const updatePayload = {
        ...row,
      };
      delete updatePayload.created_at;
      const result = await updateEmailThreadWithFallback(
        admin,
        threadId,
        updatePayload,
      );

      if (result.error) {
        throw new Error(
          `Mise a jour d'un thread Gmail impossible: ${formatSyncStorageError(result.error)}`,
        );
      }

      return threadId;
    }),
  );

  void updateResults;

  const finalResult = await admin
    .from("email_threads")
    .select("id,external_thread_id")
    .eq("inbox_id", inboxId)
    .in("external_thread_id", externalThreadIds);

  if (finalResult.error) {
    throw new Error(
      `Relecture des threads Gmail impossible: ${formatSyncStorageError(finalResult.error)}`,
    );
  }

  return {
    data:
      (finalResult.data as Array<{ external_thread_id: string | null; id: string }> | null) ?? [],
  };
}

async function upsertEmails(
  admin: ReturnType<typeof createSupabaseAdminClient>,
  inboxId: string,
  rows: Database["public"]["Tables"]["emails"]["Insert"][],
) {
  const externalMessageIds = Array.from(
    new Set(
      rows
        .map((row) => row.external_message_id)
        .filter((value): value is string => typeof value === "string" && value.length > 0),
    ),
  );

  if (externalMessageIds.length === 0) {
    return {
      data: [] as Array<{
        external_message_id: string | null;
        external_thread_id: string | null;
        id: string;
      }>,
    };
  }

  const existingResult = await admin
    .from("emails")
    .select("id,external_message_id")
    .eq("inbox_id", inboxId)
    .in("external_message_id", externalMessageIds);

  if (existingResult.error) {
    throw new Error(
      `Lecture des emails Gmail existants impossible: ${existingResult.error.message}`,
    );
  }

  const existingByExternal = new Map(
    (
      (existingResult.data as Array<{ external_message_id: string | null; id: string }> | null) ?? []
    )
      .filter(
        (email): email is { external_message_id: string; id: string } =>
          typeof email.external_message_id === "string" && email.external_message_id.length > 0,
      )
      .map((email) => [email.external_message_id, email.id]),
  );

  const rowsToInsert = rows.filter(
    (row) =>
      typeof row.external_message_id === "string" &&
      row.external_message_id.length > 0 &&
      !existingByExternal.has(row.external_message_id),
  );
  const rowsToUpdate = rows.filter(
    (row) =>
      typeof row.external_message_id === "string" &&
      row.external_message_id.length > 0 &&
      existingByExternal.has(row.external_message_id),
  );

  if (rowsToInsert.length > 0) {
    const insertResult = await insertEmailsWithFallback(admin, rowsToInsert);

    if (insertResult.error) {
      throw new Error(
        `Insertion des emails Gmail impossible: ${insertResult.error.message}`,
      );
    }
  }

  const updateResults = await Promise.all(
    rowsToUpdate.map(async (row) => {
      const emailId = existingByExternal.get(row.external_message_id as string);

      if (!emailId) {
        return null;
      }

      const result = await updateEmailWithFallback(admin, emailId, row);

      if (result.error) {
        throw new Error(
          `Mise a jour d'un email Gmail impossible: ${result.error.message}`,
        );
      }

      return emailId;
    }),
  );

  void updateResults;

  const finalResult = await admin
    .from("emails")
    .select("id,external_message_id,external_thread_id")
    .eq("inbox_id", inboxId)
    .in("external_message_id", externalMessageIds);

  if (finalResult.error) {
    throw new Error(
      `Relecture des emails Gmail impossible: ${finalResult.error.message}`,
    );
  }

  return {
    data:
      (finalResult.data as Array<{
        external_message_id: string | null;
        external_thread_id: string | null;
        id: string;
      }> | null) ?? [],
  };
}

async function insertEmailsWithFallback(
  admin: ReturnType<typeof createSupabaseAdminClient>,
  rows: Database["public"]["Tables"]["emails"]["Insert"][],
) {
  const firstAttempt = await admin
    .from("emails")
    .insert(rows as never[])
    .select("id,external_message_id,external_thread_id");

  if (!firstAttempt.error || !isEmailProcessingEnumError(firstAttempt.error)) {
    return firstAttempt;
  }

  return admin
    .from("emails")
    .insert(rows.map((row) => stripEmailStatusFields(row)) as never[])
    .select("id,external_message_id,external_thread_id");
}

async function insertEmailThreadsWithFallback(
  admin: ReturnType<typeof createSupabaseAdminClient>,
  rows: Database["public"]["Tables"]["email_threads"]["Insert"][],
) {
  let currentRows = rows;

  while (true) {
    const result = await admin
      .from("email_threads")
      .insert(currentRows as never[])
      .select("id,external_thread_id");

    if (!result.error) {
      return result;
    }

    if (!isMissingColumnError(result.error)) {
      return result;
    }

    const missingColumn = extractMissingColumnName(result.error);

    if (!missingColumn || !currentRows.some((row) => missingColumn in row)) {
      return result;
    }

    currentRows = stripColumnFromRows(currentRows, missingColumn);
  }
}

async function updateEmailThreadWithFallback(
  admin: ReturnType<typeof createSupabaseAdminClient>,
  threadId: string,
  row: Database["public"]["Tables"]["email_threads"]["Insert"],
) {
  let currentRow = row as Record<string, unknown>;

  while (true) {
    const result = await admin
      .from("email_threads")
      .update(currentRow as never)
      .eq("id", threadId);

    if (!result.error) {
      return result;
    }

    if (!isMissingColumnError(result.error)) {
      return result;
    }

    const missingColumn = extractMissingColumnName(result.error);

    if (!missingColumn || !(missingColumn in currentRow)) {
      return result;
    }

    currentRow = stripColumnFromRows([currentRow], missingColumn)[0] ?? currentRow;
  }
}

async function updateEmailWithFallback(
  admin: ReturnType<typeof createSupabaseAdminClient>,
  emailId: string,
  row: Database["public"]["Tables"]["emails"]["Insert"],
) {
  const firstAttempt = await admin
    .from("emails")
    .update(row as never)
    .eq("id", emailId);

  if (!firstAttempt.error || !isEmailProcessingEnumError(firstAttempt.error)) {
    return firstAttempt;
  }

  return admin
    .from("emails")
    .update(stripEmailStatusFields(row) as never)
    .eq("id", emailId);
}

async function upsertEmailAttachmentsWithFallback(
  admin: ReturnType<typeof createSupabaseAdminClient>,
  rows: Array<Record<string, unknown>>,
) {
  let currentRows = rows;

  while (true) {
    const result = await admin
      .from("email_attachments")
      .upsert(currentRows as never[], {
        onConflict: "email_id,external_attachment_id",
      });

    if (!result.error) {
      return result;
    }

    if (!isMissingColumnError(result.error)) {
      return result;
    }

    const missingColumn = extractMissingColumnName(result.error);

    if (!missingColumn) {
      return result;
    }

    const hasColumn = currentRows.some((row) => missingColumn in row);

    if (!hasColumn) {
      return result;
    }

    currentRows = stripColumnFromRows(currentRows, missingColumn);
  }
}
