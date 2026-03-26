import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import { getSupabaseEnv, hasSupabaseEnv } from "@/lib/supabase/env";

const LOGIN_PATH = "/login";
const DEFAULT_PROTECTED_REDIRECT = "/demandes";

export async function updateSession(request: NextRequest) {
  if (!hasSupabaseEnv) {
    return NextResponse.next({
      request,
    });
  }

  let response = NextResponse.next({
    request,
  });

  const { supabaseUrl, supabasePublishableKey } = getSupabaseEnv();
  const supabase = createServerClient(supabaseUrl, supabasePublishableKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }: { name: string; value: string }) => {
          request.cookies.set(name, value);
        });

        response = NextResponse.next({
          request,
        });

        cookiesToSet.forEach(
          ({
            name,
            value,
            options,
          }: {
            name: string;
            value: string;
            options: CookieOptions;
          }) => {
            response.cookies.set(name, value, options);
          },
        );
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();
  const pathname = request.nextUrl.pathname;
  const search = request.nextUrl.search;

  if (!user && pathname !== LOGIN_PATH) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = LOGIN_PATH;
    loginUrl.searchParams.set("next", `${pathname}${search}`);

    return NextResponse.redirect(loginUrl);
  }

  if (user && pathname === LOGIN_PATH) {
    const redirectUrl = request.nextUrl.clone();
    const requestedNext = request.nextUrl.searchParams.get("next");

    redirectUrl.pathname = getSafeRedirectPath(requestedNext);
    redirectUrl.search = "";

    return NextResponse.redirect(redirectUrl);
  }

  return response;
}

function getSafeRedirectPath(pathname: string | null) {
  if (!pathname || !pathname.startsWith("/") || pathname.startsWith("//")) {
    return DEFAULT_PROTECTED_REDIRECT;
  }

  if (pathname === LOGIN_PATH) {
    return DEFAULT_PROTECTED_REDIRECT;
  }

  return pathname;
}
