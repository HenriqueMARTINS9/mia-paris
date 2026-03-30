"use client";

import type { ReactNode } from "react";

import { useAuthorization } from "@/features/auth/components/auth-role-provider";
import type { AppPermission } from "@/features/auth/authorization";

export function RoleGate({
  children,
  fallback = null,
  permission,
}: Readonly<{
  children: ReactNode;
  fallback?: ReactNode;
  permission: AppPermission;
}>) {
  const { can } = useAuthorization();

  if (!can(permission)) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}
