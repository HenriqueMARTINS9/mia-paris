"use server";

import { revalidatePath } from "next/cache";

import { authorizeServerAction } from "@/features/auth/server-authorization";
import type { DocumentActionResult, DocumentType } from "@/features/documents/types";
import { insertActivityLogViaRest } from "@/lib/activity-logs";
import {
  isMissingSupabaseColumnError,
  supabaseRestInsert,
  type SupabaseRestErrorPayload,
} from "@/lib/supabase/rest";

interface CreateDocumentInput {
  documentType: DocumentType;
  externalReference: string | null;
  modelId: string | null;
  orderId: string | null;
  productionId: string | null;
  requestId: string | null;
  title: string;
}

export async function createDocumentAction(
  input: CreateDocumentInput,
): Promise<DocumentActionResult> {
  const authorization = await authorizeServerAction("documents.create");

  if (!authorization.ok) {
    return {
      message: authorization.message,
      ok: false,
    };
  }

  if (input.title.trim().length < 3) {
    return {
      message: "Renseigne un titre document plus explicite.",
      ok: false,
    };
  }

  const payload: Record<string, unknown> = {
    document_type: input.documentType,
    external_source_id: input.externalReference?.trim() || null,
    external_source_type: input.externalReference ? "manual_reference" : "manual",
    model_id: input.modelId,
    name: input.title.trim(),
    order_id: input.orderId,
    production_id: input.productionId,
    request_id: input.requestId,
    status: "draft",
    storage_path: buildManualStoragePath(input.documentType, input.title),
    title: input.title.trim(),
    uploaded_by_user_id: authorization.currentUser.appUser?.id ?? null,
    updated_at: new Date().toISOString(),
  };

  const result = await insertWithMissingColumnFallback("documents", payload);

  if (result.error || !result.data || result.data.length === 0) {
    return {
      message: `Création de document impossible: ${result.error ?? "aucune ligne insérée."}`,
      ok: false,
    };
  }

  const documentId =
    typeof result.data[0]?.id === "string" ? result.data[0].id : null;

  await insertActivityLogViaRest({
    action: "document_created_manually",
    actorId: authorization.currentUser.appUser?.id ?? null,
    actorType: "user",
    description: "Document créé manuellement depuis le cockpit.",
    entityId: documentId,
    entityType: "document",
    payload,
    requestId: input.requestId,
  });

  revalidatePath("/dashboard");
  if (input.requestId) {
    revalidatePath(`/requests/${input.requestId}`);
  }
  revalidatePath("/productions");
  revalidatePath("/", "layout");

  return {
    documentId,
    message: "Document créé avec succès.",
    ok: true,
    productionId: input.productionId,
    requestId: input.requestId,
  };
}

async function insertWithMissingColumnFallback(
  resource: string,
  payload: Record<string, unknown>,
) {
  const currentPayload = { ...payload };

  while (true) {
    const result = await supabaseRestInsert<Array<Record<string, unknown>>>(
      resource,
      cleanPayload(currentPayload),
      {
        select: "id",
      },
    );

    if (!result.error) {
      return result;
    }

    if (!isMissingSupabaseColumnError(result.rawError)) {
      return result;
    }

    const missingColumn = extractMissingColumnName(result.rawError);

    if (!missingColumn || !(missingColumn in currentPayload)) {
      return result;
    }

    delete currentPayload[missingColumn];
  }
}

function cleanPayload(payload: Record<string, unknown>) {
  return Object.fromEntries(
    Object.entries(payload).filter(([, value]) => value !== undefined),
  );
}

function extractMissingColumnName(error: SupabaseRestErrorPayload | null) {
  if (!error) {
    return null;
  }

  const haystack = [error.message, error.details, error.error, error.hint]
    .filter(Boolean)
    .join(" ");
  const match = haystack.match(/column ["']?([a-zA-Z0-9_]+)["']?/i);

  return match?.[1] ?? null;
}

function buildManualStoragePath(documentType: DocumentType, title: string) {
  const safeTitle = title.trim().toLowerCase().replace(/[^a-z0-9._-]+/g, "-");
  return `manual/${documentType}/${safeTitle || "document"}`;
}
