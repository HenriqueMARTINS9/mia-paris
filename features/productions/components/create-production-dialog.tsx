"use client";

import type { ReactNode } from "react";
import { useMemo, useState, useTransition } from "react";
import { Factory, Loader2, PlusSquare } from "lucide-react";
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
import { createProductionAction } from "@/features/productions/actions/create-production";
import {
  productionRiskMeta,
  productionRiskOptions,
  productionStatusMeta,
  productionStatusOptions,
} from "@/features/productions/metadata";
import type { ProductionFormOptions, ProductionRisk, ProductionStatus } from "@/features/productions/types";

interface CreateProductionDialogProps {
  options: ProductionFormOptions;
  optionsError?: string | null;
}

const productionModeOptions = [
  { label: "Sous-traitance", value: "outsourced" },
  { label: "Atelier interne", value: "internal" },
  { label: "Capsule urgente", value: "express" },
  { label: "Développement", value: "development" },
] as const;

export function CreateProductionDialog({
  options,
  optionsError = null,
}: Readonly<CreateProductionDialogProps>) {
  const router = useRouter();
  const { can } = useAuthorization();
  const [open, setOpen] = useState(false);
  const [requestId, setRequestId] = useState("");
  const [clientId, setClientId] = useState("");
  const [modelId, setModelId] = useState("");
  const [orderId, setOrderId] = useState("");
  const [newOrderNumber, setNewOrderNumber] = useState("");
  const [productionMode, setProductionMode] = useState("outsourced");
  const [status, setStatus] = useState<ProductionStatus>("planned");
  const [risk, setRisk] = useState<ProductionRisk>("normal");
  const [plannedStartAt, setPlannedStartAt] = useState("");
  const [plannedEndAt, setPlannedEndAt] = useState("");
  const [blockingReason, setBlockingReason] = useState("");
  const [notes, setNotes] = useState("");
  const [isPending, startTransition] = useTransition();

  const selectedOrder = useMemo(
    () => options.orders.find((option) => option.id === orderId) ?? null,
    [options.orders, orderId],
  );
  const selectedModel = useMemo(
    () => options.models.find((option) => option.id === modelId) ?? null,
    [options.models, modelId],
  );

  function resetForm() {
    setRequestId("");
    setClientId("");
    setModelId("");
    setOrderId("");
    setNewOrderNumber("");
    setProductionMode("outsourced");
    setStatus("planned");
    setRisk("normal");
    setPlannedStartAt("");
    setPlannedEndAt("");
    setBlockingReason("");
    setNotes("");
  }

  function handleSubmit() {
    startTransition(async () => {
      const result = await createProductionAction({
        blockingReason: blockingReason || null,
        clientId:
          clientId ||
          selectedOrder?.clientId ||
          selectedModel?.clientId ||
          null,
        modelId: modelId || selectedOrder?.modelId || null,
        newOrderNumber: newOrderNumber || null,
        notes: notes || null,
        orderId: orderId || null,
        plannedEndAt: plannedEndAt || null,
        plannedStartAt: plannedStartAt || null,
        productionMode,
        requestId: requestId || selectedOrder?.requestId || null,
        risk,
        status,
      });

      if (result.ok) {
        toast.success(result.message);
        setOpen(false);
        resetForm();
        router.refresh();
        return;
      }

      toast.error(result.message);
    });
  }

  if (!can("productions.create")) {
    return null;
  }

  return (
    <>
      <Button variant="secondary" onClick={() => setOpen(true)}>
        <PlusSquare className="h-4 w-4" />
        Nouveau suivi
      </Button>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent className="sm:max-w-2xl">
          <SheetHeader>
            <SheetTitle>Créer une production</SheetTitle>
            <SheetDescription>
              Crée un suivi de production relié à une demande, un modèle, un client ou une commande existante.
            </SheetDescription>
          </SheetHeader>

          <div className="mt-6 grid gap-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <LabeledSelect
                label="Demande liée"
                value={requestId}
                onChange={setRequestId}
                disabled={isPending}
                placeholder="Aucune demande"
                options={options.requests}
              />
              <LabeledSelect
                label="Client"
                value={clientId}
                onChange={setClientId}
                disabled={isPending}
                placeholder="Client non renseigné"
                options={options.clients}
              />
              <LabeledSelect
                label="Modèle"
                value={modelId}
                onChange={(nextModelId) => {
                  const nextModel = options.models.find((option) => option.id === nextModelId);
                  setModelId(nextModelId);
                  if (!clientId && nextModel?.clientId) {
                    setClientId(nextModel.clientId);
                  }
                }}
                disabled={isPending}
                placeholder="Aucun modèle"
                options={options.models}
              />
              <LabeledSelect
                label="Commande existante"
                value={orderId}
                onChange={(nextOrderId) => {
                  const nextOrder = options.orders.find((option) => option.id === nextOrderId);
                  setOrderId(nextOrderId);
                  if (nextOrder?.clientId) {
                    setClientId(nextOrder.clientId);
                  }
                  if (nextOrder?.modelId) {
                    setModelId(nextOrder.modelId);
                  }
                  if (nextOrder?.requestId) {
                    setRequestId(nextOrder.requestId);
                  }
                }}
                disabled={isPending}
                placeholder="Créer sans commande existante"
                options={options.orders}
              />
            </div>

            <div className="grid gap-2">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                Nouvelle commande si nécessaire
              </p>
              <Input
                value={newOrderNumber}
                onChange={(event) => setNewOrderNumber(event.target.value)}
                placeholder="Ex. PO ETAM 2026-042"
                disabled={isPending}
              />
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <LabeledNativeSelect
                label="Mode de production"
                value={productionMode}
                onChange={setProductionMode}
                disabled={isPending}
              >
                {productionModeOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </LabeledNativeSelect>
              <LabeledNativeSelect
                label="Statut"
                value={status}
                onChange={(value) => setStatus(value as ProductionStatus)}
                disabled={isPending}
              >
                {productionStatusOptions.map((option) => (
                  <option key={option} value={option}>
                    {productionStatusMeta[option].label}
                  </option>
                ))}
              </LabeledNativeSelect>
              <LabeledNativeSelect
                label="Risque"
                value={risk}
                onChange={(value) => setRisk(value as ProductionRisk)}
                disabled={isPending}
              >
                {productionRiskOptions.map((option) => (
                  <option key={option} value={option}>
                    {productionRiskMeta[option].label}
                  </option>
                ))}
              </LabeledNativeSelect>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <LabeledDateInput
                label="Début prévu"
                value={plannedStartAt}
                onChange={setPlannedStartAt}
                disabled={isPending}
              />
              <LabeledDateInput
                label="Fin prévue"
                value={plannedEndAt}
                onChange={setPlannedEndAt}
                disabled={isPending}
              />
            </div>

            <div className="grid gap-2">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                Blocage éventuel
              </p>
              <Textarea
                value={blockingReason}
                onChange={(event) => setBlockingReason(event.target.value)}
                placeholder="Ex. attente validation couleur, matière non reçue, lab dip KO..."
                className="min-h-[96px]"
                disabled={isPending}
              />
            </div>

            <div className="grid gap-2">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                Notes
              </p>
              <Textarea
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                placeholder="Contexte atelier, arbitrages, dépendances, relances prévues..."
                className="min-h-[120px]"
                disabled={isPending}
              />
            </div>

            {optionsError ? (
              <p className="text-sm text-muted-foreground">{optionsError}</p>
            ) : null}

            <div className="flex justify-end">
              <Button
                type="button"
                onClick={handleSubmit}
                disabled={
                  isPending ||
                  (!requestId &&
                    !clientId &&
                    !modelId &&
                    !orderId &&
                    newOrderNumber.trim().length === 0)
                }
              >
                {isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Création
                  </>
                ) : (
                  <>
                    <Factory className="h-4 w-4" />
                    Créer la production
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

function LabeledSelect({
  disabled,
  label,
  onChange,
  options,
  placeholder,
  value,
}: Readonly<{
  disabled: boolean;
  label: string;
  onChange: (value: string) => void;
  options: Array<{ id: string; label: string; secondary: string | null }>;
  placeholder: string;
  value: string;
}>) {
  return (
    <div className="grid gap-2">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
        {label}
      </p>
      <Select value={value} onChange={(event) => onChange(event.target.value)} disabled={disabled}>
        <option value="">{placeholder}</option>
        {options.map((option) => (
          <option key={option.id} value={option.id}>
            {option.secondary ? `${option.label} · ${option.secondary}` : option.label}
          </option>
        ))}
      </Select>
    </div>
  );
}

function LabeledNativeSelect({
  children,
  disabled,
  label,
  onChange,
  value,
}: Readonly<{
  children: ReactNode;
  disabled: boolean;
  label: string;
  onChange: (value: string) => void;
  value: string;
}>) {
  return (
    <div className="grid gap-2">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
        {label}
      </p>
      <Select value={value} onChange={(event) => onChange(event.target.value)} disabled={disabled}>
        {children}
      </Select>
    </div>
  );
}

function LabeledDateInput({
  disabled,
  label,
  onChange,
  value,
}: Readonly<{
  disabled: boolean;
  label: string;
  onChange: (value: string) => void;
  value: string;
}>) {
  return (
    <div className="grid gap-2">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
        {label}
      </p>
      <Input
        type="date"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        disabled={disabled}
      />
    </div>
  );
}
