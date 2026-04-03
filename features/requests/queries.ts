import "server-only";

import { unstable_noStore as noStore } from "next/cache";
import type { SupabaseClient } from "@supabase/supabase-js";
import { cache } from "react";

import { mapRequestOverviewRowToListItem } from "@/features/requests/mappers";
import type {
  RequestAssigneeOption,
  RequestFormOptions,
  RequestLinkOption,
  RequestOverviewListItem,
} from "@/features/requests/types";
import type { RequestOverview } from "@/types/crm";
import type { Database } from "@/lib/supabase/database.types";
import { createSupabaseServerClient, hasSupabaseEnv } from "@/lib/supabase/server";
import {
  isMissingSupabaseResourceError,
  supabaseRestSelectList,
} from "@/lib/supabase/rest";
import { readString } from "@/lib/record-helpers";
import type {
  ClientRecord,
  ContactRecord,
  ModelRecord,
  ProductDepartmentRecord,
  UserRecord,
} from "@/types/crm";

interface RequestsOverviewPageData {
  requests: RequestOverviewListItem[];
  assignees: RequestAssigneeOption[];
  assigneesError: string | null;
  error: string | null;
}

const getRequestsOverviewPageDataInternal = async (): Promise<RequestsOverviewPageData> => {
  noStore();

  if (!hasSupabaseEnv) {
    return {
      requests: [],
      assignees: [],
      assigneesError: null,
      error:
        "Configuration Supabase absente. Vérifie NEXT_PUBLIC_SUPABASE_URL et la clé publishable.",
    };
  }

  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return {
        requests: [],
        assignees: [],
        assigneesError: null,
        error:
          "Session Supabase introuvable. Reconnecte-toi pour accéder aux demandes.",
      };
    }

    const [requestsResult, assigneesResult] = await Promise.all([
      supabase
        .from("v_requests_overview")
        .select("*")
        .order("urgency_score", { ascending: false, nullsFirst: false })
        .order("due_at", { ascending: true, nullsFirst: false })
        .order("created_at", { ascending: false }),
      getRequestAssigneeOptionsWithClient(supabase),
    ]);

    if (requestsResult.error) {
      return {
        requests: [],
        assignees: assigneesResult.assignees,
        assigneesError: assigneesResult.error,
        error: `Impossible de charger les demandes: ${requestsResult.error.message}`,
      };
    }

    return {
      requests: (requestsResult.data ?? []).map(mapRequestOverviewRowToListItem),
      assignees: assigneesResult.assignees,
      assigneesError: assigneesResult.error,
      error: null,
    };
  } catch (error) {
    return {
      requests: [],
      assignees: [],
      assigneesError: null,
      error:
        error instanceof Error
          ? `Impossible de charger les demandes: ${error.message}`
          : "Impossible de charger les demandes.",
    };
  }
};

export const getRequestsOverviewPageData = cache(getRequestsOverviewPageDataInternal);

const getRequestAssigneeOptionsInternal = async () => {
  const supabase = await createSupabaseServerClient();

  return getRequestAssigneeOptionsWithClient(supabase);
};

export const getRequestAssigneeOptions = cache(getRequestAssigneeOptionsInternal);

const getRequestLinkOptionsInternal = async (limit = 120): Promise<{
  options: RequestLinkOption[];
  error: string | null;
}> => {
  try {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase
      .from("v_requests_overview")
      .select("*")
      .order("updated_at", { ascending: false })
      .limit(limit);

    if (error) {
      return {
        options: [],
        error: `Impossible de charger les demandes liées: ${error.message}`,
      };
    }

    return {
      options: (data ?? []).map((request) =>
        mapRequestOverviewToLinkOption(request),
      ),
      error: null,
    };
  } catch (error) {
    return {
      options: [],
      error:
        error instanceof Error
          ? `Impossible de charger les demandes liées: ${error.message}`
          : "Impossible de charger les demandes liées.",
    };
  }
};

export const getRequestLinkOptions = cache(getRequestLinkOptionsInternal);

const getRequestFormOptionsInternal = async (limit = 120): Promise<{
  error: string | null;
  options: RequestFormOptions;
}> => {
  const [assigneesResult, clientsResult, contactsResult, modelsResult, departmentsResult] =
    await Promise.all([
      getRequestAssigneeOptions(),
      supabaseRestSelectList<ClientRecord>("clients", {
        order: "name.asc.nullslast",
        select: "*",
      }),
      supabaseRestSelectList<ContactRecord>("contacts", {
        order: "full_name.asc.nullslast,name.asc.nullslast",
        select: "*",
      }),
      supabaseRestSelectList<ModelRecord>("models", {
        order: "updated_at.desc.nullslast,created_at.desc.nullslast",
        select: "*",
      }),
      supabaseRestSelectList<ProductDepartmentRecord>("product_departments", {
        order: "name.asc.nullslast,label.asc.nullslast",
        select: "*",
      }),
    ]);

  const errors = [
    assigneesResult.error ? "utilisateurs" : null,
    getOptionalRequestFormError("clients", clientsResult.error, clientsResult.rawError),
    getOptionalRequestFormError("contacts", contactsResult.error, contactsResult.rawError),
    getOptionalRequestFormError("models", modelsResult.error, modelsResult.rawError),
    getOptionalRequestFormError(
      "product_departments",
      departmentsResult.error,
      departmentsResult.rawError,
    ),
  ].filter((value): value is string => Boolean(value));

  return {
    error:
      errors.length > 0
        ? `Certaines options de création de demande sont indisponibles: ${errors.join(", ")}.`
        : null,
    options: {
      assignees: assigneesResult.assignees,
      clients: (clientsResult.data ?? []).slice(0, limit).map((client) => ({
        id: client.id,
        label:
          readString(client, ["name", "client_name", "account_name"]) ?? client.id,
        secondary: readString(client, ["code", "client_code"]),
      })),
      contacts: (contactsResult.data ?? []).slice(0, limit).map((contact) => ({
        id: contact.id,
        label:
          readString(contact, ["full_name", "name", "contact_name"]) ?? contact.id,
        secondary: readString(contact, ["email"]),
        clientId: readString(contact, ["client_id", "clientId"]),
      })),
      models: (modelsResult.data ?? []).slice(0, limit).map((model) => ({
        id: model.id,
        label:
          readString(model, ["name", "reference", "label", "style_name"]) ?? model.id,
        secondary: readString(model, ["reference", "code", "internal_ref"]),
        clientId: readString(model, ["client_id", "clientId"]),
      })),
      productDepartments: (departmentsResult.data ?? []).slice(0, limit).map((department) => ({
        id: department.id,
        label:
          readString(department, ["name", "label", "department_name"]) ??
          department.id,
        secondary: readString(department, ["code"]),
      })),
    },
  };
};

export const getRequestFormOptions = cache(getRequestFormOptionsInternal);

async function getRequestAssigneeOptionsWithClient(
  supabase: SupabaseClient<Database>,
): Promise<{
  assignees: RequestAssigneeOption[];
  error: string | null;
}> {
  try {
    const { data, error } = await supabase
      .from("users")
      .select("id,full_name,email")
      .order("full_name", { ascending: true });

    if (error) {
      return {
        assignees: [],
        error: `Impossible de charger les utilisateurs assignables: ${error.message}`,
      };
    }

    if (!data || data.length === 0) {
      return {
        assignees: [],
        error: "Aucun utilisateur assignable trouvé dans la table users.",
      };
    }

    return {
      assignees: data.map((user: Pick<UserRecord, "id" | "full_name" | "email">) => ({
        id: user.id,
        fullName: user.full_name ?? user.email ?? user.id,
        email: user.email,
      })),
      error: null,
    };
  } catch (error) {
    return {
      assignees: [],
      error:
        error instanceof Error
          ? `Impossible de charger les utilisateurs assignables: ${error.message}`
          : "Impossible de charger les utilisateurs assignables.",
    };
  }
}

function mapRequestOverviewToLinkOption(request: RequestOverview): RequestLinkOption {
  const reference = request.internal_ref ?? request.client_ref ?? request.id.slice(0, 8);
  const clientName = request.client_name ?? "Client non renseigné";

  return {
    id: request.id,
    label: `${clientName} · ${reference} · ${request.title}`,
    clientName,
  };
}

function getOptionalRequestFormError(
  resource: string,
  error: string | null,
  rawError: unknown,
) {
  if (!error) {
    return null;
  }

  if (
    typeof rawError === "object" &&
    rawError !== null &&
    isMissingSupabaseResourceError(rawError as never)
  ) {
    return null;
  }

  return resource;
}
