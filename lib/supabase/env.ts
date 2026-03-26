const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabasePublishableKey =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY ??
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabaseServiceRoleKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SECRET_KEY;

export const hasSupabaseEnv = Boolean(
  supabaseUrl && supabasePublishableKey,
);
export const hasSupabaseAdminEnv = Boolean(
  supabaseUrl && supabaseServiceRoleKey,
);

export function getSupabaseEnv() {
  if (!supabaseUrl || !supabasePublishableKey) {
    throw new Error(
      "Configuration Supabase manquante. Renseigne NEXT_PUBLIC_SUPABASE_URL et une clé publishable/anon.",
    );
  }

  return {
    supabaseUrl,
    supabasePublishableKey,
  };
}

export function getSupabaseAdminEnv() {
  if (!supabaseUrl || !supabaseServiceRoleKey) {
    throw new Error(
      "Configuration Supabase admin manquante. Renseigne SUPABASE_SERVICE_ROLE_KEY côté serveur pour les mutations sur requests.",
    );
  }

  return {
    supabaseUrl,
    supabaseServiceRoleKey,
  };
}
