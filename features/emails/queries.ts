import "server-only";

import { unstable_noStore as noStore } from "next/cache";
import { cache } from "react";

import { getCurrentUserGmailInboxStatus } from "@/features/emails/lib/gmail-sync";
import {
  getEmailRelatedIds,
  mapEmailRecordToListItem,
} from "@/features/emails/mappers";
import type {
  EmailInboxBucket,
  EmailInboxSnapshot,
  EmailListStatusFilter,
  EmailPageSize,
  EmailStatusCounts,
  EmailsPageData,
} from "@/features/emails/types";
import { getRequestLinkOptions } from "@/features/requests/queries";
import {
  extractMissingSupabaseColumnName,
  isMissingSupabaseColumnError,
  isMissingSupabaseResourceError,
  supabaseRestSelectList,
} from "@/lib/supabase/rest";
import { createSupabaseServerClient, hasSupabaseEnv } from "@/lib/supabase/server";
import { readString, uniqueStrings } from "@/lib/record-helpers";
import type {
  ClientRecord,
  EmailAttachmentRecord,
  EmailRecord,
  EmailThreadRecord,
  RequestOverview,
} from "@/types/crm";

const DEFAULT_PAGE_SIZE: EmailPageSize = 10;
const AVAILABLE_PAGE_SIZES: EmailPageSize[] = [10];
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
const EMAIL_LIST_REQUIRED_COLUMNS = [
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
];
const EMAIL_LIST_OPTIONAL_COLUMNS = [
  "assistant_bucket",
  "ai_classification",
  "classification_confidence",
  "assistant_bucket_confidence",
  "assistant_bucket_reason",
];

type EmailStatusFilter = EmailListStatusFilter;
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
    const ancillaries = await getEmailPageAncillariesForMode(shouldLoadDetail);
    const [bucketCountsResult, pageQueryResult] = await Promise.allSettled([
      getEmailBucketCounts(supabase, input),
      getPaginatedEmailRows(supabase, input),
    ]);

    if (pageQueryResult.status === "rejected") {
      return {
        ...emptyData,
        ...ancillaries,
        error: `Impossible de charger les emails: ${resolveUnknownEmailErrorMessage(
          pageQueryResult.reason,
        )}`,
      };
    }

    const resolvedPageQuery = pageQueryResult.value;

    if (resolvedPageQuery.error) {
      return {
        ...emptyData,
        ...ancillaries,
        error: `Impossible de charger les emails: ${resolvedPageQuery.error}`,
      };
    }

    const totalItems = resolvedPageQuery.totalItems;
    const totalPages = Math.max(1, Math.ceil(totalItems / input.perPage));
    const effectivePage = resolvedPageQuery.page;
    const pageRows = resolvedPageQuery.rows;
    const emails = await buildMappedEmails(pageRows);
    const bucketCounts =
      bucketCountsResult.status === "fulfilled"
        ? bucketCountsResult.value
        : buildFallbackBucketCounts({
            emails,
            selectedBucket: input.selectedBucket,
            totalItems,
          });
    const counts = buildPageStatusCounts(emails, totalItems);
    const resolvedSelectedEmailId =
      input.selectedEmailId && emails.some((email) => email.id === input.selectedEmailId)
        ? input.selectedEmailId
        : null;

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
          ? `Impossible de charger les emails: ${resolveUnknownEmailErrorMessage(error)}`
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

async function getEmailPageAncillariesForMode(
  includeDetailOptions: boolean,
): Promise<EmailPageAncillaries> {
  const gmailInbox = await getCurrentUserGmailInboxStatus();
  const emptyAncillaries: Omit<EmailPageAncillaries, "gmailInbox" | "requestOptions" | "requestOptionsError"> =
    {
      documentOptions: {
        models: [],
        orders: [],
        productions: [],
        requests: [],
      },
      documentOptionsError: null,
      qualificationOptions: {
        assignees: [],
        clients: [],
        contacts: [],
        models: [],
        productDepartments: [],
      },
      qualificationOptionsError: null,
    };

  if (!includeDetailOptions) {
    return {
      ...emptyAncillaries,
      gmailInbox,
      requestOptions: [],
      requestOptionsError: null,
    };
  }

  const requestOptionsResult = await getRequestLinkOptions();

  return {
    ...emptyAncillaries,
    gmailInbox,
    requestOptions: requestOptionsResult.options,
    requestOptionsError: requestOptionsResult.error,
  };
}

async function buildMappedEmails(emailRows: EmailRecord[]) {
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

  return mappedEmails.sort(sortEmails);
}

async function getPaginatedEmailRows(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  input: NormalizedEmailQueryInput,
) {
  const initialResult = await fetchEmailPageRows(supabase, input, input.page);
  const exactTotalItems = await countEmailRows(supabase, {
    search: input.search,
    selectedBucket: input.selectedBucket,
    selectedStatus: input.selectedStatus,
  }).catch(() => null);
  const initialTotalItems =
    exactTotalItems ??
    buildApproximateEmailTotal({
      hasNextPage: initialResult.hasNextPage,
      page: input.page,
      perPage: input.perPage,
      visibleItems: initialResult.rows.length,
    });
  const initialTotalPages = Math.max(1, Math.ceil(initialTotalItems / input.perPage));

  if (
    !initialResult.error &&
    exactTotalItems !== null &&
    exactTotalItems > 0 &&
    input.page > initialTotalPages
  ) {
    const clampedPage = initialTotalPages;
    const clampedResult = await fetchEmailPageRows(supabase, input, clampedPage);

    return {
      error: clampedResult.error,
      page: clampedPage,
      rows: clampedResult.rows,
      totalItems: exactTotalItems,
      totalPages: initialTotalPages,
    };
  }

  return {
    error: initialResult.error,
    page: input.page,
    rows: initialResult.rows,
    totalItems: initialTotalItems,
    totalPages: initialTotalPages,
  };
}

async function fetchEmailPageRows(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  input: NormalizedEmailQueryInput,
  page: number,
) {
  const from = (page - 1) * input.perPage;
  const to = from + input.perPage;
  let activeOptionalColumns = [...EMAIL_LIST_OPTIONAL_COLUMNS];

  while (true) {
    const canApplyBucketFilter =
      input.selectedBucket === "all" || activeOptionalColumns.includes("assistant_bucket");
    const query = buildEmailListQuery({
      canApplyBucketFilter,
      input,
      optionalColumns: activeOptionalColumns,
      supabase,
    });
    const queryFrom = canApplyBucketFilter ? from : 0;
    const fallbackWindowSize = Math.max(input.perPage * Math.max(input.page, 1) * 8, 120);
    const queryTo = canApplyBucketFilter ? to : fallbackWindowSize - 1;
    const { data, error } = await query.range(queryFrom, queryTo);

    if (!error) {
      if (!canApplyBucketFilter && input.selectedBucket !== "all") {
        const rawRows = (data ?? []) as EmailRecord[];
        const filteredRows = buildMappedEmailScans(rawRows).filter(
          (email) => email.triage.bucket === input.selectedBucket,
        );
        const visibleFilteredRows = filteredRows.slice(from, from + input.perPage);
        const visibleRowIds = new Set(visibleFilteredRows.map((email) => email.id));
        const rows = rawRows.filter((row) => visibleRowIds.has(row.id));
        const hasNextPage = filteredRows.length > from + input.perPage;

        return {
          error: null,
          hasNextPage,
          rows,
        };
      }

      const rows = ((data ?? []) as EmailRecord[]).slice(0, input.perPage);
      const hasNextPage = ((data ?? []) as EmailRecord[]).length > input.perPage;

      return {
        error: null,
        hasNextPage,
        rows,
      };
    }

    if (!isMissingSupabaseColumnError(error)) {
      return {
        error: resolveSupabaseQueryErrorMessage(error, "La requête email a échoué."),
        hasNextPage: false,
        rows: [],
      };
    }

    const missingColumn = extractMissingSupabaseColumnName(error);

    if (!missingColumn || !activeOptionalColumns.includes(missingColumn)) {
      return {
        error: resolveSupabaseQueryErrorMessage(error, "La requête email a échoué."),
        hasNextPage: false,
        rows: [],
      };
    }

    activeOptionalColumns = activeOptionalColumns.filter(
      (column) => column !== missingColumn,
    );
  }
}

function buildEmailListQuery(input: {
  canApplyBucketFilter: boolean;
  input: NormalizedEmailQueryInput;
  optionalColumns: string[];
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>;
}) {
  let query = input.supabase
    .from("emails")
    .select(
      [...EMAIL_LIST_REQUIRED_COLUMNS, ...input.optionalColumns].join(","),
    ) as unknown as EmailFilterableQuery<EmailListQueryResult>;

  query = applyEmailSearchFilter(query, input.input.search);
  if (input.canApplyBucketFilter) {
    query = applyEmailBucketFilter(query, input.input.selectedBucket);
  }
  query = applyEmailStatusFilter(query, input.input.selectedStatus);
  query = applyEmailOrdering(query);

  return query;
}

async function getEmailBucketCounts(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  input: NormalizedEmailQueryInput,
) {
  const [all, important, promotional, toReview] = await Promise.all([
    countEmailRows(supabase, {
      search: input.search,
      selectedBucket: "all",
      selectedStatus: input.selectedStatus,
    }),
    countEmailRows(supabase, {
      search: input.search,
      selectedBucket: "important",
      selectedStatus: input.selectedStatus,
    }),
    countEmailRows(supabase, {
      search: input.search,
      selectedBucket: "promotional",
      selectedStatus: input.selectedStatus,
    }),
    countEmailRows(supabase, {
      search: input.search,
      selectedBucket: "to_review",
      selectedStatus: input.selectedStatus,
    }),
  ]);

  return {
    all,
    important,
    promotional,
    toReview,
  };
}

async function countEmailRows(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  input: Pick<NormalizedEmailQueryInput, "search" | "selectedBucket" | "selectedStatus">,
) {
  let query = supabase
    .from("emails")
    .select("id", { count: "exact", head: true }) as unknown as EmailFilterableQuery<EmailQueryResult>;

  query = applyEmailSearchFilter(query, input.search);
  query = applyEmailBucketFilter(query, input.selectedBucket);
  query = applyEmailStatusFilter(query, input.selectedStatus);

  const { count, error } = await query;

  if (error) {
    throw new Error(
      resolveSupabaseQueryErrorMessage(error, "Le comptage des emails a échoué."),
    );
  }

  return count ?? 0;
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

interface EmailQueryResult {
  count: number | null;
  error: { message: string } | null;
}

interface EmailListQueryResult extends EmailQueryResult {
  data: unknown[] | null;
}

interface EmailFilterableQuery<TResult> extends EmailOrderableQuery, EmailSearchableQuery {
  eq: (column: string, value: string | boolean) => EmailFilterableQuery<TResult>;
  range: (from: number, to: number) => Promise<TResult>;
  then: PromiseLike<TResult>["then"];
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

function applyEmailBucketFilter<TResult, T extends EmailFilterableQuery<TResult>>(query: T, bucket: EmailBucketFilter): T {
  if (bucket === "all") {
    return query;
  }

  return query.eq("assistant_bucket", bucket) as T;
}

function applyEmailStatusFilter<TResult, T extends EmailFilterableQuery<TResult>>(query: T, status: EmailStatusFilter): T {
  if (status === "review") {
    return query.eq("processing_status", "review") as T;
  }

  if (status === "processed") {
    return query.eq("is_processed", true) as T;
  }

  return query;
}

function buildApproximateEmailTotal(input: {
  hasNextPage: boolean;
  page: number;
  perPage: number;
  visibleItems: number;
}) {
  const from = (input.page - 1) * input.perPage;
  return from + input.visibleItems + (input.hasNextPage ? 1 : 0);
}

function buildFallbackBucketCounts(input: {
  emails: EmailsPageData["emails"];
  selectedBucket: EmailBucketFilter;
  totalItems: number;
}) {
  if (input.selectedBucket === "all") {
    const pageCounts = countEmailBuckets(input.emails);
    return {
      ...pageCounts,
      all: input.totalItems,
    };
  }

  return {
    all: input.totalItems,
    important: input.selectedBucket === "important" ? input.totalItems : 0,
    promotional: input.selectedBucket === "promotional" ? input.totalItems : 0,
    toReview: input.selectedBucket === "to_review" ? input.totalItems : 0,
  };
}

function resolveSupabaseQueryErrorMessage(
  error: { message?: string | null },
  fallbackMessage: string,
) {
  const message = error.message?.trim();
  return message && message.length > 0 ? message : fallbackMessage;
}

function resolveUnknownEmailErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message.trim().length > 0
      ? error.message
      : "Le chargement des emails a échoué.";
  }

  return "Le chargement des emails a échoué.";
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
  const selectedStatus = (["all", "review", "processed"] as const).includes(
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
      clients: [],
      contacts: [],
      models: [],
      productDepartments: [],
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

function buildPageStatusCounts(
  emails: EmailsPageData["emails"],
  totalItems: number,
): EmailStatusCounts {
  const pageCounts = countEmailStatuses(emails);

  return {
    ...pageCounts,
    total: totalItems,
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
