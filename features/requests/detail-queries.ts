import "server-only";

import { unstable_noStore as noStore } from "next/cache";

import {
  buildRequestActivityHistory,
  mapRelatedDeadlineRow,
  mapRelatedDocumentRow,
  mapRelatedEmailRow,
  mapRelatedTaskRow,
  mapRelatedValidationRow,
  mapRequestDetailItem,
  pickString,
} from "@/features/requests/detail-mappers";
import { getRequestHistoryPanelData } from "@/features/history/queries";
import type {
  RequestDetailPageData,
  SupabaseRecord,
} from "@/features/requests/detail-types";
import { getRequestAssigneeOptions } from "@/features/requests/queries";
import {
  isMissingSupabaseColumnError,
  isMissingSupabaseResourceError,
  supabaseRestSelectList,
  supabaseRestSelectMaybeSingle,
  type SupabaseRestResponse,
} from "@/lib/supabase/rest";
import { createSupabaseServerClient, hasSupabaseEnv } from "@/lib/supabase/server";

export async function getRequestDetailPageData(
  requestId: string,
): Promise<RequestDetailPageData> {
  noStore();

  if (!hasSupabaseEnv) {
    return createEmptyDetailPageData(
      "Configuration Supabase absente. Vérifie NEXT_PUBLIC_SUPABASE_URL et la clé publishable.",
    );
  }

  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return createEmptyDetailPageData(
        "Session Supabase introuvable. Reconnecte-toi pour accéder à la demande.",
      );
    }

    const [
      overviewResult,
      requestResult,
      assigneesResult,
      tasksResult,
      deadlinesResult,
      validationsResult,
      documentsResult,
      emailsResult,
    ] = await Promise.all([
      supabase
        .from("v_requests_overview")
        .select("*")
        .eq("id", requestId)
        .maybeSingle(),
      supabaseRestSelectMaybeSingle<SupabaseRecord>("requests", {
        id: `eq.${requestId}`,
        select: "*",
      }),
      getRequestAssigneeOptions(),
      selectRelatedByRequestId("tasks", requestId),
      selectRelatedByRequestId("deadlines", requestId),
      selectRelatedByRequestId("validations", requestId),
      selectRelatedByRequestId("documents", requestId),
      selectRelatedByRequestId("emails", requestId),
    ]);

    if (overviewResult.error) {
      return createEmptyDetailPageData(
        `Impossible de charger la demande: ${overviewResult.error.message}`,
      );
    }

    if (!overviewResult.data) {
      return createEmptyDetailPageData(null);
    }

    const clientId = pickString(requestResult.data, "client_id");
    const modelId = pickString(requestResult.data, "model_id");

    const [clientResult, modelResult] = await Promise.all([
      clientId
        ? supabaseRestSelectMaybeSingle<SupabaseRecord>("clients", {
            id: `eq.${clientId}`,
            select: "*",
          })
        : Promise.resolve(null),
      modelId
        ? supabaseRestSelectMaybeSingle<SupabaseRecord>("models", {
            id: `eq.${modelId}`,
            select: "*",
          })
        : Promise.resolve(null),
    ]);

    const request = mapRequestDetailItem(
      overviewResult.data,
      requestResult.data,
      clientResult?.data ?? null,
      modelResult?.data ?? null,
    );
    const tasks = (tasksResult.data ?? []).map(mapRelatedTaskRow);
    const deadlines = (deadlinesResult.data ?? []).map(mapRelatedDeadlineRow);
    const validations = (validationsResult.data ?? []).map(
      mapRelatedValidationRow,
    );
    const documents = (documentsResult.data ?? []).map(mapRelatedDocumentRow);
    const emails = (emailsResult.data ?? []).map(mapRelatedEmailRow);
    const history = buildRequestActivityHistory({
      deadlines,
      documents,
      emails: emailsResult.data ?? [],
      request,
      tasks,
      validations,
    });
    const historyContext = await getRequestHistoryPanelData(request);

    return {
      assignees: assigneesResult.assignees,
      assigneesError: assigneesResult.error,
      deadlines,
      documents,
      emails,
      error: null,
      history,
      historyContext,
      request,
      tasks,
      validations,
      warnings: [
        getRelatedWarning("Table requests", requestResult),
        getRelatedWarning("Table tasks", tasksResult),
        getRelatedWarning("Table deadlines", deadlinesResult),
        getRelatedWarning("Table validations", validationsResult),
        getRelatedWarning("Table documents", documentsResult),
        getRelatedWarning("Table emails", emailsResult),
        clientResult ? getRelatedWarning("Table clients", clientResult) : null,
        modelResult ? getRelatedWarning("Table models", modelResult) : null,
      ].filter((warning): warning is string => Boolean(warning)),
    };
  } catch (error) {
    return createEmptyDetailPageData(
      error instanceof Error
        ? `Impossible de charger la demande: ${error.message}`
        : "Impossible de charger la demande.",
    );
  }
}

function createEmptyDetailPageData(error: string | null): RequestDetailPageData {
  return {
    assignees: [],
    assigneesError: null,
    deadlines: [],
    documents: [],
    emails: [],
    error,
    history: [],
    historyContext: null,
    request: null,
    tasks: [],
    validations: [],
    warnings: [],
  };
}

async function selectRelatedByRequestId(resource: string, requestId: string) {
  const candidateColumns = [
    "request_id",
    "parent_request_id",
    "source_request_id",
  ] as const;

  let latestResult: SupabaseRestResponse<SupabaseRecord[]> | null = null;

  for (const column of candidateColumns) {
    const result = await supabaseRestSelectList<SupabaseRecord>(resource, {
      [column]: `eq.${requestId}`,
      order: "updated_at.desc.nullslast,created_at.desc.nullslast",
      select: "*",
    });

    latestResult = result;

    if (!isMissingSupabaseColumnError(result.rawError)) {
      return result;
    }
  }

  return (
    latestResult ??
    ({
      data: [],
      error: null,
      rawError: null,
      status: 200,
    } satisfies SupabaseRestResponse<SupabaseRecord[]>)
  );
}

function getRelatedWarning(
  resourceLabel: string,
  result: SupabaseRestResponse<SupabaseRecord> | SupabaseRestResponse<SupabaseRecord[]> | null,
) {
  if (!result?.error) {
    return null;
  }

  if (
    isMissingSupabaseResourceError(result.rawError) ||
    isMissingSupabaseColumnError(result.rawError)
  ) {
    return null;
  }

  return `${resourceLabel} indisponible: ${result.error}`;
}
