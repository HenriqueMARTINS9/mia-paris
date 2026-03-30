import type { AppUserRole } from "@/types/crm";

export type AppPermission =
  | "documents.create"
  | "deadlines.create"
  | "deadlines.update"
  | "emails.qualify"
  | "emails.sync"
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
    "documents.create",
    "deadlines.create",
    "deadlines.update",
    "emails.qualify",
    "emails.sync",
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
    "documents.create",
    "deadlines.create",
    "deadlines.update",
    "emails.qualify",
    "reply.generate",
    "requests.create",
    "requests.update",
    "tasks.create",
    "tasks.update",
    "validations.create",
  ],
  logistics: [
    "documents.create",
    "deadlines.create",
    "deadlines.update",
    "orders.create",
    "productions.create",
    "productions.update",
    "reply.generate",
    "tasks.create",
    "tasks.update",
  ],
  production: [
    "documents.create",
    "deadlines.create",
    "deadlines.update",
    "productions.create",
    "productions.update",
    "reply.generate",
    "tasks.create",
    "tasks.update",
  ],
  sales: [
    "documents.create",
    "deadlines.create",
    "deadlines.update",
    "emails.qualify",
    "emails.sync",
    "reply.generate",
    "requests.create",
    "requests.update",
    "tasks.create",
    "tasks.update",
  ],
};

export function normalizeAppUserRole(
  value: string | null | undefined,
): AppUserRole {
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
