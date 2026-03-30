"use client";

import { useTransition } from "react";
import { CheckCircle2, Download, WifiOff } from "lucide-react";
import { toast } from "sonner";

import { usePwa } from "@/components/pwa/pwa-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export function PwaInstallButton({
  compact = false,
}: Readonly<{
  compact?: boolean;
}>) {
  const { canInstall, isInstalled, isOffline, promptInstall } = usePwa();
  const [isPending, startTransition] = useTransition();

  function handleInstall() {
    startTransition(async () => {
      const accepted = await promptInstall();

      if (accepted) {
        toast.success("L’application est prête à être installée.");
        return;
      }

      toast.message("Installation annulée ou non disponible.");
    });
  }

  if (!canInstall && !isInstalled && !isOffline) {
    return null;
  }

  return (
    <div className="flex items-center gap-2">
      {isOffline ? (
        <Badge
          variant="outline"
          className="border-amber-500/25 bg-amber-50 text-amber-900"
        >
          <WifiOff className="h-3.5 w-3.5" />
          {!compact ? "Hors ligne" : null}
        </Badge>
      ) : null}

      {isInstalled ? (
        <Badge
          variant="outline"
          className="border-[rgba(55,106,79,0.16)] bg-[rgba(55,106,79,0.08)] text-[var(--success)]"
        >
          <CheckCircle2 className="h-3.5 w-3.5" />
          {!compact ? "Installée" : null}
        </Badge>
      ) : null}

      {canInstall ? (
        <Button
          type="button"
          variant="outline"
          size={compact ? "icon" : "default"}
          className={compact ? "h-10 w-10 rounded-2xl" : undefined}
          onClick={handleInstall}
          disabled={isPending}
        >
          <Download className="h-4 w-4" />
          {!compact ? "Installer" : null}
        </Button>
      ) : null}
    </div>
  );
}
