"use client";

import Link from "next/link";
import { ArrowUpRight, FolderPlus, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

interface RequestCreationActionsProps {
  canCreate: boolean;
  currentPriority: string;
  currentRequestType: string | null;
  linkedRequestId: string | null;
  isPending: boolean;
  onCreateRequest: () => void;
}

export function RequestCreationActions({
  canCreate,
  currentPriority,
  currentRequestType,
  linkedRequestId,
  isPending,
  onCreateRequest,
}: Readonly<RequestCreationActionsProps>) {
  return (
    <Card>
      <CardContent className="flex flex-col gap-4 p-5 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-sm font-semibold">Créer une demande depuis cet email</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Le dossier sera prérempli avec le sujet, le type validé, la priorité, le résumé et les champs métier corrigés.
          </p>
          <p className="mt-2 text-xs uppercase tracking-[0.16em] text-muted-foreground">
            {currentRequestType ?? "Type à confirmer"} · {currentPriority}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {linkedRequestId ? (
            <Button asChild variant="outline">
              <Link href={`/requests/${linkedRequestId}`}>
                Ouvrir la demande
                <ArrowUpRight className="h-4 w-4" />
              </Link>
            </Button>
          ) : null}

          <Button onClick={onCreateRequest} disabled={isPending || !canCreate}>
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
        </div>
      </CardContent>
    </Card>
  );
}
