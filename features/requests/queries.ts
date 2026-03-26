import "server-only";

import { unstable_noStore as noStore } from "next/cache";
import type { SupabaseClient } from "@supabase/supabase-js";

import { mapRequestOverviewRowToListItem } from "@/features/requests/mappers";
import type {
  RequestAssigneeOption,
  RequestLinkOption,
  RequestOverviewListItem,
} from "@/features/requests/types";
import type { RequestOverview } from "@/types/crm";
import type { Database } from "@/lib/supabase/database.types";
import { createSupabaseServerClient, hasSupabaseEnv } from "@/lib/supabase/server";
import type { UserRecord } from "@/types/crm";

interface RequestsOverviewPageData {
  requests: RequestOverviewListItem[];
  assignees: RequestAssigneeOption[];
  assigneesError: string | null;
  error: string | null;
}

export async function getRequestsOverviewPageData(): Promise<RequestsOverviewPageData> {
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
}

export async function getRequestAssigneeOptions() {
  const supabase = await createSupabaseServerClient();

  return getRequestAssigneeOptionsWithClient(supabase);
}

export async function getRequestLinkOptions(limit = 120): Promise<{
  options: RequestLinkOption[];
  error: string | null;
}> {
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
}

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
