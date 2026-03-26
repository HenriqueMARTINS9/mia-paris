import type { User as AuthUser } from "@supabase/supabase-js";

import type { UserRecord } from "@/types/crm";

export interface CurrentUserContext {
  authUser: AuthUser;
  appUser: UserRecord | null;
}

export interface LoginFormState {
  error: string | null;
}
