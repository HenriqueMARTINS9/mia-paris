import "server-only";

const googleClientId = process.env.GOOGLE_CLIENT_ID;
const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET;
const googleGmailRedirectUri = process.env.GOOGLE_GMAIL_REDIRECT_URI;
const googleGmailInitialSyncLimit = Number(
  process.env.GOOGLE_GMAIL_INITIAL_SYNC_LIMIT ?? "50",
);
const googleGmailSyncQuery = process.env.GOOGLE_GMAIL_SYNC_QUERY ?? "";
const googleGmailScope =
  process.env.GOOGLE_GMAIL_SCOPE ??
  "https://www.googleapis.com/auth/gmail.readonly";

export const hasGoogleGmailEnv = Boolean(
  googleClientId && googleClientSecret && googleGmailRedirectUri,
);

export function getGoogleGmailEnv() {
  if (!googleClientId || !googleClientSecret || !googleGmailRedirectUri) {
    throw new Error(
      "Configuration Gmail manquante. Renseigne GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET et GOOGLE_GMAIL_REDIRECT_URI.",
    );
  }

  return {
    googleClientId,
    googleClientSecret,
    googleGmailInitialSyncLimit:
      Number.isFinite(googleGmailInitialSyncLimit) && googleGmailInitialSyncLimit > 0
        ? Math.min(Math.trunc(googleGmailInitialSyncLimit), 100)
        : 50,
    googleGmailRedirectUri,
    googleGmailScope,
    googleGmailSyncQuery,
  };
}
