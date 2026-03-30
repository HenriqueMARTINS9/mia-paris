"use client";

import {
  createContext,
  useContext,
  useMemo,
} from "react";

import {
  canCloseRequest,
  canCreateDeadlines,
  canCreateDocuments,
  canManageRequests,
  canModifyProduction,
  canReadMonitoring,
  canRole,
  canSyncGmail,
  canUseAssistantReadActions,
  canUseAssistantSafeActions,
  canUseAssistantSensitiveActions,
  getPermissionsForRole,
  normalizeAppUserRole,
  type AppPermission,
} from "@/features/auth/authorization";
import type { AppUserRole } from "@/types/crm";

interface AuthorizationContextValue {
  canCloseRequest: boolean;
  canCreateDeadlines: boolean;
  canCreateDocuments: boolean;
  canManageRequests: boolean;
  canModifyProduction: boolean;
  canReadMonitoring: boolean;
  canSyncGmail: boolean;
  canUseAssistantReadActions: boolean;
  canUseAssistantSafeActions: boolean;
  canUseAssistantSensitiveActions: boolean;
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
      canCloseRequest: canCloseRequest(normalizedRole),
      canCreateDeadlines: canCreateDeadlines(normalizedRole),
      canCreateDocuments: canCreateDocuments(normalizedRole),
      canManageRequests: canManageRequests(normalizedRole),
      canModifyProduction: canModifyProduction(normalizedRole),
      canReadMonitoring: canReadMonitoring(normalizedRole),
      canSyncGmail: canSyncGmail(normalizedRole),
      canUseAssistantReadActions: canUseAssistantReadActions(normalizedRole),
      canUseAssistantSafeActions: canUseAssistantSafeActions(normalizedRole),
      canUseAssistantSensitiveActions: canUseAssistantSensitiveActions(normalizedRole),
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
      canCloseRequest: canCloseRequest(role),
      canCreateDeadlines: canCreateDeadlines(role),
      canCreateDocuments: canCreateDocuments(role),
      canManageRequests: canManageRequests(role),
      canModifyProduction: canModifyProduction(role),
      canReadMonitoring: canReadMonitoring(role),
      canSyncGmail: canSyncGmail(role),
      canUseAssistantReadActions: canUseAssistantReadActions(role),
      canUseAssistantSafeActions: canUseAssistantSafeActions(role),
      canUseAssistantSensitiveActions: canUseAssistantSensitiveActions(role),
      isAdminExplicit: false,
      permissions: getPermissionsForRole(role),
      rawRole: null,
      role,
    };
  }

  return {
    can: (permission: AppPermission) => canRole(context.role, permission),
    canCloseRequest: context.canCloseRequest,
    canCreateDeadlines: context.canCreateDeadlines,
    canCreateDocuments: context.canCreateDocuments,
    canManageRequests: context.canManageRequests,
    canModifyProduction: context.canModifyProduction,
    canReadMonitoring: context.canReadMonitoring,
    canSyncGmail: context.canSyncGmail,
    canUseAssistantReadActions: context.canUseAssistantReadActions,
    canUseAssistantSafeActions: context.canUseAssistantSafeActions,
    canUseAssistantSensitiveActions: context.canUseAssistantSensitiveActions,
    isAdminExplicit: context.isAdminExplicit,
    permissions: context.permissions,
    rawRole: context.rawRole,
    role: context.role,
  };
}
