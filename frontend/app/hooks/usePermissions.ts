"use client";

import { useAuth } from "./useAuth";

const ROLE_PERMISSIONS: Record<string, string[]> = {
  admin: [
    // Admin has all permissions
    "statement.view",
    "workspaces.view",
    "statement.upload",
    "statement.delete",
    "statement.edit",
    "transaction.view",
    "transaction.edit",
    "transaction.delete",
    "transaction.bulk_update",
    "category.view",
    "category.create",
    "category.edit",
    "category.delete",
    "branch.view",
    "branch.create",
    "branch.edit",
    "branch.delete",
    "wallet.view",
    "wallet.create",
    "wallet.edit",
    "wallet.delete",
    "report.view",
    "report.export",
    "google_sheet.view",
    "google_sheet.connect",
    "google_sheet.sync",
    "user.manage",
    "user.view_all",
    "audit_view",
    "audit_log.view",
    "telegram.view",
    "telegram.connect",
    "telegram.send",
  ],
  user: [
    // View-only permissions for regular users
    "statement.view",
    "workspaces.view",
    "transaction.view",
    "category.view",
    "branch.view",
    "wallet.view",
    "report.view",
    "google_sheet.view",
    "telegram.view",
    "telegram.connect",
    "telegram.send",
  ],
  viewer: [
    // Read-only permissions
    "statement.view",
    "workspaces.view",
    "transaction.view",
    "category.view",
    "branch.view",
    "wallet.view",
    "report.view",
    "telegram.view",
  ],
};

export function usePermissions() {
  const { user } = useAuth();

  const getUserPermissions = (): string[] => {
    if (!user) return [];

    // Admin has all permissions
    if (user.role === "admin") {
      return ROLE_PERMISSIONS.admin;
    }

    // If user has custom permissions, merge with role-based
    const rolePermissions = ROLE_PERMISSIONS[user.role] || [];
    const customPermissions = user.permissions || [];

    // Merge and deduplicate
    const merged = [...new Set([...rolePermissions, ...customPermissions])];
    if (merged.includes("audit_log.view") && !merged.includes("audit_view")) {
      merged.push("audit_view");
    }
    if (merged.includes("audit_view") && !merged.includes("audit_log.view")) {
      merged.push("audit_log.view");
    }
    return merged;
  };

  const hasPermission = (permission: string): boolean => {
    const permissions = getUserPermissions();
    return permissions.includes(permission);
  };

  const hasAnyPermission = (permissions: string[]): boolean => {
    const userPermissions = getUserPermissions();
    return permissions.some((p) => userPermissions.includes(p));
  };

  const hasAllPermissions = (permissions: string[]): boolean => {
    const userPermissions = getUserPermissions();
    return permissions.every((p) => userPermissions.includes(p));
  };

  return {
    permissions: getUserPermissions(),
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    isAdmin: user?.role === "admin",
  };
}
