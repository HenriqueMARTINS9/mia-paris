import type {
  ReplyDraft,
  ReplyDraftContext,
  ReplyDraftType,
} from "@/features/replies/types";

const signature = "Bien à vous,\nMIA PARIS";

export const replyTypeMeta: Record<
  ReplyDraftType,
  { label: string; helper: string }
> = {
  acknowledgement: {
    label: "Accusé de réception",
    helper: "Confirme la bonne réception et la prise en compte du message.",
  },
  deadline_confirmation: {
    label: "Confirmation de délai",
    helper: "Cadre une réponse autour d’une date ou d’un timing attendu.",
  },
  logistics_response: {
    label: "Réponse logistique",
    helper: "Cadre un retour sur livraison, export, packing ou expédition.",
  },
  missing_items: {
    label: "Éléments manquants",
    helper: "Demande les pièces, validations ou informations manquantes.",
  },
  ownership: {
    label: "Prise en charge",
    helper: "Confirme qui pilote le dossier et la prochaine étape.",
  },
  production_update: {
    label: "Point production",
    helper: "Prépare un retour structuré après un point atelier ou production.",
  },
  supplier_followup: {
    label: "Relance fournisseur",
    helper: "Prépare un message de suivi vers atelier ou fournisseur.",
  },
  validation_feedback: {
    label: "Retour validation",
    helper: "Structure un retour clair sur une validation en cours.",
  },
  waiting_validation: {
    label: "Attente validation",
    helper: "Cadre un message quand le dossier reste suspendu à une validation tierce.",
  },
};

export function buildReplyDraft(
  input: ReplyDraftContext & { replyType: ReplyDraftType },
): ReplyDraft {
  const recipientName = input.recipientName?.trim() || "Bonjour";
  const clientLine = input.clientName ? `pour ${input.clientName}` : "pour votre dossier";
  const requestTypeLabel = humanizeRequestType(input.requestType);
  const dueAtLabel = formatDueAt(input.dueAt);
  const requestReferenceLine = input.requestReference?.trim()
    ? `Référence de dossier: ${input.requestReference.trim()}`
    : null;
  const linkedRequestLine = input.linkedRequestTitle?.trim()
    ? `Dossier lié: ${input.linkedRequestTitle.trim()}`
    : null;
  const productionLine = input.productionLabel?.trim()
    ? `Production / ordre concerné: ${input.productionLabel.trim()}`
    : null;
  const productionStatusLine = input.productionStatus?.trim()
    ? `Statut production actuel: ${humanizeValue(input.productionStatus.trim())}.`
    : null;
  const productionRiskLine = input.productionRisk?.trim()
    ? `Niveau de risque perçu: ${humanizeValue(input.productionRisk.trim())}.`
    : null;
  const historyLine =
    input.historicalSignals && input.historicalSignals.length > 0
      ? `Points historiques utiles: ${input.historicalSignals.slice(0, 2).join(" · ")}`
      : null;
  const summaryLine = input.summary?.trim()
    ? `Contexte repris: ${input.summary.trim()}`
    : null;
  const requestedActionLine = input.requestedAction?.trim()
    ? `Action attendue: ${input.requestedAction.trim()}`
    : null;
  const recipients = input.recipientEmail ? [input.recipientEmail] : [];

  const commonFooter = [
    requestReferenceLine,
    linkedRequestLine,
    productionLine,
    productionStatusLine,
    productionRiskLine,
    requestedActionLine,
    summaryLine,
    historyLine,
    signature,
  ]
    .filter(Boolean)
    .join("\n\n");

  if (input.replyType === "acknowledgement") {
    return {
      body: [
        `Bonjour ${recipientName},`,
        `Nous accusons bonne réception de votre message ${clientLine}.`,
        requestTypeLabel
          ? `Le sujet a été qualifié en interne comme: ${requestTypeLabel}.`
          : "Le sujet est en cours de qualification côté équipe MIA PARIS.",
        dueAtLabel
          ? `Nous intégrons également votre échéance cible: ${dueAtLabel}.`
          : "Nous revenons vers vous rapidement avec un cadrage métier.",
        commonFooter,
      ]
        .filter(Boolean)
        .join("\n\n"),
      disclaimer:
        "Brouillon V1 généré à partir du contexte CRM. Vérifie le ton et les engagements avant envoi.",
      suggestedRecipients: recipients,
      subject: ensureReplySubject(input.subject),
      type: input.replyType,
    };
  }

  if (input.replyType === "ownership") {
    return {
      body: [
        `Bonjour ${recipientName},`,
        `Votre demande est bien prise en charge par l’équipe MIA PARIS ${clientLine}.`,
        input.requestStatus
          ? `Le dossier est actuellement positionné sur le statut: ${humanizeValue(input.requestStatus)}.`
          : "Le dossier est en cours de prise en main.",
        "Nous consolidons les éléments nécessaires et nous vous partageons la prochaine étape très rapidement.",
        commonFooter,
      ]
        .filter(Boolean)
        .join("\n\n"),
      disclaimer:
        "Brouillon de prise en charge. Ajoute si besoin le nom du pilote ou un engagement plus précis.",
      suggestedRecipients: recipients,
      subject: ensureReplySubject(input.subject),
      type: input.replyType,
    };
  }

  if (input.replyType === "missing_items") {
    return {
      body: [
        `Bonjour ${recipientName},`,
        `Afin d’avancer efficacement sur votre demande ${clientLine}, il nous manque encore certains éléments.`,
        requestedActionLine ??
          "Peux-tu nous confirmer les références, quantités, délais et éventuelles pièces visuelles à utiliser ?",
        dueAtLabel
          ? `Nous avons bien noté une échéance cible au ${dueAtLabel}.`
          : null,
        "Dès réception de ces éléments, nous pourrons finaliser le traitement du dossier.",
        signature,
      ]
        .filter(Boolean)
        .join("\n\n"),
      disclaimer:
        "Brouillon de relance d’informations. Vérifie que les éléments demandés correspondent bien au cas métier.",
      suggestedRecipients: recipients,
      subject: ensureReplySubject(input.subject),
      type: input.replyType,
    };
  }

  if (input.replyType === "deadline_confirmation") {
    return {
      body: [
        `Bonjour ${recipientName},`,
        `Nous confirmons la bonne prise en compte de votre contrainte de délai ${clientLine}.`,
        dueAtLabel
          ? `Notre point de référence actuel est le ${dueAtLabel}.`
          : "Nous cadrons actuellement le délai de traitement le plus réaliste.",
        "Nous revenons vers vous dès que le timing interne est verrouillé.",
        commonFooter,
      ]
        .filter(Boolean)
        .join("\n\n"),
      disclaimer:
        "Brouillon de confirmation de délai. Vérifie qu’aucun engagement ferme non validé n’est formulé.",
      suggestedRecipients: recipients,
      subject: ensureReplySubject(input.subject),
      type: input.replyType,
    };
  }

  if (input.replyType === "supplier_followup") {
    return {
      body: [
        `Bonjour ${recipientName},`,
        "Nous revenons vers vous concernant le suivi du dossier en cours.",
        input.requestType
          ? `Le point principal porte actuellement sur: ${requestTypeLabel ?? "le dossier en cours"}.`
          : null,
        dueAtLabel
          ? `Merci de nous confirmer la situation au regard de l’échéance du ${dueAtLabel}.`
          : "Merci de nous partager votre statut actualisé et les éventuels points bloquants.",
        commonFooter,
      ]
        .filter(Boolean)
        .join("\n\n"),
      disclaimer:
        "Brouillon orienté suivi fournisseur. Ajuste le ton si le destinataire est un client.",
      suggestedRecipients: recipients,
      subject: ensureReplySubject(input.subject),
      type: input.replyType,
    };
  }

  if (input.replyType === "production_update") {
    return {
      body: [
        `Bonjour ${recipientName},`,
        `Voici notre point de situation actualisé ${clientLine}.`,
        productionLine ?? "Nous avons fait un point production en interne sur le dossier.",
        productionStatusLine ??
          "Le suivi atelier / production a été revu et nous consolidons les prochaines étapes.",
        productionRiskLine,
        dueAtLabel
          ? `Notre repère de délai reste actuellement le ${dueAtLabel}.`
          : "Nous te confirmons le prochain jalon dès qu’il est verrouillé.",
        commonFooter,
      ]
        .filter(Boolean)
        .join("\n\n"),
      disclaimer:
        "Brouillon de point production. Vérifie que le statut atelier et les engagements de délai sont bien confirmés.",
      suggestedRecipients: recipients,
      subject: ensureReplySubject(input.subject),
      type: input.replyType,
    };
  }

  if (input.replyType === "logistics_response") {
    return {
      body: [
        `Bonjour ${recipientName},`,
        `Nous revenons vers vous concernant le volet logistique ${clientLine}.`,
        dueAtLabel
          ? `Nous gardons comme jalon opérationnel le ${dueAtLabel}.`
          : "Nous sommes en train de confirmer le timing logistique le plus fiable.",
        requestedActionLine ??
          "Merci de nous confirmer les informations de livraison, packing ou export encore manquantes.",
        commonFooter,
      ]
        .filter(Boolean)
        .join("\n\n"),
      disclaimer:
        "Brouillon logistique. Vérifie bien les informations transport, packing et éventuels documents export avant envoi.",
      suggestedRecipients: recipients,
      subject: ensureReplySubject(input.subject),
      type: input.replyType,
    };
  }

  if (input.replyType === "waiting_validation") {
    return {
      body: [
        `Bonjour ${recipientName},`,
        "Le dossier est bien pris en charge de notre côté, mais il reste actuellement suspendu à une étape de validation.",
        dueAtLabel
          ? `Nous gardons comme repère l’échéance du ${dueAtLabel}.`
          : "Nous revenons vers vous dès que cette validation est sécurisée.",
        requestedActionLine ??
          "Nous te confirmons le prochain retour dès que la validation manquante est obtenue.",
        signature,
      ]
        .filter(Boolean)
        .join("\n\n"),
      disclaimer:
        "Brouillon orienté attente validation. Vérifie bien qui doit valider et ce qui est encore bloquant.",
      suggestedRecipients: recipients,
      subject: ensureReplySubject(input.subject),
      type: input.replyType,
    };
  }

  return {
    body: [
      `Bonjour ${recipientName},`,
      "Merci pour votre retour.",
      requestedActionLine ??
        "Nous avons bien repris vos éléments et revenons vers vous avec un retour consolidé.",
      dueAtLabel
        ? `Nous gardons également l’échéance du ${dueAtLabel} comme point de référence.`
        : null,
      commonFooter,
    ]
      .filter(Boolean)
      .join("\n\n"),
    disclaimer:
      "Brouillon de retour validation. Vérifie bien la décision métier finale avant envoi.",
    suggestedRecipients: recipients,
    subject: ensureReplySubject(input.subject),
    type: input.replyType,
  };
}

function ensureReplySubject(subject: string) {
  const trimmed = subject.trim();

  if (/^re:/i.test(trimmed)) {
    return trimmed;
  }

  return `RE: ${trimmed}`;
}

function humanizeRequestType(value: string | null) {
  if (!value) {
    return null;
  }

  return value
    .replace(/_/g, " ")
    .replace(/\b\w/g, (match) => match.toUpperCase());
}

function humanizeValue(value: string) {
  return value.replace(/_/g, " ");
}

function formatDueAt(value: string | null) {
  if (!value) {
    return null;
  }

  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(parsed);
}
