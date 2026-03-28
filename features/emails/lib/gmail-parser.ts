import type {
  GmailHeader,
  GmailMessagePart,
  GmailMessageResource,
  ParsedGmailAttachment,
  ParsedGmailMessage,
} from "@/types/google";

export function parseGmailMessage(
  message: GmailMessageResource,
  inboxEmailAddress: string | null,
): ParsedGmailMessage {
  const headers = message.payload?.headers ?? [];
  const subject = getHeaderValue(headers, "Subject") ?? message.snippet ?? "Sans sujet";
  const fromHeader = getHeaderValue(headers, "From");
  const toHeader = getHeaderValue(headers, "To");
  const ccHeader = getHeaderValue(headers, "Cc");
  const { bodyHtml, bodyText, attachments } = extractBodiesAndAttachments(
    message.payload ?? null,
  );
  const from = parseMailbox(fromHeader);
  const inboxAddress = normalizeEmailAddress(inboxEmailAddress);
  const fromAddress = normalizeEmailAddress(from.email);

  return {
    attachments,
    bodyHtml,
    bodyText,
    ccEmails: parseMailboxList(ccHeader),
    direction:
      inboxAddress && fromAddress && inboxAddress === fromAddress
        ? "outgoing"
        : "incoming",
    externalMessageId: message.id,
    externalThreadId: message.threadId,
    fromEmail: from.email,
    fromName: from.name,
    isUnread: Boolean(message.labelIds?.includes("UNREAD")),
    labels: message.labelIds ?? [],
    previewText: bodyText?.slice(0, 280) ?? message.snippet ?? null,
    receivedAt: resolveReceivedAt(headers, message.internalDate),
    subject,
    toEmails: parseMailboxList(toHeader),
  };
}

function extractBodiesAndAttachments(part: GmailMessagePart | null): {
  attachments: ParsedGmailAttachment[];
  bodyHtml: string | null;
  bodyText: string | null;
} {
  const collector = {
    attachments: [] as ParsedGmailAttachment[],
    bodyHtml: null as string | null,
    bodyText: null as string | null,
  };

  visitPartTree(part, collector);

  return collector;
}

function visitPartTree(
  part: GmailMessagePart | null,
  collector: {
    attachments: ParsedGmailAttachment[];
    bodyHtml: string | null;
    bodyText: string | null;
  },
) {
  if (!part) {
    return;
  }

  if (part.mimeType === "text/plain" && !collector.bodyText) {
    collector.bodyText = decodeBody(part.body?.data);
  }

  if (part.mimeType === "text/html" && !collector.bodyHtml) {
    collector.bodyHtml = decodeBody(part.body?.data);
  }

  if ((part.filename ?? "").trim().length > 0 || part.body?.attachmentId) {
    collector.attachments.push({
      contentId: getHeaderValue(part.headers ?? [], "Content-Id"),
      externalAttachmentId: part.body?.attachmentId ?? null,
      filename: part.filename?.trim() || null,
      isInline: getDisposition(part.headers ?? []) === "inline",
      mimeType: part.mimeType ?? null,
      partId: part.partId ?? null,
      sizeBytes: part.body?.size ?? null,
    });
  }

  for (const childPart of part.parts ?? []) {
    visitPartTree(childPart, collector);
  }

  if (!collector.bodyText && !collector.bodyHtml && part.body?.data) {
    const decoded = decodeBody(part.body.data);

    if (part.mimeType?.includes("html")) {
      collector.bodyHtml = decoded;
    } else {
      collector.bodyText = decoded;
    }
  }
}

function decodeBody(value: string | undefined) {
  if (!value) {
    return null;
  }

  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padding = normalized.length % 4 === 0 ? 0 : 4 - (normalized.length % 4);

  return Buffer.from(`${normalized}${"=".repeat(padding)}`, "base64").toString(
    "utf-8",
  );
}

function getHeaderValue(headers: GmailHeader[], name: string) {
  const match = headers.find(
    (header) => header.name.toLowerCase() === name.toLowerCase(),
  );

  return match?.value ?? null;
}

function parseMailboxList(value: string | null) {
  if (!value) {
    return [] as string[];
  }

  return value
    .split(",")
    .map((item) => parseMailbox(item).email)
    .filter((item): item is string => Boolean(item));
}

function parseMailbox(value: string | null) {
  if (!value) {
    return {
      email: null,
      name: null,
    };
  }

  const trimmed = value.trim();
  const angleMatch = trimmed.match(/^(.*?)<([^>]+)>$/);

  if (angleMatch) {
    return {
      email: angleMatch[2]?.trim().toLowerCase() ?? null,
      name: angleMatch[1]?.trim().replace(/^"|"$/g, "") || null,
    };
  }

  const emailMatch = trimmed.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);

  return {
    email: emailMatch?.[0]?.toLowerCase() ?? null,
    name: emailMatch ? trimmed.replace(emailMatch[0], "").trim() || null : null,
  };
}

function getDisposition(headers: GmailHeader[]) {
  const value = getHeaderValue(headers, "Content-Disposition");

  if (!value) {
    return null;
  }

  return value.toLowerCase().includes("inline") ? "inline" : "attachment";
}

function resolveReceivedAt(headers: GmailHeader[], internalDate: string | undefined) {
  const headerDate = getHeaderValue(headers, "Date");

  if (headerDate) {
    const parsed = new Date(headerDate);

    if (!Number.isNaN(parsed.getTime())) {
      return parsed.toISOString();
    }
  }

  if (internalDate) {
    const parsed = new Date(Number(internalDate));

    if (!Number.isNaN(parsed.getTime())) {
      return parsed.toISOString();
    }
  }

  return new Date().toISOString();
}

function normalizeEmailAddress(value: string | null | undefined) {
  return value?.trim().toLowerCase() ?? null;
}
