"use client";

import { useEffect, useMemo, useRef, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { useAuthorization } from "@/features/auth/components/auth-role-provider";
import { incrementalGmailSyncAction } from "@/features/emails/actions/sync-gmail";
import type { GmailInboxStatus } from "@/features/emails/types";

const AUTO_SYNC_STALE_MS = 8 * 60 * 1000;
const AUTO_SYNC_THROTTLE_MS = 2 * 60 * 1000;

export function GmailAutoSyncBridge({
  gmailInbox,
  limit = 25,
}: Readonly<{
  gmailInbox: GmailInboxStatus;
  limit?: number;
}>) {
  const router = useRouter();
  const { can } = useAuthorization();
  const canSyncEmails = can("emails.sync");
  const [isPending, startTransition] = useTransition();
  const lastAttemptKeyRef = useRef<string | null>(null);
  const inboxKey = useMemo(
    () =>
      gmailInbox.inboxId
        ? `mia:gmail-auto-sync:${gmailInbox.inboxId}`
        : null,
    [gmailInbox.inboxId],
  );

  useEffect(() => {
    if (!canSyncEmails || !gmailInbox.connected || !gmailInbox.inboxId || !inboxKey) {
      return;
    }

    const lastSyncedAt = gmailInbox.lastSyncedAt
      ? new Date(gmailInbox.lastSyncedAt).getTime()
      : null;

    if (
      lastSyncedAt !== null &&
      Number.isFinite(lastSyncedAt) &&
      Date.now() - lastSyncedAt < AUTO_SYNC_STALE_MS
    ) {
      return;
    }

    const lastAttemptAt = Number(window.localStorage.getItem(inboxKey) ?? "0");

    if (Date.now() - lastAttemptAt < AUTO_SYNC_THROTTLE_MS) {
      return;
    }

    if (lastAttemptKeyRef.current === inboxKey || isPending) {
      return;
    }

    window.localStorage.setItem(inboxKey, String(Date.now()));
    lastAttemptKeyRef.current = inboxKey;

    startTransition(async () => {
      const result = await incrementalGmailSyncAction(limit);

      if (!result.ok) {
        toast.error(result.message);
        return;
      }

      router.refresh();
    });
  }, [
    canSyncEmails,
    gmailInbox.connected,
    gmailInbox.inboxId,
    gmailInbox.lastSyncedAt,
    inboxKey,
    isPending,
    limit,
    router,
  ]);

  return null;
}
