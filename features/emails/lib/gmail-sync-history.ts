import "server-only";

import { cache } from "react";

import type { GmailSyncSummary } from "@/features/dashboard/types";
import type { GmailSyncMode } from "@/features/emails/types";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  isMissingSupabaseResourceError,
  supabaseRestSelectList,
} from "@/lib/supabase/rest";
import { hasSupabaseAdminEnv } from "@/lib/supabase/env";
import {
  readBoolean,
  readNumber,
  readObject,
  readString,
} from "@/lib/record-helpers";
import type { Database } from "@/lib/supabase/database.types";
import type { ActivityLogRecord, GmailSyncRunRecord } from "@/types/crm";

const getGmailSyncSummariesInternal = async (input: {
  inboxId: string | null;
  limit?: number;
}): Promise<{
  error: string | null;
  runs: GmailSyncSummary[];
}> => {
  if (!input.inboxId) {
    return {
      error: null,
      runs: [],
    };
  }

  const limit = input.limit ?? 6;
  const runsResult = await supabaseRestSelectList<GmailSyncRunRecord>(
    "gmail_sync_runs",
    {
      inbox_id: `eq.${input.inboxId}`,
      limit,
      order: "created_at.desc.nullslast",
      select: "*",
    },
  );

  if (!runsResult.error) {
    return {
      error: null,
      runs: (runsResult.data ?? []).map(mapSyncRunRecord),
    };
  }

  if (!isMissingSupabaseResourceError(runsResult.rawError)) {
    return {
      error: runsResult.error,
      runs: [],
    };
  }

  const legacyResult = await supabaseRestSelectList<ActivityLogRecord>(
    "activity_logs",
    {
      entity_id: `eq.${input.inboxId}`,
      entity_type: "eq.gmail_sync",
      limit,
      order: "created_at.desc.nullslast",
      select: "*",
    },
  );

  if (legacyResult.error && !isMissingSupabaseResourceError(legacyResult.rawError)) {
    return {
      error: legacyResult.error,
      runs: [],
    };
  }

  return {
    error: null,
    runs: (legacyResult.data ?? []).map(mapLegacySyncLog),
  };
};

export const getGmailSyncSummaries = cache(getGmailSyncSummariesInternal);

export async function recordGmailSyncRun(input: {
  errorCount: number;
  errorMessage: string | null;
  ignoredMessages: number;
  importedMessages: number;
  importedThreads: number;
  inboxId: string | null;
  message: string;
  metadata?: Record<string, unknown> | null;
  ok: boolean;
  queryUsed: string | null;
  syncMode: GmailSyncMode;
  triggeredByUserId: string | null;
}) {
  if (!hasSupabaseAdminEnv || !input.inboxId) {
    return {
      error: null,
      ok: false,
    };
  }

  const admin = createSupabaseAdminClient();
  const payload: Database["public"]["Tables"]["gmail_sync_runs"]["Insert"] = {
    created_at: new Date().toISOString(),
    error_count: input.errorCount,
    error_message: input.errorMessage,
    finished_at: new Date().toISOString(),
    ignored_messages: input.ignoredMessages,
    imported_messages: input.importedMessages,
    imported_threads: input.importedThreads,
    inbox_id: input.inboxId,
    message: input.message,
    metadata:
      (input.metadata ?? null) as Database["public"]["Tables"]["gmail_sync_runs"]["Insert"]["metadata"],
    ok: input.ok,
    query_used: input.queryUsed,
    started_at: new Date().toISOString(),
    sync_mode: input.syncMode,
    triggered_by_user_id: input.triggeredByUserId,
  };

  const { error } = await admin
    .from("gmail_sync_runs")
    .insert(payload as never);

  if (error) {
    return {
      error: error.message,
      ok: false,
    };
  }

  return {
    error: null,
    ok: true,
  };
}

function mapSyncRunRecord(run: GmailSyncRunRecord): GmailSyncSummary {
  const metadata = readObject(run, ["metadata"]);

  return {
    connectedInboxEmail:
      readString(metadata, ["connectedInboxEmail", "connected_inbox_email"]) ??
      null,
    createdAt:
      readString(run, ["finished_at", "created_at", "started_at"]) ??
      new Date().toISOString(),
    errorCount: readNumber(run, ["error_count"]) ?? 0,
    errorMessage:
      readString(run, ["error_message"]) ??
      readString(run, ["message"]) ??
      null,
    id: run.id,
    ignoredMessages: readNumber(run, ["ignored_messages"]) ?? 0,
    importedMessages: readNumber(run, ["imported_messages"]) ?? 0,
    importedThreads: readNumber(run, ["imported_threads"]) ?? 0,
    message: readString(run, ["message"]) ?? null,
    ok: readBoolean(run, ["ok"]) ?? false,
    queryUsed: readString(run, ["query_used"]) ?? null,
    syncMode:
      (readString(run, ["sync_mode"]) as "incremental" | "initial" | null) ??
      null,
  };
}

function mapLegacySyncLog(log: ActivityLogRecord): GmailSyncSummary {
  const payload =
    readObject(log, ["payload", "metadata"]) ??
    readObject(readObject(log, ["payload"]), ["payload", "metadata"]);

  return {
    connectedInboxEmail:
      readString(payload, ["connectedInboxEmail", "connected_inbox_email"]) ??
      null,
    createdAt: readString(log, ["created_at"]) ?? new Date().toISOString(),
    errorCount:
      readNumber(payload, ["errorCount", "error_count"]) ??
      (matchesAction(log, "gmail_sync_failed") ? 1 : 0),
    errorMessage:
      readString(payload, ["errorMessage", "message"]) ??
      (matchesAction(log, "gmail_sync_failed")
        ? readString(log, ["description"])
        : null),
    id: log.id,
    ignoredMessages:
      readNumber(payload, ["ignoredMessages", "ignored_messages"]) ?? 0,
    importedMessages:
      readNumber(payload, ["importedMessages", "imported_messages"]) ?? 0,
    importedThreads:
      readNumber(payload, ["importedThreads", "imported_threads"]) ?? 0,
    message:
      readString(payload, ["message"]) ?? readString(log, ["description"]) ?? null,
    ok: !matchesAction(log, "gmail_sync_failed"),
    queryUsed:
      readString(payload, ["queryUsed", "query_used"]) ?? null,
    syncMode:
      (readString(payload, ["syncMode", "sync_mode"]) as
        | "incremental"
        | "initial"
        | null) ?? null,
  };
}

function matchesAction(log: ActivityLogRecord, expected: string) {
  const action = readString(log, ["action", "action_type"]);
  return action === expected;
}
