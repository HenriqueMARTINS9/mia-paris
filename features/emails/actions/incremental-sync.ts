"use server";

import { incrementalGmailSyncAction } from "@/features/emails/actions/sync-gmail";

export async function IncrementalSyncAction(limit?: number) {
  return incrementalGmailSyncAction(limit);
}
