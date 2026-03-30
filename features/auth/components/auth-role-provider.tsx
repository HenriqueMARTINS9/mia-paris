"use client";

import {
  createContext,
  useContext,
  useMemo,
} from "react";

import {
  canRole,
  getPermissionsForRole,
  normalizeAppUserRole,
  type AppPermission,
} from "@/features/auth/authorization";
import type { AppUserRole } from "@/types/crm";

interface AuthorizationContextValue {
  isAdminExplicit: boolean;
  permissions: AppPermission[];
  rawRole: string | null;
  role: AppUserRole;
}

const AuthorizationContext = createContext<AuthorizationContextValue | null>(null);

export function AuthRoleProvider({
  children,
  role,
}: Readonly<{
  children: React.ReactNode;
  role: string | null | undefined;
}>) {
  const normalizedRole = normalizeAppUserRole(role);
  const value = useMemo<AuthorizationContextValue>(
    () => ({
      isAdminExplicit: (role ?? "").trim().toLowerCase() === "admin",
      permissions: getPermissionsForRole(normalizedRole),
      rawRole: role ?? null,
      role: normalizedRole,
    }),
    [normalizedRole, role],
  );

  return (
    <AuthorizationContext.Provider value={value}>
      {children}
    </AuthorizationContext.Provider>
  );
}

export function useAuthorization() {
  const context = useContext(AuthorizationContext);

  if (!context) {
    const role = normalizeAppUserRole(null);

    return {
      can: (permission: AppPermission) => canRole(role, permission),
      isAdminExplicit: false,
      permissions: getPermissionsForRole(role),
      rawRole: null,
      role,
    };
  }

  return {
    can: (permission: AppPermission) => canRole(context.role, permission),
    isAdminExplicit: context.isAdminExplicit,
    permissions: context.permissions,
    rawRole: context.rawRole,
    role: context.role,
  };
}
