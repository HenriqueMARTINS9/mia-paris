import { AlertTriangle } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { getGmailSyncErrorState } from "@/features/emails/lib/gmail-sync-errors";

export function GmailSyncErrorState({
  message,
}: Readonly<{
  message: string | null | undefined;
}>) {
  const state = getGmailSyncErrorState(message);

  if (!state) {
    return null;
  }

  return (
    <Card className="border-destructive/20 bg-destructive/5">
      <CardContent className="flex items-start gap-3 p-4">
        <div className="mt-0.5 rounded-full bg-destructive/10 p-2 text-destructive">
          <AlertTriangle className="h-4 w-4" />
        </div>
        <div className="space-y-1">
          <p className="font-semibold text-destructive">{state.title}</p>
          <p className="text-sm leading-6 text-foreground/80">{state.description}</p>
        </div>
      </CardContent>
    </Card>
  );
}
