import "server-only";

import { getCurrentUserContext } from "@/features/auth/queries";
import {
  appRoleLabels,
  canRole,
  normalizeAppUserRole,
  type AppPermission,
} from "@/features/auth/authorization";

export async function authorizeServerAction(permission: AppPermission) {
  return authorizeServerPermissions([permission]);
}

export async function authorizeServerPermissions(permissions: AppPermission[]) {
  const currentUser = await getCurrentUserContext();

  if (!currentUser?.authUser) {
    return {
      ok: false as const,
      message: "Session Supabase introuvable. Reconnecte-toi pour continuer.",
    };
  }

  const role = normalizeAppUserRole(currentUser.appUser?.role ?? null);
  const missingPermission = permissions.find((permission) => !canRole(role, permission));

  if (missingPermission) {
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
