import "server-only";

import type {
  AssistantHistorySearchResult,
  AssistantEmailActivityReport,
  AssistantPrepareReplyDraftResult,
  AssistantRunEmailOpsCycleResult,
} from "@/features/assistant-actions/types";
import type { DeadlineListItem } from "@/features/deadlines/types";
import type { EmailListItem } from "@/features/emails/types";
import type { ProductionListItem } from "@/features/productions/types";
import type { RequestOverviewListItem } from "@/features/requests/types";
import type {
  OpenClawExposedActionName,
  OpenClawSafeWriteActionName,
} from "@/features/openclaw/integration";
import type { OpenClawResponseMode } from "@/features/openclaw/types";
import { replyTypeMeta } from "@/features/replies/lib/build-reply-draft";

const DEFAULT_COMPACT_LIMIT = 5;

export function presentOpenClawData(input: {
  action: OpenClawExposedActionName;
  data: unknown;
  input?: unknown;
  mode: OpenClawResponseMode;
}) {
  if (input.mode === "detailed") {
    return input.data;
  }

  switch (input.action) {
    case "getTodayUrgencies":
      return presentUrgencies(input.data);
    case "getUnprocessedEmails":
      return presentUnprocessedEmails(input.data);
    case "getEmailActivity":
      return presentEmailActivity(input.data);
    case "getRequestsWithoutAssignee":
      return presentRequestsWithoutAssignee(input.data);
    case "getBlockedProductions":
      return presentProductions(input.data, "blocked");
    case "getHighRiskProductions":
      return presentProductions(input.data, "high_risk");
    case "searchClientHistory":
    case "searchModelHistory":
      return presentHistorySearch(input.data);
    case "prepareReplyDraft":
      return presentReplyDraft(input.data);
    case "runEmailOpsCycle":
      return presentEmailOpsCycle(input.data);
    case "runGmailSync":
    case "createClient":
    case "assignClientToEmail":
    case "attachEmailToRequest":
    case "createDeadline":
    case "createRequest":
    case "createTask":
    case "updateRequest":
    case "updateTask":
    case "addNoteToRequest":
    case "addNoteToProduction":
    case "setEmailInboxBucket":
    case "writeDailySummary":
      return presentSafeWriteResult({
        action: input.action,
        data: input.data,
        input: input.input,
      });
  }
}

function presentUrgencies(data: unknown) {
  const items = asArray<DeadlineListItem>(data)
    .slice(0, DEFAULT_COMPACT_LIMIT)
    .map((deadline) => ({
      client: deadline.clientName,
      dueAt: deadline.deadlineAt,
      label: deadline.label,
      priority: deadline.priority,
      recommendedAction: deadline.isOverdue
        ? "Traiter immédiatement ou renégocier le délai."
        : "Arbitrer le point avant l'échéance.",
      requestTitle: deadline.requestTitle,
      status: deadline.status,
      urgency: deadline.isOverdue ? "retard" : "moins de 24h",
    }));

  return {
    format: "compact" as const,
    items,
    recommendedAction:
      items.length > 0
        ? "Traiter d'abord les retards, puis confirmer les deadlines du jour."
        : "Aucune urgence critique à remonter.",
    totalCount: asArray<DeadlineListItem>(data).length,
    truncated: asArray<DeadlineListItem>(data).length > items.length,
  };
}

function presentUnprocessedEmails(data: unknown) {
  const emails = asArray<EmailListItem>(data);
  const signalEmails = emails.filter((email) => !isSystemEmail(email));
  const source = signalEmails.length > 0 ? signalEmails : emails;
  const items = source.slice(0, DEFAULT_COMPACT_LIMIT).map((email) => ({
    bucket: email.triage.bucket,
    client: email.clientName || null,
    dueAt: email.classification?.suggestedFields?.dueAt ?? null,
    from: email.fromName || email.fromEmail,
    priority: email.classification?.suggestedFields?.priority ?? null,
    recommendedAction: email.linkedRequestId
      ? "Ouvrir la demande liée ou compléter la qualification."
      : "Qualifier puis créer ou rattacher une demande.",
    receivedAt: email.receivedAt,
    status: email.status,
    subject: email.subject,
    type: email.detectedType ?? email.classification?.suggestedFields?.requestType ?? null,
  }));

  return {
    format: "compact" as const,
    ignoredSystemEmails: emails.length - source.length,
    items,
    recommendedAction:
      items.length > 0
        ? "Traiter d'abord les emails client non liés à une demande."
        : "Aucun email métier non traité à remonter.",
    totalCount: emails.length,
    truncated: source.length > items.length,
  };
}

function presentEmailActivity(data: unknown) {
  const report = isEmailActivityReport(data) ? data : null;
  const items = report?.items.slice(0, 20).map((item) => ({
    from: item.fromName || item.fromEmail,
    receivedAt: item.receivedAt,
    replyAt: item.replyAt,
    replyDelayMinutes: item.replyDelayMinutes,
    status: item.replyStatus === "answered" ? "répondu" : "réponse non trouvée",
    subject: item.subject,
  })) ?? [];

  return {
    format: "compact" as const,
    items,
    range: report?.range ?? null,
    recommendedAction:
      report && report.truncated
        ? "Relancer en responseMode detailed avec un limit plus élevé si le compte-rendu doit être exhaustif."
        : "Utiliser responseMode detailed pour produire un tableau complet à partager.",
    totalAnswered: report?.totalAnswered ?? 0,
    totalReceived: report?.totalReceived ?? 0,
    totalUnanswered: report?.totalUnanswered ?? 0,
    truncated: report?.truncated ?? false,
  };
}

function presentRequestsWithoutAssignee(data: unknown) {
  const requests = asArray<RequestOverviewListItem>(data);
  const items = requests.slice(0, DEFAULT_COMPACT_LIMIT).map((request) => ({
    client: request.clientName,
    dueAt: request.dueAt,
    priority: request.priority,
    recommendedAction: "Assigner un owner puis cadrer la prochaine étape.",
    status: request.status,
    title: request.title,
    type: request.requestTypeLabel,
  }));

  return {
    format: "compact" as const,
    items,
    recommendedAction:
      items.length > 0
        ? "Attribuer en priorité les demandes critiques ou proches de l'échéance."
        : "Toutes les demandes visibles ont déjà un owner.",
    totalCount: requests.length,
    truncated: requests.length > items.length,
  };
}

function presentProductions(data: unknown, mode: "blocked" | "high_risk") {
  const productions = asArray<ProductionListItem>(data);
  const items = productions.slice(0, DEFAULT_COMPACT_LIMIT).map((production) => ({
    blockingReason: production.blockingReason,
    client: production.clientName,
    model: production.modelName,
    orderNumber: production.orderNumber,
    plannedEndAt: production.plannedEndAt,
    recommendedAction:
      mode === "blocked"
        ? "Lever le blocage puis confirmer la prochaine étape."
        : "Faire un point de risque et sécuriser la suite.",
    risk: production.risk,
    status: production.status,
  }));

  return {
    format: "compact" as const,
    items,
    recommendedAction:
      items.length > 0
        ? mode === "blocked"
          ? "Commencer par les productions bloquées avec date de fin proche."
          : "Traiter d'abord les productions critical puis high."
        : "Aucune production prioritaire à remonter.",
    totalCount: productions.length,
    truncated: productions.length > items.length,
  };
}

function presentHistorySearch(data: unknown) {
  const result = isHistorySearchResult(data) ? data : null;

  return {
    format: "compact" as const,
    links: result?.links.slice(0, 3) ?? [],
    recommendedAction:
      result?.signals[0] ??
      "Consulter les liens proposés pour récupérer le contexte utile.",
    signals: result?.signals.slice(0, 3) ?? [],
    summary: result?.summary ?? "Aucun historique consolidé exploitable.",
  };
}

function presentReplyDraft(data: unknown) {
  const result = isReplyDraftResult(data) ? data : null;
  const draft = result?.draft;

  return {
    format: "compact" as const,
    draft:
      draft
        ? {
            body: draft.body,
            recipients: draft.suggestedRecipients,
            subject: draft.subject,
            type: draft.type,
            typeLabel: replyTypeMeta[draft.type]?.label ?? draft.type,
          }
        : null,
    recommendedAction:
      draft ? "Relire, ajuster si besoin, puis copier le brouillon." : null,
    summary: result?.message ?? "Brouillon non disponible.",
  };
}

function presentEmailOpsCycle(data: unknown) {
  const result = isEmailOpsCycleResult(data) ? data : null;
  const topImportantItems =
    result?.items
      .filter((item) => item.bucket === "important")
      .slice(0, DEFAULT_COMPACT_LIMIT)
      .map((item) => ({
        client: item.clientName,
        dueAt: item.dueAt,
        from: item.from,
        priority: item.priority,
        recommendedAction: item.recommendedAction,
        requestType: item.requestType,
        subject: item.subject,
      })) ?? [];
  const errorItems =
    result?.items
      .filter((item) => item.status === "error")
      .slice(0, 3)
      .map((item) => ({
        emailId: item.emailId,
        reason: item.reason,
        subject: item.subject,
      })) ?? [];
  const items =
    result?.items.slice(0, DEFAULT_COMPACT_LIMIT).map((item) => ({
      bucket: item.bucket,
      client: item.clientName,
      dueAt: item.dueAt,
      from: item.from,
      priority: item.priority,
      recommendedAction: item.recommendedAction,
      requestType: item.requestType,
      status: item.status,
      subject: item.subject,
    })) ?? [];

  return {
    cycle: {
      clientClassifiedCount: result?.clientClassifiedCount ?? 0,
      crmEnrichedCount: result?.crmEnrichedCount ?? 0,
      deadlineCreatedCount: result?.deadlineCreatedCount ?? 0,
      errorCount: result?.errorCount ?? 0,
      importantCount: result?.importantCount ?? 0,
      processedCount: result?.processedCount ?? 0,
      promotionalCount: result?.promotionalCount ?? 0,
      requestAttachedCount: result?.requestAttachedCount ?? 0,
      requestCreatedCount: result?.requestCreatedCount ?? 0,
      requestUpdatedCount: result?.requestUpdatedCount ?? 0,
      skippedCount: result?.skippedCount ?? 0,
      summaryWrittenCount: result?.summaryWrittenCount ?? 0,
      syncImportedMessages: result?.sync.importedMessages ?? 0,
      syncOk: result?.sync.ok ?? false,
      taskCreatedCount: result?.taskCreatedCount ?? 0,
      taskUpdatedCount: result?.taskUpdatedCount ?? 0,
      toReviewCount: result?.toReviewCount ?? 0,
    },
    errorItems,
    format: "compact" as const,
    items,
    recommendedAction:
      result && result.errorCount > 0
        ? "Vérifier les erreurs remontées, puis relancer le cycle email."
        : result && result.toReviewCount > 0
          ? "Ouvrir ensuite l’onglet À vérifier pour arbitrer les emails incertains."
          : result && result.requestCreatedCount > 0
            ? "Contrôler ensuite les nouvelles demandes créées et leurs tâches auto."
            : "Traiter ensuite les emails classés Important dans le CRM.",
    summary:
      result?.sync.ok === false
        ? "Cycle assistant exécuté, mais la sync Gmail doit être vérifiée."
        : result && result.errorCount > 0
          ? "Cycle assistant exécuté avec erreurs sur certains emails."
        : "Cycle assistant emails terminé.",
    topImportantItems,
    truncated: (result?.items.length ?? 0) > items.length,
  };
}

function presentSafeWriteResult(input: {
  action: OpenClawSafeWriteActionName;
  data: unknown;
  input?: unknown;
}) {
  const payload = isRecord(input.input) ? input.input : {};
  const resultMessage = extractWriteMessage(input.data);

  if (input.action === "createTask") {
    return {
      format: "compact" as const,
      recommendedAction: "Vérifier ensuite l'assignation et l'échéance dans le CRM.",
      summary: resultMessage,
      task: {
        dueAt: readString(payload, "dueAt"),
        priority: readString(payload, "priority"),
        requestId: readString(payload, "requestId"),
        taskType: readString(payload, "taskType"),
        title: readString(payload, "title"),
      },
    };
  }

  if (input.action === "createRequest") {
    const result = isRecord(input.data) ? input.data : {};

    return {
      format: "compact" as const,
      recommendedAction:
        "Ouvrir ensuite la demande pour compléter les tâches, deadlines ou pièces jointes.",
      request: {
        dueAt: readString(payload, "dueAt"),
        attachedEmailCount: readNumber(result, "attachedEmailCount"),
        failedEmailAttachCount: readNumber(result, "failedEmailAttachCount"),
        priority: readString(payload, "priority"),
        requestId: readString(result, "requestId"),
        requestType: readString(payload, "requestType"),
        status: readString(payload, "status"),
        title: readString(payload, "title"),
      },
      summary: resultMessage,
    };
  }

  if (input.action === "updateRequest") {
    const result = isRecord(input.data) ? input.data : {};

    return {
      format: "compact" as const,
      recommendedAction: "Le CRM est à jour. Vérifier uniquement si un arbitrage client est nécessaire.",
      request: {
        assignedUserId: readString(payload, "assignedUserId"),
        priority: readString(payload, "priority"),
        requestId: readString(payload, "requestId"),
        requestType: readString(payload, "requestType"),
        status: readString(payload, "status"),
        updatedFields: Array.isArray(result.updatedFields) ? result.updatedFields : [],
      },
      summary: resultMessage,
    };
  }

  if (input.action === "updateTask") {
    const result = isRecord(input.data) ? input.data : {};

    return {
      format: "compact" as const,
      recommendedAction: "Le suivi tâche est à jour dans le CRM.",
      summary: resultMessage,
      task: {
        assignedUserId: readString(payload, "assignedUserId"),
        dueAt: readString(payload, "dueAt"),
        priority: readString(payload, "priority"),
        requestId: readString(payload, "requestId"),
        status: readString(payload, "status"),
        taskId: readString(payload, "taskId"),
        updatedFields: Array.isArray(result.updatedFields) ? result.updatedFields : [],
      },
    };
  }

  if (input.action === "createDeadline") {
    return {
      deadline: {
        deadlineAt: readString(payload, "deadlineAt"),
        label: readString(payload, "label"),
        priority: readString(payload, "priority"),
        requestId: readString(payload, "requestId"),
      },
      format: "compact" as const,
      recommendedAction:
        "Vérifier ensuite la demande liée et l'articulation avec les autres échéances.",
      summary: resultMessage,
    };
  }

  if (input.action === "createClient") {
    const result = isRecord(input.data) ? input.data : {};
    const client = isRecord(result.client) ? result.client : null;

    return {
      client: {
        clientId: readString(result, "clientId"),
        code: client ? readString(client, "secondary") : readString(payload, "code"),
        label: client ? readString(client, "label") : readString(payload, "name"),
      },
      format: "compact" as const,
      recommendedAction: "Assigner ensuite ce client aux emails ou demandes concernés.",
      summary: resultMessage,
    };
  }

  if (input.action === "assignClientToEmail") {
    return {
      assignment: {
        clientId: readString(payload, "clientId"),
        emailId: readString(payload, "emailId"),
      },
      format: "compact" as const,
      recommendedAction:
        "Compléter ensuite la qualification CRM ou créer une demande si le mail est clair.",
      summary: resultMessage,
    };
  }

  if (input.action === "attachEmailToRequest") {
    return {
      attachment: {
        emailId: readString(payload, "emailId"),
        requestId: readString(payload, "requestId"),
      },
      format: "compact" as const,
      recommendedAction:
        "Ouvrir ensuite la demande pour vérifier le contexte consolidé.",
      summary: resultMessage,
    };
  }

  if (input.action === "runGmailSync") {
    const syncResult = isRecord(input.data) ? input.data : {};

    return {
      format: "compact" as const,
      recommendedAction:
        (readNumber(syncResult, "errorCount") ?? 0) > 0
          ? "Vérifier le statut Gmail partagé ou reconnecter la boîte si besoin."
          : "Ouvrir ensuite l’inbox CRM pour traiter les nouveaux emails importés.",
      summary: resultMessage,
      sync: {
        connectedInboxEmail: readString(syncResult, "connectedInboxEmail"),
        errorCount: readNumber(syncResult, "errorCount"),
        ignoredMessages: readNumber(syncResult, "ignoredMessages"),
        importedMessages: readNumber(syncResult, "importedMessages"),
        importedThreads: readNumber(syncResult, "importedThreads"),
        queryUsed: readString(syncResult, "queryUsed"),
        syncMode: readString(syncResult, "syncMode"),
      },
    };
  }

  if (input.action === "runEmailOpsCycle") {
    const emailOpsResult = isRecord(input.data) ? input.data : {};
    const syncResult =
      isRecord(emailOpsResult.sync) ? emailOpsResult.sync : null;
    const toReviewCount = readNumber(emailOpsResult, "toReviewCount") ?? 0;

    return {
      cycle: {
        crmEnrichedCount: readNumber(emailOpsResult, "crmEnrichedCount"),
        errorCount: readNumber(emailOpsResult, "errorCount"),
        importantCount: readNumber(emailOpsResult, "importantCount"),
        processedCount: readNumber(emailOpsResult, "processedCount"),
        promotionalCount: readNumber(emailOpsResult, "promotionalCount"),
        requestAttachedCount: readNumber(emailOpsResult, "requestAttachedCount"),
        requestCreatedCount: readNumber(emailOpsResult, "requestCreatedCount"),
        requestUpdatedCount: readNumber(emailOpsResult, "requestUpdatedCount"),
        summaryWrittenCount: readNumber(emailOpsResult, "summaryWrittenCount"),
        taskCreatedCount: readNumber(emailOpsResult, "taskCreatedCount"),
        taskUpdatedCount: readNumber(emailOpsResult, "taskUpdatedCount"),
        toReviewCount,
      },
      format: "compact" as const,
      recommendedAction:
        toReviewCount > 0
          ? "Vérifier ensuite l’onglet À vérifier dans le CRM."
          : "Ouvrir ensuite l’inbox CRM pour traiter les emails importants.",
      summary: resultMessage,
      sync: syncResult
        ? {
            importedMessages: readNumber(syncResult, "importedMessages"),
            message: readString(syncResult, "message"),
            ok: readBoolean(syncResult, "ok"),
            queryUsed: readString(syncResult, "queryUsed"),
          }
        : null,
    };
  }

  if (input.action === "setEmailInboxBucket") {
    return {
      format: "compact" as const,
      recommendedAction: "Vérifier ensuite l’onglet inbox correspondant dans le CRM.",
      summary: resultMessage,
      triage: {
        bucket: readString(payload, "bucket"),
        emailId: readString(payload, "emailId"),
        reasonPreview: readString(payload, "reason")?.slice(0, 220) ?? null,
      },
    };
  }

  if (input.action === "writeDailySummary") {
    const result = isRecord(input.data) ? input.data : {};

    return {
      format: "compact" as const,
      recommendedAction:
        "Ouvrir la page Synthèses pour relire le compte-rendu client par client.",
      summary: resultMessage,
      synthesis: {
        clientCount: readNumber(result, "clientCount"),
        generatedAt: readString(result, "generatedAt"),
        summaryDate: readString(result, "summaryDate"),
        summaryId: readString(result, "summaryId"),
        summaryTime: readString(result, "summaryTime"),
      },
    };
  }

  if (input.action === "addNoteToRequest") {
    return {
      format: "compact" as const,
      note: {
        notePreview: readString(payload, "note")?.slice(0, 220) ?? null,
        requestId: readString(payload, "requestId"),
      },
      recommendedAction: "Ouvrir ensuite la demande si un arbitrage reste nécessaire.",
      summary: resultMessage,
    };
  }

  return {
    format: "compact" as const,
    note: {
      notePreview: readString(payload, "notes")?.slice(0, 220) ?? null,
      productionId: readString(payload, "productionId"),
    },
    recommendedAction: "Revenir sur la production si le blocage doit être traité.",
    summary: resultMessage,
  };
}

function extractWriteMessage(data: unknown) {
  if (isRecord(data) && typeof data.message === "string" && data.message.trim().length > 0) {
    return data.message;
  }

  return "Action exécutée avec succès.";
}

function isSystemEmail(email: EmailListItem) {
  const sender = `${email.fromEmail} ${email.fromName}`.toLowerCase();
  const subject = email.subject.toLowerCase();

  return (
    sender.includes("noreply") ||
    sender.includes("no-reply") ||
    sender.includes("notification") ||
    sender.includes("mailer-daemon") ||
    subject.includes("unsubscribe")
  );
}

function asArray<T>(value: unknown) {
  return Array.isArray(value) ? (value as T[]) : [];
}

function isHistorySearchResult(value: unknown): value is AssistantHistorySearchResult {
  return (
    isRecord(value) &&
    typeof value.summary === "string" &&
    Array.isArray(value.signals) &&
    Array.isArray(value.links)
  );
}

function isReplyDraftResult(value: unknown): value is AssistantPrepareReplyDraftResult {
  return isRecord(value) && "draft" in value;
}

function isEmailOpsCycleResult(value: unknown): value is AssistantRunEmailOpsCycleResult {
  return isRecord(value) && Array.isArray(value.items) && isRecord(value.sync);
}

function isEmailActivityReport(value: unknown): value is AssistantEmailActivityReport {
  return isRecord(value) && Array.isArray(value.items) && isRecord(value.range);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readString(record: Record<string, unknown>, key: string) {
  const value = record[key];

  return typeof value === "string" && value.trim().length > 0 ? value : null;
}

function readNumber(record: Record<string, unknown>, key: string) {
  const value = record[key];

  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function readBoolean(record: Record<string, unknown>, key: string) {
  const value = record[key];

  return typeof value === "boolean" ? value : null;
}
