import "server-only";

import { unstable_noStore as noStore } from "next/cache";

import { getRequestLinkOptions } from "@/features/requests/queries";
import { getEmailRelatedIds, mapEmailRecordToListItem } from "@/features/emails/mappers";
import type { EmailsPageData } from "@/features/emails/types";
import {
  isMissingSupabaseResourceError,
  supabaseRestSelectList,
} from "@/lib/supabase/rest";
import { createSupabaseServerClient, hasSupabaseEnv } from "@/lib/supabase/server";
import { uniqueStrings } from "@/lib/record-helpers";
import type {
  ClientRecord,
  EmailRecord,
  EmailThreadRecord,
  RequestOverview,
} from "@/types/crm";

export async function getEmailsPageData(): Promise<EmailsPageData> {
  noStore();

  if (!hasSupabaseEnv) {
    return {
      emails: [],
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
        emails: [],
        requestOptions: [],
        requestOptionsError: null,
        error:
          "Session Supabase introuvable. Reconnecte-toi pour accéder aux emails métier.",
      };
    }

    const [emailsResult, requestOptionsResult] = await Promise.all([
      supabaseRestSelectList<EmailRecord>("emails", {
        select: "*",
      }),
      getRequestLinkOptions(),
    ]);

    if (emailsResult.error) {
      return {
        emails: [],
        requestOptions: requestOptionsResult.options,
        requestOptionsError: requestOptionsResult.error,
        error: `Impossible de charger les emails: ${emailsResult.error}`,
      };
    }

    const emailRows = emailsResult.data ?? [];
    const relatedIds = emailRows.map(getEmailRelatedIds);
    const clientIds = uniqueStrings(relatedIds.map((item) => item.clientId));
    const requestIds = uniqueStrings(relatedIds.map((item) => item.requestId));
    const threadIds = uniqueStrings(relatedIds.map((item) => item.threadId));

    const [clients, requests, threads] = await Promise.all([
      getClientsByIds(clientIds),
      getRequestsByIds(requestIds),
      getThreadsByIds(threadIds),
    ]);

    const emails = emailRows
      .map((emailRecord) =>
        mapEmailRecordToListItem({
          clientRecordsById: new Map(clients.map((client) => [client.id, client])),
          emailRecord,
          requestRowsById: new Map(
            requests.map((request) => [request.id, request] as const),
          ),
          threadRecordsById: new Map(
            threads.map((thread) => [thread.id, thread] as const),
          ),
        }),
      )
      .sort(sortEmails);

    return {
      emails,
      requestOptions: requestOptionsResult.options,
      requestOptionsError: requestOptionsResult.error,
      error: null,
    };
  } catch (error) {
    return {
      emails: [],
      requestOptions: [],
      requestOptionsError: null,
      error:
        error instanceof Error
          ? `Impossible de charger les emails: ${error.message}`
          : "Impossible de charger les emails.",
    };
  }
}

async function getClientsByIds(clientIds: string[]) {
  if (clientIds.length === 0) {
    return [] as ClientRecord[];
  }

  const result = await supabaseRestSelectList<ClientRecord>("clients", {
    id: buildInFilter(clientIds),
    select: "*",
  });

  if (result.error && !isMissingSupabaseResourceError(result.rawError)) {
    return [] as ClientRecord[];
  }

  return result.data ?? [];
}

async function getRequestsByIds(requestIds: string[]) {
  if (requestIds.length === 0) {
    return [] as RequestOverview[];
  }

  const result = await supabaseRestSelectList<RequestOverview>(
    "v_requests_overview",
    {
      id: buildInFilter(requestIds),
      select: "*",
    },
  );

  if (result.error) {
    return [] as RequestOverview[];
  }

  return result.data ?? [];
}

async function getThreadsByIds(threadIds: string[]) {
  if (threadIds.length === 0) {
    return [] as EmailThreadRecord[];
  }

  const result = await supabaseRestSelectList<EmailThreadRecord>(
    "email_threads",
    {
      id: buildInFilter(threadIds),
      select: "*",
    },
  );

  if (result.error && !isMissingSupabaseResourceError(result.rawError)) {
    return [] as EmailThreadRecord[];
  }

  return result.data ?? [];
}

function buildInFilter(ids: string[]) {
  return `in.(${ids.join(",")})`;
}

function sortEmails(a: { isUnread: boolean; receivedAt: string; status: string }, b: { isUnread: boolean; receivedAt: string; status: string }) {
  const statusScore = (status: string) => {
    if (status === "new") {
      return 3;
    }

    if (status === "review") {
      return 2;
    }

    return 1;
  };

  if (a.isUnread !== b.isUnread) {
    return a.isUnread ? -1 : 1;
  }

  if (statusScore(a.status) !== statusScore(b.status)) {
    return statusScore(b.status) - statusScore(a.status);
  }

  return new Date(b.receivedAt).getTime() - new Date(a.receivedAt).getTime();
}
