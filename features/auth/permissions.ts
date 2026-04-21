import type { AppUserRole } from "@/types/crm";

export type AppPermission =
  | "assistant.manage"
  | "assistant.read"
  | "assistant.write.safe"
  | "automations.run"
  | "clients.create"
  | "deadlines.create"
  | "deadlines.update"
  | "documents.create"
  | "emails.qualify"
  | "emails.sync"
  | "monitoring.read"
  | "orders.create"
  | "productions.create"
  | "productions.update"
  | "reply.generate"
  | "requests.create"
  | "requests.update"
  | "tasks.create"
  | "tasks.update"
  | "validations.create";

export const appRoleLabels: Record<AppUserRole, string> = {
  admin: "Admin",
  development: "Développement",
  logistics: "Logistique",
  production: "Production",
  sales: "Sales",
};

export const DEFAULT_APP_ROLE: AppUserRole = "admin";

const rolePermissions: Record<AppUserRole, AppPermission[]> = {
  admin: [
    "assistant.manage",
    "assistant.read",
    "assistant.write.safe",
    "automations.run",
    "clients.create",
    "deadlines.create",
    "deadlines.update",
    "documents.create",
    "emails.qualify",
    "emails.sync",
    "monitoring.read",
    "orders.create",
    "productions.create",
    "productions.update",
    "reply.generate",
    "requests.create",
    "requests.update",
    "tasks.create",
    "tasks.update",
    "validations.create",
  ],
  development: [
    "assistant.manage",
    "assistant.read",
    "assistant.write.safe",
    "automations.run",
    "clients.create",
    "deadlines.create",
    "deadlines.update",
    "documents.create",
    "emails.qualify",
    "monitoring.read",
    "reply.generate",
    "requests.create",
    "requests.update",
    "tasks.create",
    "tasks.update",
    "validations.create",
  ],
  logistics: [
    "assistant.read",
    "assistant.write.safe",
    "automations.run",
    "deadlines.create",
    "deadlines.update",
    "documents.create",
    "orders.create",
    "productions.create",
    "productions.update",
    "reply.generate",
    "tasks.create",
    "tasks.update",
  ],
  production: [
    "assistant.read",
    "assistant.write.safe",
    "automations.run",
    "deadlines.create",
    "deadlines.update",
    "documents.create",
    "productions.create",
    "productions.update",
    "reply.generate",
    "tasks.create",
    "tasks.update",
  ],
  sales: [
    "assistant.read",
    "assistant.write.safe",
    "automations.run",
    "clients.create",
    "deadlines.create",
    "deadlines.update",
    "documents.create",
    "emails.qualify",
    "emails.sync",
    "reply.generate",
    "requests.create",
    "requests.update",
    "tasks.create",
    "tasks.update",
  ],
};

export function normalizeAppUserRole(value: string | null | undefined): AppUserRole {
  const normalized = (value ?? "").trim().toLowerCase();

  if (
    normalized === "admin" ||
    normalized === "development" ||
    normalized === "production" ||
    normalized === "logistics" ||
    normalized === "sales"
  ) {
    return normalized;
  }

  return DEFAULT_APP_ROLE;
}

export function isExplicitAdminRole(value: string | null | undefined) {
  return (value ?? "").trim().toLowerCase() === "admin";
}

export function getPermissionsForRole(role: AppUserRole) {
  return rolePermissions[role];
}

export function canRole(role: AppUserRole, permission: AppPermission) {
  return rolePermissions[role].includes(permission);
}

export function canSyncGmail(role: AppUserRole) {
  return canRole(role, "emails.sync");
}

export function canModifyProduction(role: AppUserRole) {
  return canRole(role, "productions.update");
}

export function canManageRequests(role: AppUserRole) {
  return canRole(role, "requests.update") || canRole(role, "requests.create");
}

export function canCloseRequest(role: AppUserRole) {
  return canRole(role, "requests.update") && role !== "logistics" && role !== "production";
}

export function canCreateDeadlines(role: AppUserRole) {
  return canRole(role, "deadlines.create");
}

export function canCreateDocuments(role: AppUserRole) {
  return canRole(role, "documents.create");
}

export function canUseAssistantReadActions(role: AppUserRole) {
  return canRole(role, "assistant.read");
}

export function canUseAssistantSafeActions(role: AppUserRole) {
  return canRole(role, "assistant.write.safe");
}

export function canUseAssistantSensitiveActions(role: AppUserRole) {
  return canRole(role, "assistant.manage");
}

export function canReadMonitoring(role: AppUserRole) {
  return canRole(role, "monitoring.read");
}
