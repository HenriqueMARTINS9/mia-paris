"use client";

import { useState, useTransition } from "react";
import { Loader2, NotebookPen } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import type { RequestNoteField } from "@/features/requests/detail-types";
import { appendRequestNoteAction } from "@/features/requests/actions/update-request";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

interface RequestNoteFormProps {
  existingNote: string | null;
  noteField: RequestNoteField | null;
  requestId: string;
}

export function RequestNoteForm({
  existingNote,
  noteField,
  requestId,
}: Readonly<RequestNoteFormProps>) {
  const router = useRouter();
  const [note, setNote] = useState("");
  const [isPending, startTransition] = useTransition();

  function handleSubmit() {
    startTransition(async () => {
      const result = await appendRequestNoteAction({
        note,
        noteField,
        requestId,
      });

      if (result.ok) {
        toast.success(result.message);
        setNote("");
        router.refresh();
        return;
      }

      toast.error(result.message);
    });
  }

  return (
    <div className="rounded-3xl border border-white/70 bg-white/60 p-4">
      <div className="flex items-center gap-2">
        <NotebookPen className="h-4 w-4 text-muted-foreground" />
        <p className="font-semibold">Notes métier</p>
      </div>

      <div className="mt-4 rounded-2xl border border-white/70 bg-white/70 p-3">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
          Dernière note enregistrée
        </p>
        <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-foreground/80">
          {existingNote ?? "Aucune note persistée sur la table requests pour le moment."}
        </p>
      </div>

      <div className="mt-4 space-y-3">
        <Textarea
          value={note}
          onChange={(event) => setNote(event.target.value)}
          placeholder="Ajouter une note de cadrage, un arbitrage client ou une consigne interne."
          disabled={isPending || noteField === null}
        />

        {noteField === null ? (
          <p className="text-sm text-muted-foreground">
            Aucun champ note compatible n&apos;a été détecté sur `requests`
            (`notes`, `internal_notes` ou `note`).
          </p>
        ) : null}

        <div className="flex justify-end">
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={isPending || noteField === null || note.trim().length === 0}
          >
            {isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Enregistrement
              </>
            ) : (
              "Ajouter une note"
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
