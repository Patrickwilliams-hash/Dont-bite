import type { AdminTier } from "@prisma/client";
import type { SessionUser } from "@/lib/auth/session";

export const ADMIN_PERMISSION_KEYS = [
  "view_audit_log",
  "manage_users",
  "manage_admins",
  "manage_content",
  "manage_drills",
] as const;

export type AdminPermissionKey = (typeof ADMIN_PERMISSION_KEYS)[number];

export const ADMIN_PERMISSION_LABELS: Record<AdminPermissionKey, string> = {
  view_audit_log: "View activity log",
  manage_users: "Manage users",
  manage_admins: "Manage administrators",
  manage_content: "Manage content",
  manage_drills: "Manage drills",
};

export function isSuperAdmin(user: Pick<SessionUser, "adminTier">): boolean {
  return user.adminTier === "super_admin";
}

export function hasAdminPermission(
  user: Pick<SessionUser, "adminTier" | "adminPermissions">,
  permission: AdminPermissionKey
): boolean {
  if (isSuperAdmin(user)) return true;
  return user.adminPermissions.includes(permission);
}

export function summarizeAdminPermissions(
  user: Pick<SessionUser, "adminTier" | "adminPermissions">
): string {
  if (isSuperAdmin(user)) return "Full platform access";
  if (user.adminPermissions.length === 0) return "No extra permissions assigned";
  return user.adminPermissions
    .map((key) => ADMIN_PERMISSION_LABELS[key as AdminPermissionKey] ?? key)
    .join(" · ");
}

export function adminTierLabel(tier: AdminTier | null | undefined): string {
  if (tier === "super_admin") return "Super Admin";
  return "Administrator";
}

export function sanitizePermissionList(
  permissions: unknown
): AdminPermissionKey[] | null {
  if (!Array.isArray(permissions)) return null;
  const valid = permissions.filter((item): item is AdminPermissionKey =>
    ADMIN_PERMISSION_KEYS.includes(item as AdminPermissionKey)
  );
  return [...new Set(valid)];
}

export function getAdminAccessFlags(user: Pick<SessionUser, "adminTier" | "adminPermissions">) {
  const superAdmin = isSuperAdmin(user);
  return {
    isSuperAdmin: superAdmin,
    canManageUsers: hasAdminPermission(user, "manage_users"),
    canManageAdmins: hasAdminPermission(user, "manage_admins"),
    canViewAuditLog: hasAdminPermission(user, "view_audit_log"),
  };
}
