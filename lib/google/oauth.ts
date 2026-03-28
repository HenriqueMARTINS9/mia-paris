import "server-only";

import { getGoogleGmailEnv } from "@/lib/google/env";
import type { GoogleOAuthTokenResponse } from "@/types/google";

const GOOGLE_AUTH_BASE_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";

export function buildGoogleOAuthUrl(input: { redirectUri?: string; state: string }) {
  const env = getGoogleGmailEnv();
  const params = new URLSearchParams({
    access_type: "offline",
    client_id: env.googleClientId,
    include_granted_scopes: "true",
    prompt: "consent",
    redirect_uri: input.redirectUri ?? env.googleGmailRedirectUri,
    response_type: "code",
    scope: env.googleGmailScope,
    state: input.state,
  });

  return `${GOOGLE_AUTH_BASE_URL}?${params.toString()}`;
}

export async function exchangeGoogleCodeForTokens(input: {
  code: string;
  redirectUri?: string;
}) {
  const env = getGoogleGmailEnv();
  const response = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      client_id: env.googleClientId,
      client_secret: env.googleClientSecret,
      code: input.code,
      grant_type: "authorization_code",
      redirect_uri: input.redirectUri ?? env.googleGmailRedirectUri,
    }).toString(),
    cache: "no-store",
  });

  const payload = (await response.json()) as GoogleOAuthTokenResponse & {
    error?: string;
    error_description?: string;
  };

  if (!response.ok || !payload.access_token) {
    throw new Error(
      payload.error_description ??
        payload.error ??
        "Échange OAuth Google impossible.",
    );
  }

  return payload;
}

export async function refreshGoogleAccessToken(input: { refreshToken: string }) {
  const env = getGoogleGmailEnv();
  const response = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      client_id: env.googleClientId,
      client_secret: env.googleClientSecret,
      grant_type: "refresh_token",
      refresh_token: input.refreshToken,
    }).toString(),
    cache: "no-store",
  });

  const payload = (await response.json()) as GoogleOAuthTokenResponse & {
    error?: string;
    error_description?: string;
  };

  if (!response.ok || !payload.access_token) {
    throw new Error(
      payload.error_description ??
        payload.error ??
        "Refresh token Google impossible.",
    );
  }

  return payload;
}
