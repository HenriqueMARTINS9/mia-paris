"use client";

import type { ReactNode } from "react";
import { useState, useTransition } from "react";
import { CalendarRange, Loader2, Save, ShieldAlert } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  productionRiskMeta,
  productionRiskOptions,
  productionStatusMeta,
  productionStatusOptions,
} from "@/features/productions/metadata";
import {
  updateProductionBlockingReasonAction,
  updateProductionNotesAction,
  updateProductionRiskAction,
  updateProductionScheduleAction,
  updateProductionStatusAction,
} from "@/features/productions/actions/update-production";
import type { ProductionDetailItem } from "@/features/productions/types";

export function ProductionEditForm({
  production,
}: Readonly<{ production: ProductionDetailItem }>) {
  const router = useRouter();
  const [statusValue, setStatusValue] = useState(production.status);
  const [riskValue, setRiskValue] = useState(production.risk);
  const [plannedStartValue, setPlannedStartValue] = useState(
    production.plannedStartAt ? production.plannedStartAt.slice(0, 10) : "",
  );
  const [plannedEndValue, setPlannedEndValue] = useState(
    production.plannedEndAt ? production.plannedEndAt.slice(0, 10) : "",
  );
  const [blockingReasonValue, setBlockingReasonValue] = useState(
    production.blockingReason ?? "",
  );
  const [notesValue, setNotesValue] = useState(production.notes ?? "");

  const [isStatusPending, startStatusTransition] = useTransition();
  const [isRiskPending, startRiskTransition] = useTransition();
  const [isSchedulePending, startScheduleTransition] = useTransition();
  const [isBlockingPending, startBlockingTransition] = useTransition();
  const [isNotesPending, startNotesTransition] = useTransition();

  function runMutation(
    callback: () => Promise<{ message: string; ok: boolean }>,
    onSuccess?: () => void,
  ) {
    return async () => {
      const result = await callback();

      if (result.ok) {
        onSuccess?.();
        toast.success(result.message);
        router.refresh();
        return;
      }

      toast.error(result.message);
    };
  }

  return (
    <div className="rounded-3xl border border-white/70 bg-white/60 p-4">
      <div className="grid gap-4">
        <ActionRow
          label="Statut"
          description="Pilotage de l'avancement atelier ou fournisseur."
          control={
            <Select
              value={statusValue}
              onChange={(event) => setStatusValue(event.target.value as typeof production.status)}
              disabled={isStatusPending}
            >
              {productionStatusOptions.map((status) => (
                <option key={status} value={status}>
                  {productionStatusMeta[status].label}
                </option>
              ))}
            </Select>
          }
          action={
            <ActionButton
              disabled={isStatusPending || statusValue === production.status}
              isPending={isStatusPending}
              label="Enregistrer"
              onClick={() =>
                startStatusTransition(
                  runMutation(() =>
                    updateProductionStatusAction({
                      productionId: production.id,
                      status: statusValue,
                    }),
                  ),
                )
              }
            />
          }
        />

        <ActionRow
          label="Risque"
          description="Ajuster le niveau d'alerte métier."
          control={
            <Select
              value={riskValue}
              onChange={(event) => setRiskValue(event.target.value as typeof production.risk)}
              disabled={isRiskPending}
            >
              {productionRiskOptions.map((risk) => (
                <option key={risk} value={risk}>
                  {productionRiskMeta[risk].label}
                </option>
              ))}
            </Select>
          }
          action={
            <ActionButton
              disabled={isRiskPending || riskValue === production.risk}
              icon={ShieldAlert}
              isPending={isRiskPending}
              label="Mettre à jour"
              onClick={() =>
                startRiskTransition(
                  runMutation(() =>
                    updateProductionRiskAction({
                      productionId: production.id,
                      risk: riskValue,
                    }),
                  ),
                )
              }
              variant="secondary"
            />
          }
        />

        <ActionRow
          label="Planning"
          description="Modifier les dates prévues."
          control={
            <div className="grid gap-3 md:grid-cols-2">
              <DateInput
                value={plannedStartValue}
                onChange={setPlannedStartValue}
                disabled={isSchedulePending}
              />
              <DateInput
                value={plannedEndValue}
                onChange={setPlannedEndValue}
                disabled={isSchedulePending}
              />
            </div>
          }
          action={
            <ActionButton
              disabled={
                isSchedulePending ||
                (plannedStartValue ===
                  (production.plannedStartAt
                    ? production.plannedStartAt.slice(0, 10)
                    : "") &&
                  plannedEndValue ===
                    (production.plannedEndAt
                      ? production.plannedEndAt.slice(0, 10)
                      : ""))
              }
              isPending={isSchedulePending}
              label="Sauver dates"
              onClick={() =>
                startScheduleTransition(
                  runMutation(() =>
                    updateProductionScheduleAction({
                      plannedEndAt: plannedEndValue || null,
                      plannedStartAt: plannedStartValue || null,
                      productionId: production.id,
                    }),
                  ),
                )
              }
              variant="outline"
            />
          }
        />

        <ActionRow
          label="Blocage"
          description="Documenter le point bloquant."
          control={
            <Textarea
              value={blockingReasonValue}
              onChange={(event) => setBlockingReasonValue(event.target.value)}
              className="min-h-[96px]"
              disabled={isBlockingPending}
              placeholder="Ex: tissu non reçu, validation accessoire, attente labo..."
            />
          }
          action={
            <ActionButton
              disabled={
                isBlockingPending ||
                blockingReasonValue === (production.blockingReason ?? "")
              }
              isPending={isBlockingPending}
              label="Sauver blocage"
              onClick={() =>
                startBlockingTransition(
                  runMutation(() =>
                    updateProductionBlockingReasonAction({
                      blockingReason: blockingReasonValue || null,
                      productionId: production.id,
                    }),
                  ),
                )
              }
            />
          }
        />

        <ActionRow
          label="Notes"
          description="Garder le contexte atelier à jour."
          control={
            <Textarea
              value={notesValue}
              onChange={(event) => setNotesValue(event.target.value)}
              className="min-h-[120px]"
              disabled={isNotesPending}
              placeholder="Points d'arbitrage, relances, observations qualité..."
            />
          }
          action={
            <ActionButton
              disabled={isNotesPending || notesValue === (production.notes ?? "")}
              isPending={isNotesPending}
              label="Sauver notes"
              onClick={() =>
                startNotesTransition(
                  runMutation(() =>
                    updateProductionNotesAction({
                      notes: notesValue || null,
                      productionId: production.id,
                    }),
                  ),
                )
              }
            />
          }
        />
      </div>
    </div>
  );
}

function ActionRow({
  action,
  control,
  description,
  label,
}: Readonly<{
  action: ReactNode;
  control: ReactNode;
  description: string;
  label: string;
}>) {
  return (
    <div className="grid gap-3 rounded-2xl border border-white/70 bg-white/65 p-3 lg:grid-cols-[120px_minmax(0,1fr)_auto] lg:items-center">
      <div>
        <p className="text-sm font-semibold">{label}</p>
        <p className="mt-1 text-xs leading-5 text-muted-foreground">
          {description}
        </p>
      </div>
      {control}
      <div className="flex justify-end">{action}</div>
    </div>
  );
}

function ActionButton({
  disabled,
  icon: Icon = Save,
  isPending,
  label,
  onClick,
  variant = "default",
}: Readonly<{
  disabled: boolean;
  icon?: typeof Save | typeof ShieldAlert;
  isPending: boolean;
  label: string;
  onClick: () => void;
  variant?: "default" | "secondary" | "outline";
}>) {
  return (
    <Button size="sm" variant={variant} onClick={onClick} disabled={disabled}>
      {isPending ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" />
          En cours
        </>
      ) : (
        <>
          <Icon className="h-4 w-4" />
          {label}
        </>
      )}
    </Button>
  );
}

function DateInput({
  disabled,
  onChange,
  value,
}: Readonly<{
  disabled: boolean;
  onChange: (value: string) => void;
  value: string;
}>) {
  return (
    <div className="relative">
      <CalendarRange className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        type="date"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="pl-10"
        disabled={disabled}
      />
    </div>
  );
}
