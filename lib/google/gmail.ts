import "server-only";

import type {
  GmailListMessagesResponse,
  GmailMessageResource,
  GmailProfileResponse,
} from "@/types/google";

const GMAIL_API_BASE_URL = "https://gmail.googleapis.com/gmail/v1/users/me";

export async function getGmailProfile(accessToken: string) {
  return gmailApiFetch<GmailProfileResponse>("/profile", accessToken);
}

export async function listGmailMessages(input: {
  accessToken: string;
  maxResults: number;
  pageToken?: string | null;
  query?: string | null;
}) {
  return gmailApiFetch<GmailListMessagesResponse>("/messages", input.accessToken, {
    includeSpamTrash: false,
    maxResults: input.maxResults,
    pageToken: input.pageToken ?? undefined,
    q: input.query ?? undefined,
  });
}

export async function getGmailMessage(input: {
  accessToken: string;
  messageId: string;
}) {
  return gmailApiFetch<GmailMessageResource>(
    `/messages/${input.messageId}`,
    input.accessToken,
    {
      format: "full",
    },
  );
}

async function gmailApiFetch<T>(
  path: string,
  accessToken: string,
  params?: Record<string, string | number | boolean | undefined>,
) {
  const searchParams = new URLSearchParams();

  for (const [key, value] of Object.entries(params ?? {})) {
    if (value === undefined || value === null || value === "") {
      continue;
    }

    searchParams.set(key, String(value));
  }

  const query = searchParams.toString();
  const url = `${GMAIL_API_BASE_URL}${path}${query ? `?${query}` : ""}`;

  const response = await fetch(url, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    cache: "no-store",
  });

  const payload = (await response.json()) as T & {
    error?: { code?: number; message?: string; status?: string };
  };

  if (!response.ok) {
    throw new Error(
      payload.error?.message ?? "Appel Gmail API impossible.",
    );
  }

  return payload as T;
}
