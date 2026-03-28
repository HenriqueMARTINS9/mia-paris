import { NextRequest, NextResponse } from "next/server";

import {
  getCurrentUserContext,
  normalizeRedirectPath,
} from "@/features/auth/queries";
import { getGmailProfile } from "@/lib/google/gmail";
import { exchangeGoogleCodeForTokens } from "@/lib/google/oauth";
import {
  GMAIL_OAUTH_STATE_COOKIE,
  parseGmailOAuthState,
} from "@/lib/google/oauth-state";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { Database } from "@/lib/supabase/database.types";
import { hasSupabaseAdminEnv } from "@/lib/supabase/env";

export async function GET(request: NextRequest) {
  const redirectWithCleanup = (url: URL) => {
    const response = NextResponse.redirect(url);
    response.cookies.delete(GMAIL_OAUTH_STATE_COOKIE);
    return response;
  };
  const redirectUrl = new URL("/emails", request.nextUrl.origin);
  const code = request.nextUrl.searchParams.get("code");
  const state = request.nextUrl.searchParams.get("state");
  const oauthState = parseGmailOAuthState(
    request.cookies.get(GMAIL_OAUTH_STATE_COOKIE)?.value,
  );
  const currentUser = await getCurrentUserContext();

  if (!hasSupabaseAdminEnv) {
    redirectUrl.searchParams.set(
      "gmail",
      "supabase_service_role_missing",
    );
    return redirectWithCleanup(redirectUrl);
  }

  if (
    !code ||
    !state ||
    !oauthState ||
    oauthState.state !== state ||
    !currentUser?.appUser ||
    oauthState.appUserId !== currentUser.appUser.id
  ) {
    redirectUrl.searchParams.set("gmail", "oauth_state_error");
    return redirectWithCleanup(redirectUrl);
  }

  try {
    const tokens = await exchangeGoogleCodeForTokens({
      code,
    });
    const profile = await getGmailProfile(tokens.access_token);
    const admin = createSupabaseAdminClient();
    const now = new Date().toISOString();
    const expiresAt = new Date(
      Date.now() + tokens.expires_in * 1000,
    ).toISOString();
    const existingInboxResult = await admin
      .from("inboxes")
      .select("id,refresh_token")
      .eq("user_id", currentUser.appUser.id)
      .eq("provider", "google")
      .eq("email_address", profile.emailAddress)
      .maybeSingle();

    if (existingInboxResult.error) {
      throw new Error(existingInboxResult.error.message);
    }
    const previousRefreshToken =
      (
        existingInboxResult.data as
          | { refresh_token?: string | null }
          | null
      )?.refresh_token ?? null;

    const inboxUpsertPayload = [
      {
        access_token: tokens.access_token,
        display_name: profile.emailAddress,
        email_address: profile.emailAddress,
        is_active: true,
        last_error: null,
        provider: "google",
        provider_account_id: profile.emailAddress,
        refresh_token:
          tokens.refresh_token ??
          previousRefreshToken ??
          null,
        scope: tokens.scope ?? null,
        token_expires_at: expiresAt,
        updated_at: now,
        user_id: currentUser.appUser.id,
      },
    ] satisfies Database["public"]["Tables"]["inboxes"]["Insert"][];

    const inboxUpsertResult = await admin
      .from("inboxes")
      .upsert(
        inboxUpsertPayload as never[],
        {
          onConflict: "user_id,provider,email_address",
        },
      )
      .select("id");

    if (inboxUpsertResult.error) {
      throw new Error(inboxUpsertResult.error.message);
    }

    redirectUrl.pathname = normalizeRedirectPath(oauthState.redirectTo || "/emails");
    redirectUrl.searchParams.set("gmail", "connected");
    redirectUrl.searchParams.set("gmail_account", profile.emailAddress);

    return redirectWithCleanup(redirectUrl);
  } catch (error) {
    redirectUrl.searchParams.set("gmail", "callback_error");
    redirectUrl.searchParams.set(
      "gmail_message",
      error instanceof Error ? error.message : "unknown_error",
    );

    return redirectWithCleanup(redirectUrl);
  }
}
