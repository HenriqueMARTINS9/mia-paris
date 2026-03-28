import "server-only";

export const GMAIL_OAUTH_STATE_COOKIE = "mia_gmail_oauth_state";

export interface GmailOAuthState {
  appUserId: string;
  redirectTo: string;
  state: string;
}

export function serializeGmailOAuthState(value: GmailOAuthState) {
  return JSON.stringify(value);
}

export function parseGmailOAuthState(value: string | undefined) {
  if (!value) {
    return null;
  }

  try {
    return JSON.parse(value) as GmailOAuthState;
  } catch {
    return null;
  }
}
