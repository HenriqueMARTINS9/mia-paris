import { NextRequest, NextResponse } from "next/server";

import {
  getCurrentUserContext,
  normalizeRedirectPath,
} from "@/features/auth/queries";
import { isExplicitAdminRole } from "@/features/auth/authorization";
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
    !currentUser?.authUser ||
    !isMatchingOAuthUser(oauthState, currentUser)
  ) {
    redirectUrl.searchParams.set("gmail", "oauth_state_error");
    return redirectWithCleanup(redirectUrl);
  }

  if (!isExplicitAdminRole(currentUser.appUser?.role ?? null)) {
    redirectUrl.searchParams.set("gmail", "forbidden");
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
      .select("id,refresh_token,user_id")
      .eq("provider", "google")
      .eq("email_address", profile.emailAddress)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (existingInboxResult.error) {
      throw new Error(existingInboxResult.error.message);
    }
    const existingInbox =
      (
        existingInboxResult.data as
          | { id: string; refresh_token?: string | null; user_id?: string | null }
          | null
      ) ?? null;
    const previousRefreshToken = existingInbox?.refresh_token ?? null;
    const inboxOwnerId = currentUser.appUser?.id ?? existingInbox?.user_id ?? null;

    if (!inboxOwnerId) {
      throw new Error(
        "Aucun profil public.users disponible pour rattacher la boite Gmail partagee.",
      );
    }

    const sharedInboxPayload = {
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
      user_id: inboxOwnerId,
    } satisfies Database["public"]["Tables"]["inboxes"]["Insert"];

    let sharedInboxId: string | null = null;

    if (existingInbox?.id) {
      const inboxUpdateResult = await admin
        .from("inboxes")
        .update(sharedInboxPayload as Database["public"]["Tables"]["inboxes"]["Update"] as never)
        .eq("id", existingInbox.id)
        .select("id")
        .single();

      if (inboxUpdateResult.error) {
        throw new Error(inboxUpdateResult.error.message);
      }

      sharedInboxId = (inboxUpdateResult.data as { id: string } | null)?.id ?? null;
    } else {
      const inboxInsertResult = await admin
        .from("inboxes")
        .insert(
          {
            ...sharedInboxPayload,
            created_at: now,
          } as Database["public"]["Tables"]["inboxes"]["Insert"] as never,
        )
        .select("id")
        .single();

      if (inboxInsertResult.error) {
        throw new Error(inboxInsertResult.error.message);
      }

      sharedInboxId = (inboxInsertResult.data as { id: string } | null)?.id ?? null;
    }

    if (!sharedInboxId) {
      throw new Error("Impossible de retrouver l'identifiant de la boite Gmail partagee.");
    }

    const deactivateOtherInboxesResult = await admin
      .from("inboxes")
      .update(
        {
          is_active: false,
          updated_at: now,
        } as Database["public"]["Tables"]["inboxes"]["Update"] as never,
      )
      .eq("provider", "google")
      .neq("id", sharedInboxId);

    if (deactivateOtherInboxesResult.error) {
      throw new Error(deactivateOtherInboxesResult.error.message);
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

function isMatchingOAuthUser(
  oauthState: {
    appUserId?: string;
    authUserId?: string;
  },
  currentUser: NonNullable<Awaited<ReturnType<typeof getCurrentUserContext>>>,
) {
  if (oauthState.authUserId && oauthState.authUserId === currentUser.authUser.id) {
    return true;
  }

  if (oauthState.appUserId && currentUser.appUser?.id) {
    return oauthState.appUserId === currentUser.appUser.id;
  }

  return false;
}
