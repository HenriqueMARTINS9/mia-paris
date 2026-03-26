"use client";

import { FolderPlus, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { EmailListItem } from "@/features/emails/types";

interface RequestCreationActionsProps {
  email: EmailListItem;
  isPending: boolean;
  onCreateRequest: () => void;
}

export function RequestCreationActions({
  email,
  isPending,
  onCreateRequest,
}: Readonly<RequestCreationActionsProps>) {
  return (
    <Card>
      <CardContent className="flex flex-col gap-4 p-5 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-sm font-semibold">Créer une demande depuis cet email</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Le dossier sera prérempli avec le sujet, le type détecté, la priorité et le résumé IA si disponibles.
          </p>
          <p className="mt-2 text-xs uppercase tracking-[0.16em] text-muted-foreground">
            {email.classification.suggestedFields.requestType ?? "Type à confirmer"} ·{" "}
            {email.classification.suggestedFields.priority}
          </p>
        </div>
        <Button onClick={onCreateRequest} disabled={isPending}>
          {isPending ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Création
            </>
          ) : (
            <>
              <FolderPlus className="h-4 w-4" />
              Créer la demande
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
