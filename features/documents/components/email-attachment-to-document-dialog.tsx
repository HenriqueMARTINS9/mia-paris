"use client";

import { useState, useTransition } from "react";
import { FilePlus2, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { createDocumentFromAttachmentAction } from "@/features/documents/actions/create-document-from-attachment";
import { DocumentTypeSelect } from "@/features/documents/components/document-type-select";
import { RelatedEntityPicker } from "@/features/documents/components/related-entity-picker";
import type {
  DocumentFormOptions,
  DocumentType,
  RelatedEntitySelection,
} from "@/features/documents/types";
import type { EmailAttachmentListItem } from "@/features/emails/types";

interface EmailAttachmentToDocumentDialogProps {
  attachment: EmailAttachmentListItem;
  defaultModelId?: string | null;
  defaultRequestId?: string | null;
  options: DocumentFormOptions;
  optionsError?: string | null;
}

export function EmailAttachmentToDocumentDialog({
  attachment,
  defaultModelId = null,
  defaultRequestId = null,
  options,
  optionsError = null,
}: Readonly<EmailAttachmentToDocumentDialogProps>) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [documentType, setDocumentType] = useState<DocumentType>("other");
  const [title, setTitle] = useState(attachment.fileName);
  const [selection, setSelection] = useState<RelatedEntitySelection>({
    modelId: defaultModelId,
    orderId: null,
    productionId: null,
    requestId: defaultRequestId,
  });

  function handleSubmit() {
    startTransition(async () => {
      const result = await createDocumentFromAttachmentAction({
        attachmentId: attachment.id,
        documentType,
        modelId: selection.modelId,
        orderId: selection.orderId,
        productionId: selection.productionId,
        requestId: selection.requestId,
        title,
      });

      if (result.ok) {
        toast.success(result.message);
        setOpen(false);
        router.refresh();
        return;
      }

      toast.error(result.message);
    });
  }

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => setOpen(true)}
      >
        <FilePlus2 className="h-4 w-4" />
        Créer un document métier
      </Button>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent className="sm:max-w-2xl">
          <SheetHeader>
            <SheetTitle>Créer un document métier</SheetTitle>
            <SheetDescription>
              Cette ligne `documents` pourra être rattachée au bon dossier même si le
              fichier n&apos;est pas encore copié dans Supabase Storage.
            </SheetDescription>
          </SheetHeader>

          <div className="mt-6 grid gap-4">
            <div className="rounded-2xl border border-white/70 bg-white/65 p-4">
              <p className="text-sm font-semibold">{attachment.fileName}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {attachment.mimeType ?? "Type inconnu"}
                {attachment.sizeBytes !== null ? ` · ${attachment.sizeBytes} bytes` : ""}
              </p>
            </div>

            <div className="grid gap-2">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                Intitulé document
              </p>
              <Input
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                disabled={isPending}
              />
            </div>

            <div className="grid gap-2">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                Type de document
              </p>
              <DocumentTypeSelect value={documentType} onChange={setDocumentType} />
            </div>

            <RelatedEntityPicker
              value={selection}
              onChange={setSelection}
              options={options}
              disabled={isPending}
            />

            {optionsError ? (
              <p className="text-sm text-muted-foreground">{optionsError}</p>
            ) : null}

            <div className="flex justify-end">
              <Button
                type="button"
                onClick={handleSubmit}
                disabled={isPending || title.trim().length < 3}
              >
                {isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Création
                  </>
                ) : (
                  <>
                    <FilePlus2 className="h-4 w-4" />
                    Créer le document
                  </>
                )}
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
