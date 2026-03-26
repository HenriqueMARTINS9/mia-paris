"use server";

import { revalidatePath } from "next/cache";

import {
  mapUiProductionRiskToDatabaseValues,
  mapUiProductionStatusToDatabaseValues,
  productionRiskMeta,
  productionStatusMeta,
} from "@/features/productions/metadata";
import type {
  ProductionMutationResult,
  ProductionRisk,
  ProductionStatus,
} from "@/features/productions/types";
import {
  isMissingSupabaseColumnError,
  supabaseRestPatch,
} from "@/lib/supabase/rest";

interface UpdateProductionStatusInput {
  productionId: string;
  status: ProductionStatus;
}

interface UpdateProductionRiskInput {
  productionId: string;
  risk: ProductionRisk;
}

interface UpdateProductionScheduleInput {
  productionId: string;
  plannedEndAt: string | null;
  plannedStartAt: string | null;
}

interface UpdateProductionBlockingReasonInput {
  blockingReason: string | null;
  productionId: string;
}

export async function updateProductionStatusAction(
  input: UpdateProductionStatusInput,
): Promise<ProductionMutationResult> {
  return patchFirstMatchingPayload({
    field: "status",
    payloads: buildSingleFieldPayloads(
      ["status", "production_status"],
      mapUiProductionStatusToDatabaseValues(input.status),
    ),
    productionId: input.productionId,
    successMessage: `Statut production mis à jour: ${productionStatusMeta[input.status].label}.`,
  });
}

export async function updateProductionRiskAction(
  input: UpdateProductionRiskInput,
): Promise<ProductionMutationResult> {
  return patchFirstMatchingPayload({
    field: "risk",
    payloads: buildSingleFieldPayloads(
      ["risk_level", "risk", "risk_status"],
      mapUiProductionRiskToDatabaseValues(input.risk),
    ),
    productionId: input.productionId,
    successMessage: `Niveau de risque mis à jour: ${productionRiskMeta[input.risk].label}.`,
  });
}

export async function updateProductionScheduleAction(
  input: UpdateProductionScheduleInput,
): Promise<ProductionMutationResult> {
  const startValue = toIsoValue(input.plannedStartAt);
  const endValue = toIsoValue(input.plannedEndAt);

  return patchFirstMatchingPayload({
    field: "schedule",
    payloads: [
      {
        planned_start_at: startValue,
        planned_end_at: endValue,
      },
      {
        planned_start_date: startValue,
        planned_end_date: endValue,
      },
      {
        start_at: startValue,
        end_at: endValue,
      },
      {
        production_start_at: startValue,
        production_end_at: endValue,
      },
    ],
    productionId: input.productionId,
    successMessage: "Planning production mis à jour.",
  });
}

export async function updateProductionBlockingReasonAction(
  input: UpdateProductionBlockingReasonInput,
): Promise<ProductionMutationResult> {
  return patchFirstMatchingPayload({
    field: "blocking_reason",
    payloads: buildSingleFieldPayloads(
      [
        "blocking_reason",
        "blocked_reason",
        "blocker_reason",
        "blocker",
        "issue",
      ],
      [input.blockingReason?.trim() || null],
    ),
    productionId: input.productionId,
    successMessage: "Blocage production mis à jour.",
  });
}

function buildSingleFieldPayloads(columns: string[], values: Array<string | null>) {
  const payloads: Array<Record<string, unknown>> = [];

  for (const column of columns) {
    for (const value of values) {
      payloads.push({
        [column]: value,
      });
    }
  }

  return payloads;
}

async function patchFirstMatchingPayload(options: {
  field: ProductionMutationResult["field"];
  payloads: Array<Record<string, unknown>>;
  productionId: string;
  successMessage: string;
}): Promise<ProductionMutationResult> {
  if (!options.productionId) {
    return {
      ok: false,
      field: options.field,
      message: "Identifiant de production manquant.",
    };
  }

  let latestError: string | null = null;

  for (const payload of options.payloads) {
    const result = await supabaseRestPatch<Array<Record<string, unknown>>>(
      "productions",
      {
        ...payload,
        updated_at: new Date().toISOString(),
      },
      {
        id: `eq.${options.productionId}`,
        select: "id,request_id",
      },
    );

    if (!result.error && result.data && result.data.length > 0) {
      const requestId = getRequestIdFromMutation(result.data[0]);

      revalidatePath("/productions");
      if (requestId) {
        revalidatePath(`/requests/${requestId}`);
      }
      revalidatePath("/", "layout");

      return {
        ok: true,
        field: options.field,
        message: options.successMessage,
      };
    }

    if (!result.error && (!result.data || result.data.length === 0)) {
      latestError =
        "Aucune production n'a été mise à jour. Vérifie les policies RLS et la visibilité de la ligne.";
      continue;
    }

    latestError = getProductionMutationErrorMessage(result.error ?? "Mutation impossible.");

    if (!isMissingSupabaseColumnError(result.rawError)) {
      break;
    }
  }

  return {
    ok: false,
    field: options.field,
    message:
      latestError ??
      "Mutation impossible sur productions. Vérifie les colonnes disponibles.",
  };
}

function getRequestIdFromMutation(record: Record<string, unknown>) {
  const value = record.request_id;

  return typeof value === "string" && value.length > 0 ? value : null;
}

function getProductionMutationErrorMessage(message: string) {
  const normalized = message.toLowerCase();

  if (
    normalized.includes("row-level security") ||
    normalized.includes("permission denied") ||
    normalized.includes("policy")
  ) {
    return "Mise à jour refusée par Supabase RLS sur productions.";
  }

  return `Mutation impossible sur productions: ${message}`;
}

function toIsoValue(input: string | null) {
  return input ? new Date(`${input}T09:00:00`).toISOString() : null;
}
