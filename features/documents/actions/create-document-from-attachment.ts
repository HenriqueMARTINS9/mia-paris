"use server";

import { revalidatePath } from "next/cache";

import type {
  CreateDocumentFromAttachmentPayload,
  DocumentActionResult,
} from "@/features/documents/types";
import { authorizeServerAction } from "@/features/auth/server-authorization";
import { recordAuditEvent } from "@/lib/action-runtime";
import {
  isMissingSupabaseColumnError,
  supabaseRestInsert,
  supabaseRestSelectMaybeSingle,
  type SupabaseRestErrorPayload,
} from "@/lib/supabase/rest";
import { readString } from "@/lib/record-helpers";
import type {
  DocumentRecord,
  EmailAttachmentRecord,
  EmailRecord,
  ModelRecord,
  OrderRecord,
  ProductionRecord,
  RequestRecord,
} from "@/types/crm";

export async function createDocumentFromAttachmentAction(
  input: CreateDocumentFromAttachmentPayload,
): Promise<DocumentActionResult> {
  const authorization = await authorizeServerAction("documents.create");

  if (!authorization.ok) {
    return {
      ok: false,
      message: authorization.message,
    };
  }

  if (!input.attachmentId) {
    return {
      ok: false,
      message: "Pièce jointe email introuvable.",
    };
  }

  const attachmentResult = await supabaseRestSelectMaybeSingle<EmailAttachmentRecord>(
    "email_attachments",
    {
      id: `eq.${input.attachmentId}`,
      select: "*",
    },
  );

  if (attachmentResult.error) {
    return {
      ok: false,
      message: `Impossible de charger la pièce jointe: ${attachmentResult.error}`,
    };
  }

  if (!attachmentResult.data) {
    return {
      ok: false,
      message: "Cette pièce jointe n'existe plus ou n'est plus visible.",
    };
  }

  const [emailResult, requestResult, modelResult, orderResult, productionResult] =
    await Promise.all([
      loadMaybeSingle<EmailRecord>("emails", readString(attachmentResult.data, ["email_id"])),
      loadMaybeSingle<RequestRecord>("requests", input.requestId),
      loadMaybeSingle<ModelRecord>("models", input.modelId),
      loadMaybeSingle<OrderRecord>("orders", input.orderId),
      loadMaybeSingle<ProductionRecord>("productions", input.productionId),
    ]);

  const resolvedOrderId =
    input.orderId ??
    readString(productionResult, ["order_id", "orderId"]) ??
    null;
  const resolvedRequestId =
    input.requestId ??
    readString(productionResult, ["request_id", "requestId"]) ??
    readString(orderResult, ["request_id", "requestId"]) ??
    readString(emailResult, ["request_id", "linked_request_id", "crm_request_id"]) ??
    null;
  const resolvedModelId =
    input.modelId ??
    readString(productionResult, ["model_id", "modelId"]) ??
    readString(orderResult, ["model_id", "modelId"]) ??
    null;
  const resolvedProductionId = input.productionId ?? null;
  const resolvedClientId =
    readString(requestResult, ["client_id"]) ??
    readString(productionResult, ["client_id", "clientId"]) ??
    readString(orderResult, ["client_id", "clientId"]) ??
    readString(modelResult, ["client_id", "clientId"]) ??
    readString(emailResult, ["client_id", "clientId"]) ??
    null;
  const fileName =
    readString(attachmentResult.data, ["file_name", "filename", "name"]) ??
    "Document email";
  const title = input.title?.trim() || fileName;
  const storagePath =
    readString(attachmentResult.data, ["storage_path"]) ??
    buildTemporaryAttachmentReference(attachmentResult.data, fileName);
  const payload = {
    client_id: resolvedClientId,
    created_at: new Date().toISOString(),
    document_type: input.documentType,
    email_attachment_id: attachmentResult.data.id,
    external_source_id: attachmentResult.data.id,
    external_source_type: "email_attachment",
    file_name: fileName,
    metadata: {
      attachmentId: attachmentResult.data.id,
      attachmentStoragePath: readString(attachmentResult.data, ["storage_path"]),
      emailId: readString(attachmentResult.data, ["email_id"]),
      externalAttachmentId: readString(attachmentResult.data, ["external_attachment_id"]),
      source: "gmail_attachment_v1",
    },
    model_id: resolvedModelId,
    name: title,
    order_id: resolvedOrderId,
    production_id: resolvedProductionId,
    request_id: resolvedRequestId,
    storage_path: storagePath,
    title,
    updated_at: new Date().toISOString(),
    uploaded_by_user_id: authorization.actorId,
    version: 1,
  } satisfies Record<string, unknown>;

  const insertResult = await insertWithMissingColumnFallback(payload);

  if (insertResult.error) {
    await recordAuditEvent({
      action: "create_document_from_attachment",
      actorId: authorization.actorId,
      actorType: "user",
      description: `Création de document impossible: ${insertResult.error}`,
      entityId: attachmentResult.data.id,
      entityType: "document",
      payload,
      requestId: resolvedRequestId,
      scope: "documents.create_from_attachment",
      source: "ui",
      status: "failure",
    });

    return {
      ok: false,
      message: `Création de document impossible: ${insertResult.error}`,
    };
  }

  const documentId = readString(insertResult.data?.[0] ?? null, ["id"]);

  await recordAuditEvent({
    action: "create_document_from_attachment",
    actorId: authorization.actorId,
    actorType: "user",
    description: `Document métier créé depuis la pièce jointe ${attachmentResult.data.id}.`,
    entityId: documentId,
    entityType: "document",
    payload: {
      attachmentId: attachmentResult.data.id,
      documentType: input.documentType,
      fileName,
      productionId: resolvedProductionId,
      requestId: resolvedRequestId,
      storagePath,
    },
    requestId: resolvedRequestId,
    scope: "documents.create_from_attachment",
    source: "ui",
    status: "success",
  });

  revalidatePath("/emails");
  revalidatePath("/productions");
  if (resolvedRequestId) {
    revalidatePath(`/requests/${resolvedRequestId}`);
  }
  revalidatePath("/", "layout");

  return {
    ok: true,
    message: "Document métier créé depuis la pièce jointe.",
    documentId,
    productionId: resolvedProductionId,
    requestId: resolvedRequestId,
  };
}

async function loadMaybeSingle<T extends Record<string, unknown>>(
  resource: string,
  id: string | null | undefined,
) {
  if (!id) {
    return null;
  }

  const result = await supabaseRestSelectMaybeSingle<T>(resource, {
    id: `eq.${id}`,
    select: "*",
  });

  return result.data ?? null;
}

async function insertWithMissingColumnFallback(payload: Record<string, unknown>) {
  const currentPayload = { ...payload };

  while (true) {
    const result = await supabaseRestInsert<Array<DocumentRecord>>(
      "documents",
      cleanPayload(currentPayload),
      {
        select: "id,request_id,production_id",
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

function buildTemporaryAttachmentReference(
  attachment: EmailAttachmentRecord,
  fileName: string,
) {
  const emailId = readString(attachment, ["email_id"]) ?? "email";
  const slug = fileName.replace(/\s+/g, "-").toLowerCase();

  return `gmail-attachment://${emailId}/${attachment.id}/${slug}`;
}
