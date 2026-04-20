import "server-only";

import type {
  AssistantEmailOpsCycleItem,
  AssistantRunEmailOpsCycleResult,
} from "@/features/assistant-actions/types";
import type { AssistantMutationActorContext } from "@/features/assistant-actions/execution-context";
import type { EmailInboxBucket, EmailQualificationDraft } from "@/features/emails/types";
import { resolveEmailInboxTriage } from "@/features/emails/lib/inbox-triage";
import {
  buildEmailQualificationDraft,
  mergeEmailQualificationDraft,
} from "@/features/emails/lib/qualification";
import { syncLatestGmailMessagesForActor } from "@/features/emails/lib/gmail-sync";
import { logOperationalError } from "@/lib/action-runtime";
import {
  parseJsonObject,
  readBoolean,
  readNumber,
  readObject,
  readString,
  uniqueStrings,
} from "@/lib/record-helpers";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  extractMissingSupabaseColumnName,
  isMissingSupabaseColumnError,
  supabaseRestPatch,
  type SupabaseRestExecutionContext,
} from "@/lib/supabase/rest";
import type { RequestPriority } from "@/features/requests/types";
import type {
  ClientRecord,
  ContactRecord,
  EmailAttachmentRecord,
  EmailRecord,
  ModelRecord,
  ProductDepartmentRecord,
} from "@/types/crm";

const DEFAULT_EMAIL_OPS_LIMIT = 15;
const DEFAULT_SYNC_LIMIT = 50;
const MAX_EMAIL_OPS_LIMIT = 40;
const MAX_SYNC_LIMIT = 100;

interface EmailOpsReferenceData {
  attachmentCountByEmailId: Map<string, number>;
  clients: ClientRecord[];
  contacts: ContactRecord[];
  models: ModelRecord[];
  productDepartments: ProductDepartmentRecord[];
}

export interface RunAssistantEmailOpsCycleOptions {
  actor?: AssistantMutationActorContext | null;
  limit?: number | null;
  rest?: SupabaseRestExecutionContext | null;
  syncLimit?: number | null;
}

export async function runAssistantEmailOpsCycle(
  options?: RunAssistantEmailOpsCycleOptions,
): Promise<{
  message: string;
  ok: boolean;
  result: AssistantRunEmailOpsCycleResult;
}> {
  const processLimit = clampInteger(
    options?.limit,
    DEFAULT_EMAIL_OPS_LIMIT,
    1,
    MAX_EMAIL_OPS_LIMIT,
  );
  const syncLimit = clampInteger(
    options?.syncLimit,
    DEFAULT_SYNC_LIMIT,
    1,
    MAX_SYNC_LIMIT,
  );
  const sync = await syncLatestGmailMessagesForActor(syncLimit, {
    actorUserId: options?.actor?.actorUserId ?? null,
  });
  const candidates = await loadEmailOpsCandidates(processLimit);
  const references = await loadEmailOpsReferenceData(
    candidates.map((candidate) => candidate.id),
  );
  const result: AssistantRunEmailOpsCycleResult = {
    crmEnrichedCount: 0,
    errorCount: 0,
    importantCount: 0,
    items: [],
    processedCount: 0,
    promotionalCount: 0,
    skippedCount: 0,
    sync,
    toReviewCount: 0,
  };

  // Process sequentially to keep assistant decisions predictable email by email.
  for (const email of candidates) {
    const emailResult = await classifySingleEmail(email, references, {
      actor: options?.actor ?? null,
      rest: options?.rest ?? null,
    });

    result.items.push(emailResult.item);

    if (emailResult.item.status === "classified") {
      result.processedCount += 1;

      if (emailResult.enrichedCrm) {
        result.crmEnrichedCount += 1;
      }

      if (emailResult.item.bucket === "important") {
        result.importantCount += 1;
      }

      if (emailResult.item.bucket === "promotional") {
        result.promotionalCount += 1;
      }

      if (emailResult.item.bucket === "to_review") {
        result.toReviewCount += 1;
      }
    }

    if (emailResult.item.status === "skipped") {
      result.skippedCount += 1;
    }

    if (emailResult.item.status === "error") {
      result.errorCount += 1;
    }
  }

  const ok = result.processedCount > 0 || (sync.ok && result.errorCount === 0);
  const message = buildEmailOpsMessage(result);

  return {
    message,
    ok,
    result,
  };
}

async function classifySingleEmail(
  email: EmailRecord,
  references: EmailOpsReferenceData,
  options: {
    actor: AssistantMutationActorContext | null;
    rest: SupabaseRestExecutionContext | null;
  },
): Promise<{
  enrichedCrm: boolean;
  item: AssistantEmailOpsCycleItem;
}> {
  const subject = readString(email, ["subject"]) ?? "Sans objet";
  const fromEmail = readString(email, ["from_email"]) ?? "";
  const fromName = readString(email, ["from_name"]) ?? "";
  const previewText = readString(email, ["preview_text"]) ?? "";
  const bodyText = readString(email, ["body_text"]) ?? null;
  const storedClassification = readStoredClassification(email);

  if (!needsAssistantHandling(email, storedClassification)) {
    return {
      enrichedCrm: false,
      item: {
        bucket:
          normalizeBucket(
            readString(storedClassification, [
              "assistant_bucket",
              "assistantBucket",
              "bucket",
            ]),
          ) ?? null,
        clientName:
          readString(storedClassification, ["client_name", "client"]) ??
          readString(email, ["detected_client_name"]) ??
          null,
        dueAt:
          readString(storedClassification, ["due_at", "deadline"]) ??
          readString(email, ["detected_deadline"]) ??
          null,
        emailId: email.id,
        from: fromName || fromEmail,
        priority: readPriorityFromSources(storedClassification, email),
        reason: "Email déjà qualifié par l’assistant.",
        recommendedAction: "Aucun retraitement nécessaire pour ce mail.",
        requestType:
          readString(storedClassification, ["request_type", "type"]) ??
          readString(email, ["detected_type"]) ??
          null,
        status: "skipped",
        subject,
      },
    };
  }

  try {
    const baseDraft = buildEmailQualificationDraft({
      bodyText,
      fromName,
      previewText,
      subject,
    });
    const seededDraft = mergeEmailQualificationDraft(baseDraft, {
      aiConfidence:
        readNumber(email, ["ai_confidence"]) ??
        readNumber(storedClassification, ["confidence", "score"]) ??
        baseDraft.aiConfidence,
      clientId:
        readString(storedClassification, ["client_id"]) ??
        readString(email, ["client_id"]) ??
        null,
      clientName:
        readString(storedClassification, ["client_name", "client"]) ??
        readString(email, ["detected_client_name"]) ??
        null,
      contactId:
        readString(storedClassification, ["contact_id"]) ??
        readString(email, ["contact_id"]) ??
        null,
      contactName:
        readString(storedClassification, ["contact_name", "contact"]) ??
        (fromName || null) ??
        null,
      dueAt:
        readString(storedClassification, ["due_at", "deadline"]) ??
        readString(email, ["detected_deadline"]) ??
        baseDraft.dueAt,
      modelId:
        readString(storedClassification, ["model_id"]) ??
        readString(email, ["model_id"]) ??
        null,
      modelName:
        readString(storedClassification, ["model_name"]) ??
        readString(email, ["model_name", "reference"]) ??
        null,
      priority:
        readPriorityFromSources(storedClassification, email) ?? baseDraft.priority,
      productDepartmentId:
        readString(storedClassification, ["product_department_id", "department_id"]) ??
        readString(email, ["product_department_id"]) ??
        null,
      productDepartmentName:
        readString(storedClassification, ["product_department", "department", "department_name"]) ??
        readString(email, ["department_name", "detected_department"]) ??
        null,
      requestType:
        readString(storedClassification, ["request_type", "type"]) ??
        readString(email, ["detected_type"]) ??
        baseDraft.requestType,
      requestedAction:
        readString(storedClassification, ["requested_action", "next_action"]) ??
        readString(email, ["requested_action"]) ??
        baseDraft.requestedAction,
      requiresHumanValidation:
        readBoolean(storedClassification, ["requires_human_validation"]) ??
        readBoolean(email, ["requires_human_validation"]) ??
        baseDraft.requiresHumanValidation,
      summary:
        readString(storedClassification, ["summary", "short_summary"]) ??
        readString(email, ["ai_summary"]) ??
        baseDraft.summary,
      title: readString(storedClassification, ["title"]) ?? baseDraft.title,
    });
    const enrichedDraft = enrichQualificationDraft(seededDraft, email, references);
    const triage = resolveEmailInboxTriage({
      attachmentCount: references.attachmentCountByEmailId.get(email.id) ?? 0,
      classification: storedClassification,
      clientId: enrichedDraft.clientId,
      detectedType: enrichedDraft.requestType,
      emailRecord: email,
      fromEmail,
      fromName,
      linkedRequestId:
        readString(email, ["request_id", "linked_request_id", "crm_request_id"]) ??
        readString(storedClassification, ["linkedRequestId", "linked_request_id", "request_id"]) ??
        null,
      previewText,
      subject,
      suggestedFields: {
        aiConfidence: enrichedDraft.aiConfidence,
        dueAt: enrichedDraft.dueAt,
        priority: enrichedDraft.priority,
        requestType: enrichedDraft.requestType,
      },
    });
    const classificationPayload = buildAssistantClassificationPayload(
      email.id,
      enrichedDraft,
      triage,
      storedClassification,
    );
    const patchResult = await patchEmailClassification(
      email.id,
      buildEmailPatchPayload(enrichedDraft, triage, classificationPayload),
      options.rest,
    );

    if (!patchResult.ok) {
      return {
        enrichedCrm: false,
        item: {
          bucket: triage.bucket,
          clientName: enrichedDraft.clientName,
          dueAt: enrichedDraft.dueAt,
          emailId: email.id,
          from: fromName || fromEmail,
          priority: enrichedDraft.priority,
          reason: patchResult.message,
          recommendedAction: "Vérifier l’email manuellement dans le CRM.",
          requestType: enrichedDraft.requestType,
          status: "error",
          subject,
        },
      };
    }

    return {
      enrichedCrm: hasCrmEnrichment(enrichedDraft),
      item: {
        bucket: triage.bucket,
        clientName: enrichedDraft.clientName,
        dueAt: enrichedDraft.dueAt,
        emailId: email.id,
        from: fromName || fromEmail,
        priority: enrichedDraft.priority,
        reason: triage.reason,
        recommendedAction: buildRecommendedAction(triage.bucket, enrichedDraft),
        requestType: enrichedDraft.requestType,
        status: "classified",
        subject,
      },
    };
  } catch (error) {
    await logOperationalError({
      actorId: options.actor?.actorUserId ?? null,
      entityId: email.id,
      entityType: "email",
      error,
      message: "Qualification assistant de l’email impossible.",
      payload: {
        fromEmail,
        subject,
      },
      requestId: null,
      scope: "emails.assistant_ops",
      source: options.actor?.source ?? "assistant",
    });

    return {
      enrichedCrm: false,
      item: {
        bucket: null,
        clientName: null,
        dueAt: null,
        emailId: email.id,
        from: fromName || fromEmail,
        priority: null,
        reason: error instanceof Error ? error.message : "Qualification impossible.",
        recommendedAction: "Basculer ce mail dans À vérifier.",
        requestType: null,
        status: "error",
        subject,
      },
    };
  }
}

async function loadEmailOpsCandidates(limit: number) {
  const admin = createSupabaseAdminClient();
  const scanLimit = Math.min(Math.max(limit * 4, 40), 120);
  const { data, error } = await admin
    .from("emails")
    .select("*")
    .or("is_processed.is.null,is_processed.eq.false")
    .order("received_at", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false })
    .limit(scanLimit);

  if (error) {
    throw new Error(`Impossible de charger les emails assistant: ${error.message}`);
  }

  return ((data ?? []) as EmailRecord[])
    .filter((email) => needsAssistantHandling(email, readStoredClassification(email)))
    .slice(0, limit);
}

async function loadEmailOpsReferenceData(emailIds: string[]): Promise<EmailOpsReferenceData> {
  const admin = createSupabaseAdminClient();
  const [clientsResult, contactsResult, modelsResult, productDepartmentsResult, attachments] =
    await Promise.all([
      admin.from("clients").select("*"),
      admin.from("contacts").select("*"),
      admin.from("models").select("*"),
      admin.from("product_departments").select("*"),
      emailIds.length > 0
        ? admin.from("email_attachments").select("email_id").in("email_id", emailIds)
        : Promise.resolve({ data: [], error: null }),
    ]);

  if (clientsResult.error) {
    throw new Error(`Impossible de charger les clients CRM: ${clientsResult.error.message}`);
  }

  if (contactsResult.error) {
    throw new Error(`Impossible de charger les contacts CRM: ${contactsResult.error.message}`);
  }

  if (modelsResult.error) {
    throw new Error(`Impossible de charger les modèles CRM: ${modelsResult.error.message}`);
  }

  if (productDepartmentsResult.error) {
    throw new Error(
      `Impossible de charger les départements produit CRM: ${productDepartmentsResult.error.message}`,
    );
  }

  if (attachments.error) {
    throw new Error(
      `Impossible de charger les pièces jointes email: ${attachments.error.message}`,
    );
  }

  const attachmentCountByEmailId = new Map<string, number>();

  for (const row of (attachments.data ?? []) as EmailAttachmentRecord[]) {
    const emailId = readString(row, ["email_id", "emailId"]);

    if (!emailId) {
      continue;
    }

    attachmentCountByEmailId.set(
      emailId,
      (attachmentCountByEmailId.get(emailId) ?? 0) + 1,
    );
  }

  return {
    attachmentCountByEmailId,
    clients: (clientsResult.data ?? []) as ClientRecord[],
    contacts: (contactsResult.data ?? []) as ContactRecord[],
    models: (modelsResult.data ?? []) as ModelRecord[],
    productDepartments: (productDepartmentsResult.data ?? []) as ProductDepartmentRecord[],
  };
}

function enrichQualificationDraft(
  draft: EmailQualificationDraft,
  email: EmailRecord,
  references: EmailOpsReferenceData,
) {
  const subject = readString(email, ["subject"]) ?? "";
  const previewText = readString(email, ["preview_text"]) ?? "";
  const bodyText = readString(email, ["body_text"]) ?? "";
  const fromEmail = readString(email, ["from_email"]) ?? "";
  const fromName = readString(email, ["from_name"]) ?? "";
  const fullText = normalizeSearchText(
    [subject, previewText, bodyText, fromName, fromEmail].filter(Boolean).join(" "),
  );
  const contactMatch =
    findContactMatch(references.contacts, {
      clientId: draft.clientId,
      contactName: draft.contactName ?? fromName,
      fromEmail,
    }) ?? null;
  const clientMatch =
    (contactMatch?.client_id
      ? references.clients.find((client) => client.id === contactMatch.client_id) ?? null
      : null) ??
    findClientMatch(references.clients, fullText);
  const departmentMatch = findDepartmentMatch(references.productDepartments, fullText);
  const modelMatch = findModelMatch(references.models, fullText, clientMatch?.id ?? null);
  const derivedClient =
    clientMatch ??
    (modelMatch?.client_id
      ? references.clients.find((client) => client.id === modelMatch.client_id) ?? null
      : null);

  return mergeEmailQualificationDraft(draft, {
    clientId: draft.clientId ?? derivedClient?.id ?? null,
    clientName:
      draft.clientName ??
      readString(derivedClient, ["name", "client_name", "account_name"]) ??
      null,
    contactId: draft.contactId ?? contactMatch?.id ?? null,
    contactName:
      draft.contactName ??
      readString(contactMatch, ["full_name", "name", "contact_name"]) ??
      (fromName || null),
    modelId: draft.modelId ?? modelMatch?.id ?? null,
    modelName:
      draft.modelName ??
      readString(modelMatch, ["name", "label", "reference", "style_name"]) ??
      null,
    productDepartmentId: draft.productDepartmentId ?? departmentMatch?.id ?? null,
    productDepartmentName:
      draft.productDepartmentName ??
      readString(departmentMatch, ["name", "label", "department_name"]) ??
      null,
  });
}

async function patchEmailClassification(
  emailId: string,
  payload: Record<string, unknown>,
  rest: SupabaseRestExecutionContext | null,
) {
  const currentPayload: Record<string, unknown> = {
    ...payload,
    updated_at: new Date().toISOString(),
  };

  while (true) {
    const result = await supabaseRestPatch<Array<Record<string, unknown>>>(
      "emails",
      cleanPayload(currentPayload),
      {
        id: `eq.${emailId}`,
        select: "id",
      },
      rest ?? { authMode: "service_role" },
    );

    if (!result.error) {
      return {
        ok: Boolean(result.data && result.data.length > 0),
        message:
          result.data && result.data.length > 0
            ? null
            : "Aucun email mis à jour pendant la qualification assistant.",
      };
    }

    if (!isMissingSupabaseColumnError(result.rawError)) {
      return {
        ok: false,
        message: result.error ?? "Mise à jour assistant impossible sur emails.",
      };
    }

    const missingColumn = extractMissingSupabaseColumnName(result.rawError);

    if (!missingColumn || !(missingColumn in currentPayload)) {
      return {
        ok: false,
        message: result.error ?? "Mise à jour assistant impossible sur emails.",
      };
    }

    delete currentPayload[missingColumn];
  }
}

function buildEmailPatchPayload(
  draft: EmailQualificationDraft,
  triage: {
    bucket: EmailInboxBucket;
    confidence: number | null;
    reason: string | null;
    source: string;
  },
  classificationPayload: Record<string, unknown>,
) {
  const reviewPayload =
    triage.bucket === "to_review"
      ? {
          is_processed: false,
          processing_status: "review",
          status: "review",
          triage_status: "review",
        }
      : {};

  return {
    ai_classification: classificationPayload,
    ai_confidence: draft.aiConfidence,
    ai_summary: draft.summary,
    assistant_bucket: triage.bucket,
    assistant_bucket_confidence: triage.confidence,
    assistant_bucket_reason: triage.reason,
    classification_json: classificationPayload,
    client_id: draft.clientId,
    contact_id: draft.contactId,
    detected_client_name: draft.clientName,
    detected_deadline: draft.dueAt,
    detected_department: draft.productDepartmentName,
    detected_priority: draft.priority,
    detected_type: draft.requestType,
    model_id: draft.modelId,
    model_name: draft.modelName,
    product_department_id: draft.productDepartmentId,
    requested_action: draft.requestedAction,
    requires_human_validation: draft.requiresHumanValidation,
    triage_source: triage.source,
    triaged_at: new Date().toISOString(),
    ...reviewPayload,
  };
}

function buildAssistantClassificationPayload(
  emailId: string,
  draft: EmailQualificationDraft,
  triage: {
    bucket: EmailInboxBucket;
    confidence: number | null;
    reason: string | null;
    source: string;
  },
  currentClassification: Record<string, unknown> | null,
) {
  return {
    ...(currentClassification ?? {}),
    assistantBucket: triage.bucket,
    assistantBucketConfidence: triage.confidence,
    assistantBucketReason: triage.reason,
    bucket: triage.bucket,
    classifiedAt: new Date().toISOString(),
    classificationEngine: "assistant_email_ops_v1",
    client_id: draft.clientId,
    client_name: draft.clientName,
    confidence: draft.aiConfidence,
    contact_id: draft.contactId,
    contact_name: draft.contactName,
    due_at: draft.dueAt,
    emailId,
    model_id: draft.modelId,
    model_name: draft.modelName,
    priority: draft.priority,
    product_department: draft.productDepartmentName,
    product_department_id: draft.productDepartmentId,
    qualification: draft,
    request_type: draft.requestType,
    requested_action: draft.requestedAction,
    requires_human_validation: draft.requiresHumanValidation,
    source: "assistant",
    summary: draft.summary,
    title: draft.title,
    triage_source: triage.source,
  };
}

function hasCrmEnrichment(draft: EmailQualificationDraft) {
  return Boolean(
    draft.clientId ||
      draft.contactId ||
      draft.productDepartmentId ||
      draft.modelId ||
      draft.requestType ||
      draft.dueAt,
  );
}

function buildRecommendedAction(
  bucket: EmailInboxBucket,
  draft: EmailQualificationDraft,
) {
  if (bucket === "promotional") {
    return "Laisser ce mail dans l’onglet Pub.";
  }

  if (bucket === "to_review") {
    return "Vérifier ce mail humainement avant de créer une demande.";
  }

  return (
    draft.requestedAction ??
    "Qualifier puis créer ou rattacher une demande dans le CRM."
  );
}

function readPriorityFromSources(
  classification: Record<string, unknown> | null,
  email: EmailRecord,
): RequestPriority | null {
  const value =
    readString(classification, ["priority"]) ??
    readString(email, ["detected_priority", "priority"]);

  if (value === "critical" || value === "high" || value === "normal") {
    return value;
  }

  return null;
}

function buildEmailOpsMessage(result: AssistantRunEmailOpsCycleResult) {
  const segments = [
    `Cycle email assistant terminé: ${result.processedCount} email(s) classé(s)`,
    `${result.importantCount} important(s)`,
    `${result.promotionalCount} pub`,
    `${result.toReviewCount} à vérifier.`,
  ];

  if (!result.sync.ok) {
    segments.push("La sync Gmail a échoué, mais le backlog local a quand même été traité.");
  } else {
    segments.push(`${result.sync.importedMessages} nouveau(x) mail(s) importé(s).`);
  }

  if (result.errorCount > 0) {
    segments.push(`${result.errorCount} erreur(s) restent à vérifier.`);
  }

  return segments.join(" ");
}

function readStoredClassification(record: EmailRecord) {
  return (
    readObject(record, [
      "ai_classification",
      "classification_json",
      "classification",
      "analysis",
    ]) ??
    parseJsonObject(
      readString(record, [
        "ai_classification",
        "classification_json",
        "classification",
        "analysis",
      ]),
    ) ??
    null
  );
}

function needsAssistantHandling(
  email: EmailRecord,
  classification: Record<string, unknown> | null,
) {
  if (email.is_processed === true) {
    return false;
  }

  const currentBucket =
    normalizeBucket(
      readString(classification, [
        "assistant_bucket",
        "assistantBucket",
        "bucket",
      ]) ??
        readString(email, [
          "assistant_bucket",
          "assistantBucket",
          "bucket",
        ]),
    ) ?? null;
  const hasSummary = Boolean(
    readString(email, ["ai_summary"]) ??
      readString(classification, ["summary", "short_summary"]),
  );
  const hasRequestType = Boolean(
    readString(classification, ["request_type", "type"]) ??
      readString(email, ["detected_type"]),
  );
  const hasClientSignal = Boolean(
    readString(classification, ["client_id", "client_name"]) ??
      readString(email, ["client_id", "detected_client_name"]),
  );

  if (!currentBucket) {
    return true;
  }

  if (!hasSummary) {
    return true;
  }

  if (currentBucket === "important" && !hasRequestType && !hasClientSignal) {
    return true;
  }

  return false;
}

function findClientMatch(clients: ClientRecord[], haystack: string) {
  return [...clients]
    .sort((left, right) => getSearchWeight(right) - getSearchWeight(left))
    .find((client) =>
      getSearchTokens(client).some((token) => token.length > 2 && haystack.includes(token)),
    ) ?? null;
}

function findContactMatch(
  contacts: ContactRecord[],
  input: {
    clientId: string | null;
    contactName: string | null;
    fromEmail: string;
  },
) {
  const scopedContacts = input.clientId
    ? contacts.filter((contact) => readString(contact, ["client_id"]) === input.clientId)
    : contacts;
  const normalizedEmail = normalizeSearchText(input.fromEmail);
  const exactEmailMatch =
    scopedContacts.find(
      (contact) =>
        normalizeSearchText(readString(contact, ["email"]) ?? "") === normalizedEmail,
    ) ?? null;

  if (exactEmailMatch) {
    return exactEmailMatch;
  }

  if (!input.contactName) {
    return null;
  }

  const normalizedName = normalizeSearchText(input.contactName);
  return (
    scopedContacts.find(
      (contact) =>
        normalizeSearchText(
          readString(contact, ["full_name", "name", "contact_name"]) ?? "",
        ) === normalizedName,
    ) ?? null
  );
}

function findDepartmentMatch(
  departments: ProductDepartmentRecord[],
  haystack: string,
) {
  return [...departments]
    .sort((left, right) => getSearchWeight(right) - getSearchWeight(left))
    .find((department) =>
      getSearchTokens(department).some((token) => token.length > 2 && haystack.includes(token)),
    ) ?? null;
}

function findModelMatch(
  models: ModelRecord[],
  haystack: string,
  clientId: string | null,
) {
  const scopedModels = clientId
    ? models.filter((model) => readString(model, ["client_id"]) === clientId)
    : models;

  return [...scopedModels]
    .sort((left, right) => getSearchWeight(right) - getSearchWeight(left))
    .find((model) =>
      getSearchTokens(model).some((token) => token.length > 2 && haystack.includes(token)),
    ) ?? null;
}

function getSearchTokens(record: Record<string, unknown>) {
  return uniqueStrings(
    [
      readString(record, ["name", "full_name", "client_name", "account_name", "label"]),
      readString(record, ["reference", "code", "department_name"]),
    ]
      .filter(Boolean)
      .flatMap((value) =>
        normalizeSearchText(value as string)
          .split(" ")
          .filter((token) => token.length > 2),
      ),
  );
}

function getSearchWeight(record: Record<string, unknown>) {
  return getSearchTokens(record).reduce((total, token) => total + token.length, 0);
}

function normalizeSearchText(value: string) {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function cleanPayload(payload: Record<string, unknown>) {
  return Object.fromEntries(
    Object.entries(payload).filter(([, value]) => value !== undefined),
  );
}

function clampInteger(
  value: number | null | undefined,
  fallback: number,
  minimum: number,
  maximum: number,
) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return fallback;
  }

  return Math.max(minimum, Math.min(maximum, Math.floor(value)));
}

function normalizeBucket(value: string | null | undefined) {
  const normalized = (value ?? "").trim().toLowerCase();

  if (normalized === "important") {
    return "important" as const;
  }

  if (normalized === "promotional" || normalized === "promotion" || normalized === "promo") {
    return "promotional" as const;
  }

  if (normalized === "to_review" || normalized === "review" || normalized === "a_verifier") {
    return "to_review" as const;
  }

  return null;
}
