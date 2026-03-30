import "server-only";

import { getCurrentUserContext } from "@/features/auth/queries";
import {
  appRoleLabels,
  canRole,
  normalizeAppUserRole,
  type AppPermission,
} from "@/features/auth/authorization";

export async function authorizeServerAction(permission: AppPermission) {
  const currentUser = await getCurrentUserContext();

  if (!currentUser?.authUser) {
    return {
      ok: false as const,
      message: "Session Supabase introuvable. Reconnecte-toi pour continuer.",
    };
  }

  const role = normalizeAppUserRole(currentUser.appUser?.role ?? null);

  if (!canRole(role, permission)) {
    return {
      ok: false as const,
      message: `Action non autorisée pour le rôle ${appRoleLabels[role]}.`,
    };
  }

  return {
    ok: true as const,
    currentUser,
    role,
  };
}
