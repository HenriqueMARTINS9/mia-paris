"use client";

import type { ReactNode } from "react";
import { useState, useTransition } from "react";
import { CalendarRange, Loader2, Save, ShieldAlert } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import {
  productionRiskMeta,
  productionRiskOptions,
  productionStatusMeta,
  productionStatusOptions,
} from "@/features/productions/metadata";
import {
  updateProductionBlockingReasonAction,
  updateProductionRiskAction,
  updateProductionScheduleAction,
  updateProductionStatusAction,
} from "@/features/productions/actions/update-production";
import type { ProductionListItem } from "@/features/productions/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

export function ProductionMutationControls({
  production,
}: Readonly<{ production: ProductionListItem }>) {
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

  const [isStatusPending, startStatusTransition] = useTransition();
  const [isRiskPending, startRiskTransition] = useTransition();
  const [isSchedulePending, startScheduleTransition] = useTransition();
  const [isBlockingPending, startBlockingTransition] = useTransition();

  function handleStatusSave() {
    startStatusTransition(async () => {
      const result = await updateProductionStatusAction({
        productionId: production.id,
        status: statusValue,
      });

      if (result.ok) {
        toast.success(result.message);
        router.refresh();
        return;
      }

      toast.error(result.message);
    });
  }

  function handleRiskSave() {
    startRiskTransition(async () => {
      const result = await updateProductionRiskAction({
        productionId: production.id,
        risk: riskValue,
      });

      if (result.ok) {
        toast.success(result.message);
        router.refresh();
        return;
      }

      toast.error(result.message);
    });
  }

  function handleScheduleSave() {
    startScheduleTransition(async () => {
      const result = await updateProductionScheduleAction({
        productionId: production.id,
        plannedEndAt: plannedEndValue || null,
        plannedStartAt: plannedStartValue || null,
      });

      if (result.ok) {
        toast.success(result.message);
        router.refresh();
        return;
      }

      toast.error(result.message);
    });
  }

  function handleBlockingReasonSave() {
    startBlockingTransition(async () => {
      const result = await updateProductionBlockingReasonAction({
        blockingReason: blockingReasonValue || null,
        productionId: production.id,
      });

      if (result.ok) {
        toast.success(result.message);
        router.refresh();
        return;
      }

      toast.error(result.message);
    });
  }

  return (
    <div className="rounded-3xl border border-white/70 bg-white/60 p-4">
      <div className="grid gap-4">
        <ActionRow
          label="Statut"
          description="Piloter l’avancement de la production."
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
              onClick={handleStatusSave}
            />
          }
        />

        <ActionRow
          label="Risque"
          description="Ajuster le niveau d’alerte côté produit ou atelier."
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
              onClick={handleRiskSave}
              variant="secondary"
            />
          }
        />

        <ActionRow
          label="Planning"
          description="Modifier les dates de démarrage et de fin prévues."
          control={
            <div className="grid gap-3 md:grid-cols-2">
              <div className="relative">
                <CalendarRange className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  type="date"
                  value={plannedStartValue}
                  onChange={(event) => setPlannedStartValue(event.target.value)}
                  className="pl-10"
                  disabled={isSchedulePending}
                />
              </div>
              <div className="relative">
                <CalendarRange className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  type="date"
                  value={plannedEndValue}
                  onChange={(event) => setPlannedEndValue(event.target.value)}
                  className="pl-10"
                  disabled={isSchedulePending}
                />
              </div>
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
              onClick={handleScheduleSave}
              variant="outline"
            />
          }
        />

        <ActionRow
          label="Blocage"
          description="Documenter le point bloquant pour le suivi atelier."
          control={
            <Textarea
              value={blockingReasonValue}
              onChange={(event) => setBlockingReasonValue(event.target.value)}
              className="min-h-[96px]"
              disabled={isBlockingPending}
              placeholder="Ex: attente validation couleur, tissu non reçu, proto KO..."
            />
          }
          action={
            <ActionButton
              disabled={isBlockingPending || blockingReasonValue === (production.blockingReason ?? "")}
              isPending={isBlockingPending}
              label="Sauver note"
              onClick={handleBlockingReasonSave}
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
