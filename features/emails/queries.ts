import "server-only";

import { unstable_noStore as noStore } from "next/cache";

import { getRequestLinkOptions } from "@/features/requests/queries";
import {
  getEmailRelatedIds,
  hydrateEmailQualificationFields,
  mapEmailRecordToListItem,
} from "@/features/emails/mappers";
import type {
  EmailQualificationOption,
  EmailsPageData,
} from "@/features/emails/types";
import {
  isMissingSupabaseResourceError,
  supabaseRestSelectList,
} from "@/lib/supabase/rest";
import { createSupabaseServerClient, hasSupabaseEnv } from "@/lib/supabase/server";
import { readString, uniqueStrings } from "@/lib/record-helpers";
import type {
  ClientRecord,
  ContactRecord,
  EmailRecord,
  EmailThreadRecord,
  ModelRecord,
  ProductDepartmentRecord,
  RequestOverview,
} from "@/types/crm";

export async function getEmailsPageData(): Promise<EmailsPageData> {
  noStore();

  const emptyQualificationOptions = {
    clients: [] as EmailQualificationOption[],
    contacts: [] as EmailQualificationOption[],
    models: [] as EmailQualificationOption[],
    productDepartments: [] as EmailQualificationOption[],
  };

  if (!hasSupabaseEnv) {
    return {
      emails: [],
      error:
        "Configuration Supabase absente. Vérifie NEXT_PUBLIC_SUPABASE_URL et la clé publishable.",
      qualificationOptions: emptyQualificationOptions,
      qualificationOptionsError: null,
      requestOptions: [],
      requestOptionsError: null,
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
        error:
          "Session Supabase introuvable. Reconnecte-toi pour accéder aux emails métier.",
        qualificationOptions: emptyQualificationOptions,
        qualificationOptionsError: null,
        requestOptions: [],
        requestOptionsError: null,
      };
    }

    const [emailsResult, requestOptionsResult, qualificationOptionsResult] =
      await Promise.all([
        supabaseRestSelectList<EmailRecord>("emails", {
          select: "*",
        }),
        getRequestLinkOptions(),
        getEmailQualificationOptions(),
      ]);

    if (emailsResult.error) {
      return {
        emails: [],
        error: `Impossible de charger les emails: ${emailsResult.error}`,
        qualificationOptions: qualificationOptionsResult.options,
        qualificationOptionsError: qualificationOptionsResult.error,
        requestOptions: requestOptionsResult.options,
        requestOptionsError: requestOptionsResult.error,
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
      .map((email) =>
        hydrateEmailQualificationFields(email, qualificationOptionsResult.options),
      )
      .sort(sortEmails);

    return {
      emails,
      error: null,
      qualificationOptions: qualificationOptionsResult.options,
      qualificationOptionsError: qualificationOptionsResult.error,
      requestOptions: requestOptionsResult.options,
      requestOptionsError: requestOptionsResult.error,
    };
  } catch (error) {
    return {
      emails: [],
      error:
        error instanceof Error
          ? `Impossible de charger les emails: ${error.message}`
          : "Impossible de charger les emails.",
      qualificationOptions: emptyQualificationOptions,
      qualificationOptionsError: null,
      requestOptions: [],
      requestOptionsError: null,
    };
  }
}

async function getEmailQualificationOptions(): Promise<{
  error: string | null;
  options: EmailsPageData["qualificationOptions"];
}> {
  const [clientsResult, contactsResult, productDepartmentsResult, modelsResult] =
    await Promise.all([
      supabaseRestSelectList<ClientRecord>("clients", {
        select: "*",
      }),
      supabaseRestSelectList<ContactRecord>("contacts", {
        select: "*",
      }),
      supabaseRestSelectList<ProductDepartmentRecord>("product_departments", {
        select: "*",
      }),
      supabaseRestSelectList<ModelRecord>("models", {
        select: "*",
      }),
    ]);

  const errors = [
    collectOptionalResourceError("clients", clientsResult.error, clientsResult.rawError),
    collectOptionalResourceError("contacts", contactsResult.error, contactsResult.rawError),
    collectOptionalResourceError(
      "product_departments",
      productDepartmentsResult.error,
      productDepartmentsResult.rawError,
    ),
    collectOptionalResourceError("models", modelsResult.error, modelsResult.rawError),
  ].filter((value): value is string => Boolean(value));

  return {
    error:
      errors.length > 0
        ? `Certaines options de qualification sont indisponibles: ${errors.join(", ")}.`
        : null,
    options: {
      clients: (clientsResult.data ?? []).map((client) => ({
        id: client.id,
        label:
          readString(client, ["name", "client_name", "account_name"]) ??
          client.id,
        secondary: readString(client, ["code", "client_code"]),
      })),
      contacts: (contactsResult.data ?? []).map((contact) => ({
        id: contact.id,
        label:
          readString(contact, ["full_name", "name", "contact_name"]) ?? contact.id,
        secondary: readString(contact, ["email"]),
        clientId: readString(contact, ["client_id", "clientId"]),
      })),
      productDepartments: (productDepartmentsResult.data ?? []).map(
        (department) => ({
          id: department.id,
          label:
            readString(department, ["name", "label", "department_name"]) ??
            department.id,
          secondary: readString(department, ["code"]),
        }),
      ),
      models: (modelsResult.data ?? []).map((model) => ({
        id: model.id,
        label:
          readString(model, ["name", "label", "reference", "style_name"]) ??
          model.id,
        secondary: readString(model, ["reference", "code"]),
        clientId: readString(model, ["client_id", "clientId"]),
      })),
    },
  };
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

function collectOptionalResourceError(
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
    "code" in rawError &&
    isMissingSupabaseResourceError(rawError as never)
  ) {
    return null;
  }

  return resource;
}

function buildInFilter(ids: string[]) {
  return `in.(${ids.join(",")})`;
}

function sortEmails(
  a: { isUnread: boolean; receivedAt: string; status: string },
  b: { isUnread: boolean; receivedAt: string; status: string },
) {
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
