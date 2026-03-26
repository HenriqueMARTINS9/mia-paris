import "server-only";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/lib/supabase/database.types";
import { getSupabaseAdminEnv } from "@/lib/supabase/env";

let adminClient: SupabaseClient<Database> | null = null;

export function createSupabaseAdminClient(): SupabaseClient<Database> {
  if (adminClient) {
    return adminClient;
  }

  const { supabaseUrl, supabaseServiceRoleKey } = getSupabaseAdminEnv();

  adminClient = createClient<Database>(supabaseUrl, supabaseServiceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  return adminClient;
}
