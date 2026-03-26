"use server";

import { redirect } from "next/navigation";

import { normalizeRedirectPath } from "@/features/auth/queries";
import type { LoginFormState } from "@/features/auth/types";
import { createSupabaseServerClient, hasSupabaseEnv } from "@/lib/supabase/server";

export async function loginAction(
  _previousState: LoginFormState,
  formData: FormData,
): Promise<LoginFormState> {
  if (!hasSupabaseEnv) {
    return {
      error:
        "Configuration Supabase absente. Vérifie NEXT_PUBLIC_SUPABASE_URL et la clé publishable.",
    };
  }

  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();
  const password = String(formData.get("password") ?? "");
  const redirectTo = normalizeRedirectPath(
    String(formData.get("redirectTo") ?? ""),
  );

  if (!email || !password) {
    return {
      error: "Renseigne ton email et ton mot de passe.",
    };
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return {
      error: getLoginErrorMessage(error.message),
    };
  }

  redirect(redirectTo);
}

function getLoginErrorMessage(message: string) {
  const normalizedMessage = message.toLowerCase();

  if (normalizedMessage.includes("invalid login credentials")) {
    return "Email ou mot de passe incorrect.";
  }

  if (normalizedMessage.includes("email not confirmed")) {
    return "Adresse email non confirmée sur Supabase.";
  }

  return `Connexion impossible: ${message}`;
}
