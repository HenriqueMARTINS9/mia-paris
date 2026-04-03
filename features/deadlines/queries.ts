import "server-only";

import { unstable_noStore as noStore } from "next/cache";
import { cache } from "react";

import { getRequestLinkOptions } from "@/features/requests/queries";
import { mapDeadlineOverviewToListItem } from "@/features/deadlines/mappers";
import type { DeadlinesPageData } from "@/features/deadlines/types";
import { supabaseRestSelectList } from "@/lib/supabase/rest";
import { createSupabaseServerClient, hasSupabaseEnv } from "@/lib/supabase/server";
import type { DeadlineCritical, DeadlineRecord } from "@/types/crm";

const getDeadlinesPageDataInternal = async (): Promise<DeadlinesPageData> => {
  noStore();

  if (!hasSupabaseEnv) {
    return {
      deadlines: [],
      requestOptions: [],
      requestOptionsError: null,
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
        deadlines: [],
        requestOptions: [],
        requestOptionsError: null,
        error:
          "Session Supabase introuvable. Reconnecte-toi pour accéder aux deadlines.",
      };
    }

    const [deadlinesResult, requestOptionsResult] = await Promise.all([
      supabase
        .from("v_deadlines_critical")
        .select("*")
        .order("deadline_at", { ascending: true, nullsFirst: false })
        .order("priority", { ascending: false }),
      getRequestLinkOptions(),
    ]);

    if (deadlinesResult.error) {
      return {
        deadlines: [],
        requestOptions: requestOptionsResult.options,
        requestOptionsError: requestOptionsResult.error,
        error: `Impossible de charger les deadlines: ${deadlinesResult.error.message}`,
      };
    }

    const deadlineRows = (deadlinesResult.data ?? []) as DeadlineCritical[];
    const deadlineRecords = await getDeadlineRecordsByIds(
      deadlineRows.map((deadline) => deadline.id),
    );
    const deadlineRecordsById = new Map(
      deadlineRecords.map((deadlineRecord) => [deadlineRecord.id, deadlineRecord]),
    );

    return {
      deadlines: deadlineRows.map((deadlineRow) =>
        mapDeadlineOverviewToListItem({
          deadlineRecord: deadlineRecordsById.get(deadlineRow.id) ?? null,
          deadlineRow,
        }),
      ),
      requestOptions: requestOptionsResult.options,
      requestOptionsError: requestOptionsResult.error,
      error: null,
    };
  } catch (error) {
    return {
      deadlines: [],
      requestOptions: [],
      requestOptionsError: null,
      error:
        error instanceof Error
          ? `Impossible de charger les deadlines: ${error.message}`
          : "Impossible de charger les deadlines.",
    };
  }
};

export const getDeadlinesPageData = cache(getDeadlinesPageDataInternal);

async function getDeadlineRecordsByIds(deadlineIds: string[]) {
  if (deadlineIds.length === 0) {
    return [] as DeadlineRecord[];
  }

  const result = await supabaseRestSelectList<DeadlineRecord>("deadlines", {
    id: `in.(${deadlineIds.join(",")})`,
    select:
      "id,label,status,priority,request_id,deadline_at,created_at,updated_at",
  });

  return result.data ?? [];
}
