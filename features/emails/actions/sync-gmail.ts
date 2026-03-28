"use server";

import { revalidatePath } from "next/cache";

import { getGoogleGmailEnv, hasGoogleGmailEnv } from "@/lib/google/env";
import type { GmailSyncResult } from "@/features/emails/types";
import { syncLatestGmailMessagesForCurrentUser } from "@/features/emails/lib/gmail-sync";

export async function syncGmailInboxAction(limit?: number): Promise<GmailSyncResult> {
  if (!hasGoogleGmailEnv) {
    return {
      connectedInboxEmail: null,
      ignoredMessages: 0,
      importedMessages: 0,
      importedThreads: 0,
      message:
        "Configuration Gmail absente. Renseigne GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET et GOOGLE_GMAIL_REDIRECT_URI.",
      ok: false,
    };
  }

  const env = getGoogleGmailEnv();
  const result = await syncLatestGmailMessagesForCurrentUser(
    limit ?? env.googleGmailInitialSyncLimit,
  );

  if (result.ok) {
    revalidatePath("/emails");
    revalidatePath("/", "layout");
  }

  return result;
}
