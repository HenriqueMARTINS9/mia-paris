"use client";

import { useState, useTransition } from "react";
import { Loader2, ShieldCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { useAuthorization } from "@/features/auth/components/auth-role-provider";
import { createValidationAction } from "@/features/validations/actions/create-validation";
import type { ValidationFormOptions } from "@/features/validations/types";

export function CreateValidationDialog({
  defaultModelId = null,
  defaultOrderId = null,
  defaultRequestId = null,
  options,
  optionsError = null,
}: Readonly<{
  defaultModelId?: string | null;
  defaultOrderId?: string | null;
  defaultRequestId?: string | null;
  options: ValidationFormOptions;
  optionsError?: string | null;
}>) {
  const router = useRouter();
  const { can } = useAuthorization();
  const [open, setOpen] = useState(false);
  const [validationType, setValidationType] = useState("trim_validation");
  const [requestId, setRequestId] = useState(defaultRequestId ?? "");
  const [orderId, setOrderId] = useState(defaultOrderId ?? "");
  const [modelId, setModelId] = useState(defaultModelId ?? "");
  const [validatedByUserId, setValidatedByUserId] = useState("");
  const [notes, setNotes] = useState("");
  const [isPending, startTransition] = useTransition();

  if (!can("validations.create")) {
    return null;
  }

  function handleSubmit() {
    startTransition(async () => {
      const result = await createValidationAction({
        modelId: modelId || null,
        notes: notes || null,
        orderId: orderId || null,
        requestId: requestId || null,
        validationType,
        validatedByUserId: validatedByUserId || null,
      });

      if (result.ok) {
        toast.success(result.message);
        setNotes("");
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
        <ShieldCheck className="h-4 w-4" />
        Nouvelle validation
      </Button>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent className="sm:max-w-2xl">
          <SheetHeader>
            <SheetTitle>Créer une validation</SheetTitle>
            <SheetDescription>
              Ouvre un point de validation manuel quand un arbitrage client ou interne doit être tracé.
            </SheetDescription>
          </SheetHeader>

          <div className="mt-6 grid gap-4">
            <Input
              value={validationType}
              onChange={(event) => setValidationType(event.target.value)}
              placeholder="Ex. proto_validation, color_approval, trim_validation"
              disabled={isPending}
            />

            <div className="grid gap-3 md:grid-cols-2">
              <Select
                value={requestId}
                onChange={(event) => setRequestId(event.target.value)}
                disabled={isPending}
              >
                <option value="">Sans demande liée</option>
                {options.productionOptions.requests.map((request) => (
                  <option key={request.id} value={request.id}>
                    {request.label}
                  </option>
                ))}
              </Select>
              <Select
                value={orderId}
                onChange={(event) => setOrderId(event.target.value)}
                disabled={isPending}
              >
                <option value="">Sans commande liée</option>
                {options.productionOptions.orders.map((order) => (
                  <option key={order.id} value={order.id}>
                    {order.label}
                  </option>
                ))}
              </Select>
              <Select
                value={modelId}
                onChange={(event) => setModelId(event.target.value)}
                disabled={isPending}
              >
                <option value="">Sans modèle lié</option>
                {options.productionOptions.models.map((model) => (
                  <option key={model.id} value={model.id}>
                    {model.label}
                  </option>
                ))}
              </Select>
              <Select
                value={validatedByUserId}
                onChange={(event) => setValidatedByUserId(event.target.value)}
                disabled={isPending}
              >
                <option value="">Responsable non renseigné</option>
                {options.assignees.map((assignee) => (
                  <option key={assignee.id} value={assignee.id}>
                    {assignee.fullName}
                  </option>
                ))}
              </Select>
            </div>

            <Textarea
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              placeholder="Contexte, points à vérifier, décision attendue..."
              className="min-h-[120px]"
              disabled={isPending}
            />

            {optionsError ? (
              <p className="text-sm text-muted-foreground">{optionsError}</p>
            ) : null}

            <div className="flex justify-end">
              <Button
                type="button"
                onClick={handleSubmit}
                disabled={isPending || validationType.trim().length < 2}
              >
                {isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Création
                  </>
                ) : (
                  "Créer la validation"
                )}
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
