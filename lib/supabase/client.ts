import { createBrowserClient } from "@supabase/ssr";

import type { Database } from "@/lib/supabase/database.types";
import { getSupabaseEnv } from "@/lib/supabase/env";

let browserClient: ReturnType<typeof createBrowserClient<Database>> | undefined;

export function createSupabaseBrowserClient() {
  if (browserClient) {
    return browserClient;
  }

  const { supabaseUrl, supabasePublishableKey } = getSupabaseEnv();

  browserClient = createBrowserClient<Database>(
    supabaseUrl,
    supabasePublishableKey,
  );

  return browserClient;
}
