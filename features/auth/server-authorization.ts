import "server-only";

import { getCurrentUserContext } from "@/features/auth/queries";
import type { CurrentUserContext } from "@/features/auth/types";
import {
  appRoleLabels,
  canRole,
  normalizeAppUserRole,
  type AppPermission,
} from "@/features/auth/authorization";
import type { AppUserRole } from "@/types/crm";

export interface ServerPermissionOverride {
  actorId?: string | null;
  actorType?: string | null;
  currentUser?: CurrentUserContext | null;
  role: AppUserRole;
  source?: "assistant" | "system" | "ui";
}

export async function authorizeServerAction(permission: AppPermission) {
  return authorizeServerPermissions([permission]);
}

export async function authorizeServerPermissions(
  permissions: AppPermission[],
  override?: ServerPermissionOverride | null,
) {
  if (override) {
    const role = normalizeAppUserRole(override.role);
    const missingPermission = permissions.find(
      (permission) => !canRole(role, permission),
    );

    if (missingPermission) {
      return {
        ok: false as const,
        message: `Action non autorisée pour le rôle ${appRoleLabels[role]}.`,
      };
    }

    return {
      ok: true as const,
      currentUser: override.currentUser ?? null,
      role,
      actorId:
        override.actorId ??
        override.currentUser?.appUser?.id ??
        null,
      actorType:
        override.actorType ??
        (override.currentUser?.authUser ? "user" : "system"),
      source:
        override.source ??
        (override.actorType === "assistant" ? "assistant" : "system"),
    };
  }

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
    actorId: currentUser.appUser?.id ?? null,
    actorType: "user",
    source: "ui" as const,
  };
}
