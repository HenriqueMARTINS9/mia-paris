export interface GoogleOAuthTokenResponse {
  access_token: string;
  expires_in: number;
  refresh_token?: string;
  scope?: string;
  token_type: string;
}

export interface GmailMessageRef {
  id: string;
  threadId: string;
}

export interface GmailListMessagesResponse {
  messages?: GmailMessageRef[];
  nextPageToken?: string;
  resultSizeEstimate?: number;
}

export interface GmailHeader {
  name: string;
  value: string;
}

export interface GmailMessagePartBody {
  attachmentId?: string;
  data?: string;
  size?: number;
}

export interface GmailMessagePart {
  body?: GmailMessagePartBody;
  filename?: string;
  headers?: GmailHeader[];
  mimeType?: string;
  partId?: string;
  parts?: GmailMessagePart[];
}

export interface GmailMessageResource {
  id: string;
  internalDate?: string;
  labelIds?: string[];
  payload?: GmailMessagePart;
  snippet?: string;
  threadId: string;
}

export interface GmailProfileResponse {
  emailAddress: string;
  historyId?: string;
  messagesTotal?: number;
  threadsTotal?: number;
}

export interface ParsedGmailAttachment {
  contentId: string | null;
  externalAttachmentId: string | null;
  filename: string | null;
  isInline: boolean;
  mimeType: string | null;
  partId: string | null;
  sizeBytes: number | null;
}

export interface ParsedGmailMessage {
  bodyHtml: string | null;
  bodyText: string | null;
  ccEmails: string[];
  direction: "incoming" | "outgoing";
  externalMessageId: string;
  externalThreadId: string;
  fromEmail: string | null;
  fromName: string | null;
  isUnread: boolean;
  labels: string[];
  previewText: string | null;
  receivedAt: string;
  subject: string;
  toEmails: string[];
  attachments: ParsedGmailAttachment[];
}
