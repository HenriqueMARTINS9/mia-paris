import "server-only";

import { unstable_noStore as noStore } from "next/cache";
import { cache } from "react";

import { getDocumentFormOptions } from "@/features/documents/queries";
import { getCurrentUserGmailInboxStatus } from "@/features/emails/lib/gmail-sync";
import {
  getEmailRelatedIds,
  hydrateEmailQualificationFields,
  mapEmailRecordToListItem,
} from "@/features/emails/mappers";
import type {
  EmailInboxBucket,
  EmailInboxSnapshot,
  EmailPageSize,
  EmailProcessingStatus,
  EmailQualificationOption,
  EmailStatusCounts,
  EmailsPageData,
} from "@/features/emails/types";
import {
  getRequestAssigneeOptions,
  getRequestLinkOptions,
} from "@/features/requests/queries";
import {
  isMissingSupabaseResourceError,
  supabaseRestSelectList,
} from "@/lib/supabase/rest";
import { createSupabaseServerClient, hasSupabaseEnv } from "@/lib/supabase/server";
import { readString, uniqueStrings } from "@/lib/record-helpers";
import type {
  ClientRecord,
  ContactRecord,
  EmailAttachmentRecord,
  EmailRecord,
  EmailThreadRecord,
  ModelRecord,
  ProductDepartmentRecord,
  RequestOverview,
} from "@/types/crm";

const DEFAULT_PAGE_SIZE: EmailPageSize = 15;
const AVAILABLE_PAGE_SIZES: EmailPageSize[] = [10, 15];
const EMAIL_SCAN_SELECT = [
  "id",
  "inbox_id",
  "thread_id",
  "request_id",
  "client_id",
  "assigned_user_id",
  "from_name",
  "from_email",
  "subject",
  "preview_text",
  "direction",
  "status",
  "processing_status",
  "is_processed",
  "is_unread",
  "ai_summary",
  "received_at",
  "created_at",
  "updated_at",
].join(",");

type EmailStatusFilter = "all" | EmailProcessingStatus;
type EmailBucketFilter = "all" | EmailInboxBucket;

interface EmailPageAncillaries {
  documentOptions: EmailsPageData["documentOptions"];
  documentOptionsError: string | null;
  gmailInbox: EmailsPageData["gmailInbox"];
  qualificationOptions: EmailsPageData["qualificationOptions"];
  qualificationOptionsError: string | null;
  requestOptions: EmailsPageData["requestOptions"];
  requestOptionsError: string | null;
}

interface NormalizedEmailQueryInput {
  page: number;
  perPage: EmailPageSize;
  search: string;
  selectedEmailId: string | null;
  selectedBucket: EmailBucketFilter;
  selectedStatus: EmailStatusFilter;
}

const getEmailsPageDataInternal = async (): Promise<EmailsPageData> => {
  noStore();

  const input = normalizeEmailQueryInput();
  const emptyData = createEmptyEmailsPageData(input);

  if (!hasSupabaseEnv) {
    return {
      ...emptyData,
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
        ...emptyData,
        error:
          "Session Supabase introuvable. Reconnecte-toi pour accéder aux emails métier.",
      };
    }

    const [ancillaries, emailsResult] = await Promise.all([
      getEmailPageAncillariesForMode(false),
      supabaseRestSelectList<EmailRecord>("emails", {
        select: EMAIL_SCAN_SELECT,
      }),
    ]);

    if (emailsResult.error) {
      return {
        ...emptyData,
        ...ancillaries,
        error: `Impossible de charger les emails: ${emailsResult.error}`,
      };
    }

    const emails = buildMappedEmailScans(
      emailsResult.data ?? [],
    );
    const bucketCounts = countEmailBuckets(emails);
    const counts = countEmailStatuses(emails);

    return {
      ...ancillaries,
      bucketCounts,
      counts,
      emails,
      error: null,
      filters: {
        search: "",
        selectedBucket: "all",
        selectedStatus: "all",
      },
      pagination: {
        page: 1,
        perPage: DEFAULT_PAGE_SIZE,
        totalItems: emails.length,
        totalPages: 1,
      },
      selectedEmailId: emails[0]?.id ?? null,
    };
  } catch (error) {
    return {
      ...emptyData,
      error:
        error instanceof Error
          ? `Impossible de charger les emails: ${error.message}`
          : "Impossible de charger les emails.",
    };
  }
};

export const getEmailsPageData = cache(getEmailsPageDataInternal);

const getPaginatedEmailsPageDataInternal = async (
  page = 1,
  perPage: EmailPageSize = DEFAULT_PAGE_SIZE,
  search = "",
  selectedBucket: EmailBucketFilter = "important",
  selectedStatus: EmailStatusFilter = "all",
  selectedEmailId: string | null = null,
): Promise<EmailsPageData> => {
  noStore();

  const input = normalizeEmailQueryInput({
    page,
    perPage,
    search,
    selectedBucket,
    selectedEmailId,
    selectedStatus,
  });
  const emptyData = createEmptyEmailsPageData(input);

  if (!hasSupabaseEnv) {
    return {
      ...emptyData,
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
        ...emptyData,
        error:
          "Session Supabase introuvable. Reconnecte-toi pour accéder aux emails métier.",
      };
    }

    const shouldLoadDetail = Boolean(input.selectedEmailId);
    const [ancillaries, rowsResult] = await Promise.all([
      getEmailPageAncillariesForMode(shouldLoadDetail),
      getFilteredEmailRows(supabase, input),
    ]);

    if (rowsResult.error) {
      return {
        ...emptyData,
        ...ancillaries,
        error: `Impossible de charger les emails: ${rowsResult.error}`,
      };
    }

    const scannedEmails = buildMappedEmailScans(
      rowsResult.rows,
    );
    const counts = countEmailStatuses(scannedEmails);
    const statusFilteredEmails = filterEmailsByStatus(
      scannedEmails,
      input.selectedStatus,
    );
    const bucketCounts = countEmailBuckets(statusFilteredEmails);
    const bucketFilteredEmails = filterEmailsByBucket(
      statusFilteredEmails,
      input.selectedBucket,
    );
    const totalItems = bucketFilteredEmails.length;
    const totalPages = Math.max(1, Math.ceil(totalItems / input.perPage));
    const effectivePage =
      totalItems > 0 && input.page > totalPages ? totalPages : input.page;
    const from = (effectivePage - 1) * input.perPage;
    const pageEmailIds = bucketFilteredEmails
      .slice(from, from + input.perPage)
      .map((email) => email.id);
    const pageEmailIdSet = new Set(pageEmailIds);
    const pageScanEmails = orderEmailsByIds(
      bucketFilteredEmails.filter((email) => pageEmailIdSet.has(email.id)),
      pageEmailIds,
    );
    const selectedEmailResult =
      shouldLoadDetail && input.selectedEmailId && pageEmailIdSet.has(input.selectedEmailId)
        ? await getEmailById(supabase, input.selectedEmailId)
        : null;
    const hydratedSelectedEmail =
      selectedEmailResult?.row && !selectedEmailResult.error
        ? (
            await buildMappedEmails(
              [selectedEmailResult.row],
              ancillaries.qualificationOptions,
            )
          )[0] ?? null
        : null;
    const emails = hydratedSelectedEmail
      ? pageScanEmails.map((email) =>
          email.id === hydratedSelectedEmail.id ? hydratedSelectedEmail : email,
        )
      : pageScanEmails;
    const resolvedSelectedEmailId =
      emails.find((email) => email.id === input.selectedEmailId)?.id ??
      emails[0]?.id ??
      null;

    return {
      ...ancillaries,
      bucketCounts,
      counts,
      emails,
      error: null,
      filters: {
        search: input.search,
        selectedBucket: input.selectedBucket,
        selectedStatus: input.selectedStatus,
      },
      pagination: {
        page: effectivePage,
        perPage: input.perPage,
        totalItems,
        totalPages,
      },
      selectedEmailId: resolvedSelectedEmailId,
    };
  } catch (error) {
    return {
      ...emptyData,
      error:
        error instanceof Error
          ? `Impossible de charger les emails: ${error.message}`
          : "Impossible de charger les emails.",
    };
  }
};

export const getPaginatedEmailsPageData = cache(getPaginatedEmailsPageDataInternal);

const getEmailInboxSnapshotInternal = async (
  limit = 6,
): Promise<EmailInboxSnapshot> => {
  noStore();

  const emptyData: EmailInboxSnapshot = {
    bucketCounts: {
      important: 0,
      promotional: 0,
      toReview: 0,
    },
    counts: {
      open: 0,
      review: 0,
      total: 0,
    },
    error: null,
    gmailInbox: createDisconnectedGmailInbox(),
    latestEmails: [],
  };

  if (!hasSupabaseEnv) {
    return {
      ...emptyData,
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
        ...emptyData,
        error:
          "Session Supabase introuvable. Reconnecte-toi pour accéder aux emails métier.",
      };
    }

    const [gmailInbox, latestRowsResult] = await Promise.all([
      getCurrentUserGmailInboxStatus(),
      getLatestEmailRows(supabase, limit),
    ]);

    if (latestRowsResult.error) {
      return {
        bucketCounts: {
          important: 0,
          promotional: 0,
          toReview: 0,
        },
        counts: {
          open: 0,
          review: 0,
          total: 0,
        },
        error: `Impossible de charger les emails: ${latestRowsResult.error}`,
        gmailInbox,
        latestEmails: [],
      };
    }

    const latestEmails = buildMappedEmailScans(latestRowsResult.rows);
    const counts = countEmailStatuses(latestEmails);
    const bucketCounts = countEmailBuckets(latestEmails);
    const signalEmails = latestEmails.filter(
      (email) => email.triage.bucket !== "promotional",
    );

    return {
      bucketCounts: {
        important: bucketCounts.important,
        promotional: bucketCounts.promotional,
        toReview: bucketCounts.toReview,
      },
      counts: {
        open: counts.open,
        review: counts.review,
        total: counts.total,
      },
      error: null,
      gmailInbox,
      latestEmails: signalEmails.length > 0 ? signalEmails.slice(0, limit) : latestEmails,
    };
  } catch (error) {
    return {
      ...emptyData,
      error:
        error instanceof Error
          ? `Impossible de charger les emails: ${error.message}`
          : "Impossible de charger les emails.",
    };
  }
};

export const getEmailInboxSnapshot = cache(getEmailInboxSnapshotInternal);

const getEmailQualificationOptions = cache(async (): Promise<{
  error: string | null;
  options: Omit<EmailsPageData["qualificationOptions"], "assignees">;
}> => {
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
});

async function getEmailPageAncillariesForMode(
  includeDetailOptions: boolean,
): Promise<EmailPageAncillaries> {
  const gmailInbox = await getCurrentUserGmailInboxStatus();

  if (!includeDetailOptions) {
    return {
      documentOptions: {
        models: [],
        orders: [],
        productions: [],
        requests: [],
      },
      documentOptionsError: null,
      gmailInbox,
      qualificationOptions: {
        assignees: [],
        clients: [],
        contacts: [],
        models: [],
        productDepartments: [],
      },
      qualificationOptionsError: null,
      requestOptions: [],
      requestOptionsError: null,
    };
  }

  const [
    requestOptionsResult,
    qualificationOptionsResult,
    assigneesResult,
    documentOptionsResult,
  ] = await Promise.all([
    getRequestLinkOptions(),
    getEmailQualificationOptions(),
    getRequestAssigneeOptions(),
    getDocumentFormOptions(),
  ]);

  return {
    documentOptions: documentOptionsResult.options,
    documentOptionsError: documentOptionsResult.error,
    gmailInbox,
    qualificationOptions: {
      ...qualificationOptionsResult.options,
      assignees: assigneesResult.assignees,
    },
    qualificationOptionsError: buildQualificationOptionsError(
      qualificationOptionsResult.error,
      assigneesResult.error,
    ),
    requestOptions: requestOptionsResult.options,
    requestOptionsError: requestOptionsResult.error,
  };
}

async function buildMappedEmails(
  emailRows: EmailRecord[],
  qualificationOptions?: Omit<EmailsPageData["qualificationOptions"], "assignees">,
) {
  const relatedIds = emailRows.map(getEmailRelatedIds);
  const clientIds = uniqueStrings(relatedIds.map((item) => item.clientId));
  const emailIds = uniqueStrings(emailRows.map((email) => email.id));
  const requestIds = uniqueStrings(relatedIds.map((item) => item.requestId));
  const threadIds = uniqueStrings(relatedIds.map((item) => item.threadId));

  const [attachments, clients, requests, threads] = await Promise.all([
    getAttachmentsByEmailIds(emailIds),
    getClientsByIds(clientIds),
    getRequestsByIds(requestIds),
    getThreadsByIds(threadIds),
  ]);

  const attachmentRecordsByEmailId = new Map<string, EmailAttachmentRecord[]>();

  for (const attachment of attachments) {
    const emailId = readString(attachment, ["email_id", "emailId"]);

    if (!emailId) {
      continue;
    }

    const currentRows = attachmentRecordsByEmailId.get(emailId) ?? [];
    currentRows.push(attachment);
    attachmentRecordsByEmailId.set(emailId, currentRows);
  }

  const clientRecordsById = new Map(clients.map((client) => [client.id, client] as const));
  const requestRowsById = new Map(
    requests.map((request) => [request.id, request] as const),
  );
  const threadRecordsById = new Map(
    threads.map((thread) => [thread.id, thread] as const),
  );

  const mappedEmails = emailRows.map((emailRecord) =>
    mapEmailRecordToListItem({
      attachmentRecordsByEmailId,
      clientRecordsById,
      emailRecord,
      requestRowsById,
      threadRecordsById,
    }),
  );

  return (qualificationOptions
    ? mappedEmails.map((email) =>
        hydrateEmailQualificationFields(email, qualificationOptions),
      )
    : mappedEmails
  ).sort(sortEmails);
}

async function getFilteredEmailRows(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  input: NormalizedEmailQueryInput,
) {
  let query = supabase.from("emails").select(EMAIL_SCAN_SELECT);
  query = applyEmailSearchFilter(query, input.search);
  query = applyEmailOrdering(query);

  const { data, error } = await query;

  return {
    error: error?.message ?? null,
    rows: (data ?? []) as EmailRecord[],
  };
}

async function getLatestEmailRows(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  limit: number,
) {
  const { data, error } = await applyEmailOrdering(
    supabase.from("emails").select(EMAIL_SCAN_SELECT),
  ).limit(limit);

  return {
    error: error?.message ?? null,
    rows: (data ?? []) as EmailRecord[],
  };
}

interface EmailOrderableQuery {
  order: (
    column: string,
    options?: { ascending?: boolean; nullsFirst?: boolean },
  ) => EmailOrderableQuery;
}

interface EmailSearchableQuery {
  or: (filters: string) => unknown;
}

function applyEmailOrdering<T>(query: T): T {
  const orderableQuery = query as unknown as EmailOrderableQuery;

  return orderableQuery
    .order("received_at", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false, nullsFirst: false }) as unknown as T;
}

function applyEmailSearchFilter<T>(query: T, search: string): T {
  const normalizedSearch = sanitizeEmailSearch(search);

  if (!normalizedSearch) {
    return query;
  }

  const searchExpression = [
    `from_name.ilike.*${normalizedSearch}*`,
    `from_email.ilike.*${normalizedSearch}*`,
    `subject.ilike.*${normalizedSearch}*`,
    `preview_text.ilike.*${normalizedSearch}*`,
  ].join(",");

  return (query as unknown as EmailSearchableQuery).or(searchExpression) as T;
}

function sanitizeEmailSearch(value: string) {
  return value.replace(/[%*,()]/g, " ").trim();
}

function filterEmailsByStatus(
  emails: EmailsPageData["emails"],
  status: EmailStatusFilter,
) {
  if (status === "all") {
    return emails;
  }

  return emails.filter((email) => email.status === status);
}

function filterEmailsByBucket(
  emails: EmailsPageData["emails"],
  bucket: EmailBucketFilter,
) {
  if (bucket === "all") {
    return emails;
  }

  return emails.filter((email) => email.triage.bucket === bucket);
}

function countEmailStatuses(emails: EmailsPageData["emails"]): EmailStatusCounts {
  return emails.reduce(
    (counts, email) => {
      counts.total += 1;

      if (email.status === "new") {
        counts.new += 1;
      } else if (email.status === "review") {
        counts.review += 1;
      } else {
        counts.processed += 1;
      }

      if (
        email.summary !== null ||
        email.confidence !== null ||
        email.classification.raw !== null
      ) {
        counts.qualified += 1;
      }

      counts.open = counts.new + counts.review;

      return counts;
    },
    createEmptyEmailCounts(),
  );
}

function countEmailBuckets(emails: EmailsPageData["emails"]) {
  return emails.reduce(
    (counts, email) => {
      counts.all += 1;

      if (email.triage.bucket === "important") {
        counts.important += 1;
      } else if (email.triage.bucket === "promotional") {
        counts.promotional += 1;
      } else {
        counts.toReview += 1;
      }

      return counts;
    },
    {
      all: 0,
      important: 0,
      promotional: 0,
      toReview: 0,
    },
  );
}

function buildMappedEmailScans(emailRows: EmailRecord[]) {
  const emptyAttachmentRecordsByEmailId = new Map<string, EmailAttachmentRecord[]>();
  const emptyClientRecordsById = new Map<string, ClientRecord>();
  const emptyRequestRowsById = new Map<string, RequestOverview>();
  const emptyThreadRecordsById = new Map<string, EmailThreadRecord>();

  return emailRows
    .map((emailRecord) =>
      mapEmailRecordToListItem({
        attachmentRecordsByEmailId: emptyAttachmentRecordsByEmailId,
        clientRecordsById: emptyClientRecordsById,
        emailRecord,
        requestRowsById: emptyRequestRowsById,
        threadRecordsById: emptyThreadRecordsById,
      }),
    )
    .sort(sortEmails);
}

async function getEmailById(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  id: string,
) {
  const { data, error } = await supabase.from("emails").select("*").eq("id", id).maybeSingle();

  return {
    error: error?.message ?? null,
    row: (data as EmailRecord | null) ?? null,
  };
}

function orderEmailsByIds<T extends { id: string }>(emails: T[], ids: string[]) {
  const orderById = new Map(ids.map((id, index) => [id, index] as const));

  return [...emails].sort(
    (left, right) => (orderById.get(left.id) ?? 0) - (orderById.get(right.id) ?? 0),
  );
}

function normalizeEmailQueryInput(
  input?: Partial<NormalizedEmailQueryInput>,
): NormalizedEmailQueryInput {
  const requestedPerPage = Number(input?.perPage);
  const perPage = AVAILABLE_PAGE_SIZES.includes(requestedPerPage as EmailPageSize)
    ? (requestedPerPage as EmailPageSize)
    : DEFAULT_PAGE_SIZE;
  const requestedPage = Number(input?.page);
  const page = Number.isFinite(requestedPage) && requestedPage > 0
    ? Math.floor(requestedPage)
    : 1;
  const selectedBucket = (["all", "important", "promotional", "to_review"] as const).includes(
    (input?.selectedBucket ?? "important") as EmailBucketFilter,
  )
    ? ((input?.selectedBucket ?? "important") as EmailBucketFilter)
    : "important";
  const selectedStatus = (["all", "new", "review", "processed"] as const).includes(
    (input?.selectedStatus ?? "all") as EmailStatusFilter,
  )
    ? ((input?.selectedStatus ?? "all") as EmailStatusFilter)
    : "all";

  return {
    page,
    perPage,
    search: typeof input?.search === "string" ? input.search.trim() : "",
    selectedEmailId:
      typeof input?.selectedEmailId === "string" && input.selectedEmailId.trim().length > 0
        ? input.selectedEmailId.trim()
        : null,
    selectedBucket,
    selectedStatus,
  };
}

function createEmptyEmailsPageData(
  input: NormalizedEmailQueryInput,
): EmailsPageData {
  return {
    bucketCounts: {
      all: 0,
      important: 0,
      promotional: 0,
      toReview: 0,
    },
    counts: createEmptyEmailCounts(),
    documentOptions: {
      models: [],
      orders: [],
      productions: [],
      requests: [],
    },
    documentOptionsError: null,
    emails: [],
    error: null,
    filters: {
      search: input.search,
      selectedBucket: input.selectedBucket,
      selectedStatus: input.selectedStatus,
    },
    gmailInbox: createDisconnectedGmailInbox(),
    pagination: {
      page: input.page,
      perPage: input.perPage,
      totalItems: 0,
      totalPages: 1,
    },
    qualificationOptions: {
      assignees: [],
      clients: [] as EmailQualificationOption[],
      contacts: [] as EmailQualificationOption[],
      models: [] as EmailQualificationOption[],
      productDepartments: [] as EmailQualificationOption[],
    },
    qualificationOptionsError: null,
    requestOptions: [],
    requestOptionsError: null,
    selectedEmailId: input.selectedEmailId,
  };
}

function createDisconnectedGmailInbox(): EmailsPageData["gmailInbox"] {
  return {
    connected: false,
    emailAddress: null,
    error: null,
    inboxId: null,
    lastSyncedAt: null,
  };
}

function createEmptyEmailCounts(): EmailStatusCounts {
  return {
    new: 0,
    open: 0,
    processed: 0,
    qualified: 0,
    review: 0,
    total: 0,
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

async function getAttachmentsByEmailIds(emailIds: string[]) {
  if (emailIds.length === 0) {
    return [] as EmailAttachmentRecord[];
  }

  const result = await supabaseRestSelectList<EmailAttachmentRecord>(
    "email_attachments",
    {
      email_id: buildInFilter(emailIds),
      select: "*",
    },
  );

  if (result.error && !isMissingSupabaseResourceError(result.rawError)) {
    return [] as EmailAttachmentRecord[];
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

function buildQualificationOptionsError(
  qualificationOptionsError: string | null,
  assigneesError: string | null,
) {
  return [qualificationOptionsError, assigneesError].filter(Boolean).join(" · ") || null;
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
