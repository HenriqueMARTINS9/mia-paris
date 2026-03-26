import "server-only";

import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/lib/supabase/database.types";
import { getSupabaseEnv } from "@/lib/supabase/env";

export { hasSupabaseAdminEnv, hasSupabaseEnv } from "@/lib/supabase/env";

export async function createSupabaseServerClient(): Promise<
  SupabaseClient<Database>
> {
  const cookieStore = await cookies();
  const { supabaseUrl, supabasePublishableKey } = getSupabaseEnv();

  return createServerClient<Database>(supabaseUrl, supabasePublishableKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
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
              cookieStore.set(name, value, options);
            },
          );
        } catch {
          // Les Server Components peuvent être en lecture seule. L'écriture
          // de cookies sera activée plus tard dans les handlers d'auth.
        }
      },
    },
  });
}
