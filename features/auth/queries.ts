import "server-only";

import { redirect } from "next/navigation";
import type { SupabaseClient } from "@supabase/supabase-js";

import type { CurrentUserContext } from "@/features/auth/types";
import type { Database } from "@/lib/supabase/database.types";
import { createSupabaseServerClient, hasSupabaseEnv } from "@/lib/supabase/server";
import type { UserRecord } from "@/types/crm";

const DEFAULT_REDIRECT_PATH = "/demandes";

export async function getCurrentAuthUser() {
  if (!hasSupabaseEnv) {
    return null;
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error) {
    return null;
  }

  return user;
}

export async function getCurrentUserContext(): Promise<CurrentUserContext | null> {
  if (!hasSupabaseEnv) {
    return null;
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return null;
  }

  return {
    authUser: user,
    appUser: await getCurrentAppUserWithClient(supabase, user.id),
  };
}

export async function requireCurrentUserContext(): Promise<CurrentUserContext> {
  const currentUser = await getCurrentUserContext();

  if (!currentUser) {
    redirect("/login");
  }

  return currentUser;
}

export async function getCurrentAppUser(): Promise<UserRecord | null> {
  if (!hasSupabaseEnv) {
    return null;
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return null;
  }

  return getCurrentAppUserWithClient(supabase, user.id);
}

export function normalizeRedirectPath(pathname: string | null | undefined) {
  if (!pathname || !pathname.startsWith("/") || pathname.startsWith("//")) {
    return DEFAULT_REDIRECT_PATH;
  }

  if (pathname === "/login") {
    return DEFAULT_REDIRECT_PATH;
  }

  return pathname;
}

async function getCurrentAppUserWithClient(
  supabase: SupabaseClient<Database>,
  authUserId: string,
): Promise<UserRecord | null> {
  const selectVariants = [
    "id,auth_user_id,full_name,email,role",
    "id,auth_user_id,full_name,email",
  ] as const;

  for (const select of selectVariants) {
    const { data, error } = await supabase
      .from("users")
      .select(select)
      .eq("auth_user_id", authUserId)
      .maybeSingle();

    if (!error) {
      return data;
    }

    if (isMissingAuthUserIdColumnError(error)) {
      return null;
    }

    if (isMissingRoleColumnError(error) && select.includes("role")) {
      continue;
    }

    throw new Error(
      `Impossible de charger le profil métier courant depuis public.users: ${error.message}`,
    );
  }

  return null;
}

function isMissingAuthUserIdColumnError(error: {
  code?: string;
  message: string;
}) {
  return (
    error.code === "42703" ||
    error.message.toLowerCase().includes("auth_user_id")
  );
}

function isMissingRoleColumnError(error: { code?: string; message: string }) {
  return error.code === "42703" || error.message.toLowerCase().includes("role");
}
