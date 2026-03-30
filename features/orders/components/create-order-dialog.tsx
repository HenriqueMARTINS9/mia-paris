"use client";

import { useState, useTransition } from "react";
import { Loader2, PackagePlus } from "lucide-react";
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
import { useAuthorization } from "@/features/auth/components/auth-role-provider";
import { createOrderAction } from "@/features/orders/actions/create-order";
import type { ProductionFormOptions } from "@/features/productions/types";

export function CreateOrderDialog({
  defaultClientId = null,
  defaultModelId = null,
  defaultRequestId = null,
  options,
  optionsError = null,
  triggerLabel = "Nouvelle commande",
}: Readonly<{
  defaultClientId?: string | null;
  defaultModelId?: string | null;
  defaultRequestId?: string | null;
  options: ProductionFormOptions;
  optionsError?: string | null;
  triggerLabel?: string;
}>) {
  const router = useRouter();
  const { can } = useAuthorization();
  const [open, setOpen] = useState(false);
  const [orderNumber, setOrderNumber] = useState("");
  const [clientId, setClientId] = useState(defaultClientId ?? "");
  const [modelId, setModelId] = useState(defaultModelId ?? "");
  const [requestId, setRequestId] = useState(defaultRequestId ?? "");
  const [status, setStatus] = useState("open");
  const [isPending, startTransition] = useTransition();

  if (!can("orders.create")) {
    return null;
  }

  function handleSubmit() {
    startTransition(async () => {
      const result = await createOrderAction({
        clientId: clientId || null,
        modelId: modelId || null,
        orderNumber,
        requestId: requestId || null,
        status,
      });

      if (result.ok) {
        toast.success(result.message);
        setOrderNumber("");
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
        <PackagePlus className="h-4 w-4" />
        {triggerLabel}
      </Button>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent className="sm:max-w-2xl">
          <SheetHeader>
            <SheetTitle>Créer une commande</SheetTitle>
            <SheetDescription>
              Crée une commande manuelle quand le flux production doit démarrer sans attente.
            </SheetDescription>
          </SheetHeader>

          <div className="mt-6 grid gap-4">
            <Input
              value={orderNumber}
              onChange={(event) => setOrderNumber(event.target.value)}
              placeholder="Ex. PO ETAM 2026-051"
              disabled={isPending}
            />

            <div className="grid gap-3 md:grid-cols-2">
              <Select
                value={clientId}
                onChange={(event) => setClientId(event.target.value)}
                disabled={isPending}
              >
                <option value="">Client non renseigné</option>
                {options.clients.map((client) => (
                  <option key={client.id} value={client.id}>
                    {client.label}
                  </option>
                ))}
              </Select>
              <Select
                value={modelId}
                onChange={(event) => setModelId(event.target.value)}
                disabled={isPending}
              >
                <option value="">Modèle non renseigné</option>
                {options.models.map((model) => (
                  <option key={model.id} value={model.id}>
                    {model.label}
                  </option>
                ))}
              </Select>
              <Select
                value={requestId}
                onChange={(event) => setRequestId(event.target.value)}
                disabled={isPending}
              >
                <option value="">Sans demande liée</option>
                {options.requests.map((request) => (
                  <option key={request.id} value={request.id}>
                    {request.label}
                  </option>
                ))}
              </Select>
              <Select
                value={status}
                onChange={(event) => setStatus(event.target.value)}
                disabled={isPending}
              >
                <option value="open">Open</option>
                <option value="planned">Planned</option>
                <option value="confirmed">Confirmed</option>
              </Select>
            </div>

            {optionsError ? (
              <p className="text-sm text-muted-foreground">{optionsError}</p>
            ) : null}

            <div className="flex justify-end">
              <Button
                type="button"
                onClick={handleSubmit}
                disabled={isPending || orderNumber.trim().length < 3}
              >
                {isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Création
                  </>
                ) : (
                  "Créer la commande"
                )}
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
