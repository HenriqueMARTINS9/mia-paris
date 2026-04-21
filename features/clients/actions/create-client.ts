"use server";

import { revalidatePath } from "next/cache";

import type { AssistantMutationExecutionContext } from "@/features/assistant-actions/execution-context";
import { authorizeServerPermissions } from "@/features/auth/server-authorization";
import type { EmailQualificationOption } from "@/features/emails/types";
import { recordAuditEvent } from "@/lib/action-runtime";
import {
  isMissingSupabaseColumnError,
  supabaseRestInsert,
  supabaseRestSelectList,
  type SupabaseRestErrorPayload,
} from "@/lib/supabase/rest";
import type { ClientRecord } from "@/types/crm";

interface CreateClientInput {
  code?: string | null;
  name: string;
}

interface CreateClientResult {
  client: EmailQualificationOption | null;
  clientId: string | null;
  message: string;
  ok: boolean;
}

export async function createClientAction(
  input: CreateClientInput,
  context?: AssistantMutationExecutionContext,
): Promise<CreateClientResult> {
  const authorization = await authorizeServerPermissions(
    ["clients.create"],
    context?.authorizationOverride,
  );

  if (!authorization.ok) {
    return {
      ok: false,
      message: authorization.message,
      clientId: null,
      client: null,
    };
  }

  const normalizedName = input.name.trim();
  const normalizedCode = input.code?.trim() || null;

  if (normalizedName.length < 2) {
    return {
      ok: false,
      message: "Renseigne un nom de client plus explicite.",
      clientId: null,
      client: null,
    };
  }

  const clientsResult = await supabaseRestSelectList<ClientRecord>(
    "clients",
    {
      select: "id,name,code",
    },
    context?.rest ?? undefined,
  );

  if (!clientsResult.error && clientsResult.data) {
    const existingClient = clientsResult.data.find((client) => {
      const clientName = typeof client.name === "string" ? client.name.trim() : "";
      const clientCode = typeof client.code === "string" ? client.code.trim() : "";

      if (clientName.localeCompare(normalizedName, undefined, { sensitivity: "accent" }) === 0) {
        return true;
      }

      return Boolean(
        normalizedCode &&
          clientCode &&
          clientCode.localeCompare(normalizedCode, undefined, {
            sensitivity: "accent",
          }) === 0,
      );
    });

    if (existingClient?.id) {
      return {
        ok: true,
        message: "Ce client existait déjà. Il a été réutilisé.",
        clientId: existingClient.id,
        client: mapClientToOption(existingClient),
      };
    }
  }

  const payload: Record<string, unknown> = {
    code: normalizedCode,
    name: normalizedName,
    updated_at: new Date().toISOString(),
  };

  const result = await insertWithMissingColumnFallback(
    "clients",
    payload,
    {
      select: "id,name,code",
    },
    context?.rest ?? undefined,
  );

  if (result.error || !result.data || result.data.length === 0) {
    return {
      ok: false,
      message: `Création du client impossible: ${result.error ?? "aucune ligne insérée."}`,
      clientId: null,
      client: null,
    };
  }

  const createdClient = result.data[0] as ClientRecord;
  const clientId = typeof createdClient.id === "string" ? createdClient.id : null;

  const actor = context?.actor ?? null;
  await recordAuditEvent({
    action: "client_created_from_email_qualification",
    actorId: actor?.actorUserId ?? authorization.actorId,
    actorType: actor?.actorType ?? authorization.actorType,
    description: "Client créé depuis la qualification email.",
    entityId: clientId,
    entityType: "client",
    payload,
    requestId: null,
    scope: "clients.create",
    source: actor?.source ?? authorization.source,
  });

  revalidatePath("/emails");
  revalidatePath("/demandes");
  revalidatePath("/dashboard");
  revalidatePath("/", "layout");

  return {
    ok: true,
    message: "Client créé et prêt à être assigné à l’email.",
    clientId,
    client: mapClientToOption(createdClient),
  };
}

function mapClientToOption(client: ClientRecord): EmailQualificationOption {
  return {
    id: client.id,
    label: typeof client.name === "string" && client.name.trim().length > 0 ? client.name : "Client sans nom",
    secondary:
      typeof client.code === "string" && client.code.trim().length > 0
        ? client.code.trim()
        : null,
  };
}

async function insertWithMissingColumnFallback(
  resource: string,
  payload: Record<string, unknown>,
  params?: Record<string, string>,
  restContext?: { authMode?: "service_role" | "session" } | null,
) {
  const currentPayload = { ...payload };

  while (true) {
    const result = await supabaseRestInsert<Array<Record<string, unknown>>>(
      resource,
      cleanPayload(currentPayload),
      params,
      restContext ?? undefined,
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
