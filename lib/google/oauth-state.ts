import "server-only";

export const GMAIL_OAUTH_STATE_COOKIE = "mia_gmail_oauth_state";

export interface GmailOAuthState {
  authUserId?: string;
  appUserId?: string;
  redirectTo: string;
  state: string;
}

export function serializeGmailOAuthState(value: GmailOAuthState) {
  return encodeURIComponent(JSON.stringify(value));
}

export function parseGmailOAuthState(value: string | undefined) {
  if (!value) {
    return null;
  }

  const candidates = [
    value,
    safelyDecodeURIComponent(value),
  ].filter((candidate, index, array) => {
    return typeof candidate === "string" && array.indexOf(candidate) === index;
  });

  try {
    for (const candidate of candidates) {
      try {
        return JSON.parse(candidate) as GmailOAuthState;
      } catch {
        continue;
      }
    }
  } catch {
    return null;
  }

  return null;
}

function safelyDecodeURIComponent(value: string) {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}
