import { GmailSyncHistoryPanel } from "@/features/dashboard/components/gmail-sync-history-panel";
import type { GmailSyncSummary } from "@/features/dashboard/types";

export function GmailSyncHistoryCard({
  latestSyncs,
}: Readonly<{
  latestSyncs: GmailSyncSummary[];
}>) {
  return <GmailSyncHistoryPanel latestSyncs={latestSyncs} />;
}
