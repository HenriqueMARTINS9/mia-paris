import "server-only";

import { unstable_noStore as noStore } from "next/cache";
import { cache } from "react";

import type {
  DailySummariesPageData,
  DailySummaryClientSection,
  DailySummaryListItem,
} from "@/features/daily-summaries/types";
import { createSupabaseServerClient, hasSupabaseEnv } from "@/lib/supabase/server";
import { readString } from "@/lib/record-helpers";

interface DailySummaryRecord {
  client_summaries?: unknown;
  created_at?: string | null;
  generated_at?: string | null;
  highlights?: unknown;
  id?: string | null;
  next_actions?: unknown;
  overview?: string | null;
  risks?: unknown;
  source?: string | null;
  summary_date?: string | null;
  summary_time?: string | null;
  title?: string | null;
  updated_at?: string | null;
}

const DAILY_SUMMARIES_SELECT = [
  "id",
  "summary_date",
  "summary_time",
  "generated_at",
  "title",
  "overview",
  "highlights",
  "risks",
  "next_actions",
  "client_summaries",
  "source",
  "created_at",
  "updated_at",
].join(",");

const getDailySummariesPageDataInternal = async (): Promise<DailySummariesPageData> => {
  noStore();

  if (!hasSupabaseEnv) {
    return {
      error:
        "Configuration Supabase absente. Vérifie NEXT_PUBLIC_SUPABASE_URL et la clé publishable.",
      summaries: [],
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
        error:
          "Session Supabase introuvable. Reconnecte-toi pour consulter les synthèses.",
        summaries: [],
      };
    }

    const { data, error } = await supabase
      .from("daily_summaries")
      .select(DAILY_SUMMARIES_SELECT)
      .order("generated_at", { ascending: false })
      .limit(30);

    if (error) {
      return {
        error: `Impossible de charger les synthèses: ${error.message}`,
        summaries: [],
      };
    }

    return {
      error: null,
      summaries: ((data ?? []) as DailySummaryRecord[]).map(mapDailySummaryRecord),
    };
  } catch (error) {
    return {
      error:
        error instanceof Error
          ? `Impossible de charger les synthèses: ${error.message}`
          : "Impossible de charger les synthèses.",
      summaries: [],
    };
  }
};

export const getDailySummariesPageData = cache(getDailySummariesPageDataInternal);

function mapDailySummaryRecord(record: DailySummaryRecord): DailySummaryListItem {
  const generatedAt = record.generated_at ?? record.created_at ?? new Date().toISOString();

  return {
    clientSummaries: normalizeClientSummaries(record.client_summaries),
    createdAt: record.created_at ?? generatedAt,
    generatedAt,
    highlights: normalizeStringArray(record.highlights),
    id: record.id ?? generatedAt,
    nextActions: normalizeStringArray(record.next_actions),
    overview: record.overview ?? "Synthèse non renseignée.",
    risks: normalizeStringArray(record.risks),
    source: record.source ?? "assistant",
    summaryDate: record.summary_date ?? generatedAt.slice(0, 10),
    summaryTime: normalizeSummaryTime(record.summary_time, generatedAt),
    title: record.title ?? "Synthèse quotidienne",
    updatedAt: record.updated_at ?? generatedAt,
  };
}

function normalizeClientSummaries(value: unknown): DailySummaryClientSection[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter(isRecord)
    .map((item) => ({
      clientName: readString(item, ["clientName", "client_name"]) ?? "Client non identifié",
      decisions: normalizeStringArray(item.decisions),
      emailIds: normalizeStringArray(readUnknownArray(item, ["emailIds", "email_ids"])),
      highlights: normalizeStringArray(item.highlights),
      nextActions: normalizeStringArray(readUnknownArray(item, ["nextActions", "next_actions"])),
      requestIds: normalizeStringArray(readUnknownArray(item, ["requestIds", "request_ids"])),
      risks: normalizeStringArray(item.risks),
      summary: readString(item, ["summary"]) ?? "Aucun résumé client renseigné.",
      taskIds: normalizeStringArray(readUnknownArray(item, ["taskIds", "task_ids"])),
    }));
}

function normalizeStringArray(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 12);
}

function normalizeSummaryTime(value: string | null | undefined, fallbackIso: string) {
  if (typeof value === "string" && value.trim().length > 0) {
    return value.slice(0, 5);
  }

  return new Intl.DateTimeFormat("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Paris",
  }).format(new Date(fallbackIso));
}

function readUnknownArray(record: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    if (key in record) {
      return record[key];
    }
  }

  return [];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
