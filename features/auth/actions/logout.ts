"use server";

import { redirect } from "next/navigation";

import { createSupabaseServerClient, hasSupabaseEnv } from "@/lib/supabase/server";

export async function logoutAction() {
  if (hasSupabaseEnv) {
    const supabase = await createSupabaseServerClient();

    await supabase.auth.signOut();
  }

  redirect("/login");
}
