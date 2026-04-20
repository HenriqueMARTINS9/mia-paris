import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";

import {
  getCurrentUserContext,
  normalizeRedirectPath,
} from "@/features/auth/queries";
import { hasGoogleGmailEnv } from "@/lib/google/env";
import { buildGoogleOAuthUrl } from "@/lib/google/oauth";
import {
  GMAIL_OAUTH_STATE_COOKIE,
  serializeGmailOAuthState,
} from "@/lib/google/oauth-state";

export async function GET(request: NextRequest) {
  const currentUser = await getCurrentUserContext();

  if (!currentUser?.authUser) {
    return NextResponse.redirect(new URL("/login", request.nextUrl.origin));
  }

  if (!hasGoogleGmailEnv) {
    const errorUrl = new URL("/emails", request.nextUrl.origin);
    errorUrl.searchParams.set("gmail", "config_missing");
    return NextResponse.redirect(errorUrl);
  }

  const state = randomUUID();
  const redirectTo = normalizeRedirectPath(
    request.nextUrl.searchParams.get("redirectTo") ?? "/emails",
  );
  const oauthUrl = buildGoogleOAuthUrl({
    state,
  });
  const response = NextResponse.redirect(oauthUrl);

  response.cookies.set(
    GMAIL_OAUTH_STATE_COOKIE,
    serializeGmailOAuthState({
      appUserId: currentUser.appUser?.id ?? undefined,
      authUserId: currentUser.authUser.id,
      redirectTo,
      state,
    }),
    {
      httpOnly: true,
      maxAge: 60 * 10,
      path: "/",
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
    },
  );

  return response;
}
