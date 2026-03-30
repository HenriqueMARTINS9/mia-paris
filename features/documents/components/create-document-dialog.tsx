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
import { DocumentTypeSelect } from "@/features/documents/components/document-type-select";
import { RelatedEntityPicker } from "@/features/documents/components/related-entity-picker";
import { createDocumentAction } from "@/features/documents/actions/create-document";
import { useAuthorization } from "@/features/auth/components/auth-role-provider";
import type {
  DocumentFormOptions,
  DocumentType,
  RelatedEntitySelection,
} from "@/features/documents/types";

export function CreateDocumentDialog({
  defaultModelId = null,
  defaultOrderId = null,
  defaultProductionId = null,
  defaultRequestId = null,
  options,
  optionsError = null,
}: Readonly<{
  defaultModelId?: string | null;
  defaultOrderId?: string | null;
  defaultProductionId?: string | null;
  defaultRequestId?: string | null;
  options: DocumentFormOptions;
  optionsError?: string | null;
}>) {
  const router = useRouter();
  const { can } = useAuthorization();
  const [open, setOpen] = useState(false);
  const [documentType, setDocumentType] = useState<DocumentType>("other");
  const [title, setTitle] = useState("");
  const [externalReference, setExternalReference] = useState("");
  const [selection, setSelection] = useState<RelatedEntitySelection>({
    modelId: defaultModelId,
    orderId: defaultOrderId,
    productionId: defaultProductionId,
    requestId: defaultRequestId,
  });
  const [isPending, startTransition] = useTransition();

  if (!can("documents.create")) {
    return null;
  }

  function handleSubmit() {
    startTransition(async () => {
      const result = await createDocumentAction({
        documentType,
        externalReference: externalReference || null,
        modelId: selection.modelId,
        orderId: selection.orderId,
        productionId: selection.productionId,
        requestId: selection.requestId,
        title,
      });

      if (result.ok) {
        toast.success(result.message);
        setTitle("");
        setExternalReference("");
        setOpen(false);
        router.refresh();
        return;
      }

      toast.error(result.message);
    });
  }

  return (
    <>
      <Button variant="outline" onClick={() => setOpen(true)}>
        <FilePlus2 className="h-4 w-4" />
        Nouveau document
      </Button>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent className="sm:max-w-2xl">
          <SheetHeader>
            <SheetTitle>Créer un document manuel</SheetTitle>
            <SheetDescription>
              Enregistre un document métier même si le fichier n’est pas encore versé dans Storage.
            </SheetDescription>
          </SheetHeader>

          <div className="mt-6 grid gap-4">
            <Input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Ex. Price sheet capsule octobre"
              disabled={isPending}
            />

            <DocumentTypeSelect
              value={documentType}
              onChange={setDocumentType}
            />

            <Input
              value={externalReference}
              onChange={(event) => setExternalReference(event.target.value)}
              placeholder="Lien externe ou référence temporaire"
              disabled={isPending}
            />

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
                  "Créer le document"
                )}
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
