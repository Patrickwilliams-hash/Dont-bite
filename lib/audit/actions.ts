export const AUDIT_ACTIONS = {
  ADMIN_LOGIN_SUCCESS: "ADMIN_LOGIN_SUCCESS",
  ADMIN_LOGIN_FAILED: "ADMIN_LOGIN_FAILED",
  ADMIN_LOGOUT: "ADMIN_LOGOUT",
  ADMIN_CREATED: "ADMIN_CREATED",
  USER_PROMOTED_TO_ADMIN: "USER_PROMOTED_TO_ADMIN",
  ADMIN_PERMISSIONS_CHANGED: "ADMIN_PERMISSIONS_CHANGED",
  ADMIN_PROMOTED_TO_SUPER_ADMIN: "ADMIN_PROMOTED_TO_SUPER_ADMIN",
  SUPER_ADMIN_STATUS_REMOVED: "SUPER_ADMIN_STATUS_REMOVED",
  ADMIN_DEMOTED: "ADMIN_DEMOTED",
  ADMIN_DISABLED: "ADMIN_DISABLED",
  ADMIN_REACTIVATED: "ADMIN_REACTIVATED",
  USER_PASSWORD_RESET: "USER_PASSWORD_RESET",
  USER_DISABLED: "USER_DISABLED",
  USER_REACTIVATED: "USER_REACTIVATED",
  USER_DELETED: "USER_DELETED",
  DRILL_CREATED: "DRILL_CREATED",
  DRILL_UPDATED: "DRILL_UPDATED",
  DRILL_SENT: "DRILL_SENT",
  CONTENT_CREATED: "CONTENT_CREATED",
  CONTENT_UPDATED: "CONTENT_UPDATED",
  CONTENT_DELETED: "CONTENT_DELETED",
  PLATFORM_SETTING_CHANGED: "PLATFORM_SETTING_CHANGED",
  EMAIL_TEST_SENT: "EMAIL_TEST_SENT",
  PASSWORD_RESET_EMAIL_SENT: "PASSWORD_RESET_EMAIL_SENT",
  PASSWORD_RESET_COMPLETED: "PASSWORD_RESET_COMPLETED",
} as const;

export type AuditAction = (typeof AUDIT_ACTIONS)[keyof typeof AUDIT_ACTIONS];

export const AUDIT_ACTION_LABELS: Record<AuditAction, string> = {
  ADMIN_LOGIN_SUCCESS: "Admin sign-in",
  ADMIN_LOGIN_FAILED: "Failed admin sign-in",
  ADMIN_LOGOUT: "Admin sign-out",
  ADMIN_CREATED: "Administrator created",
  USER_PROMOTED_TO_ADMIN: "User promoted to administrator",
  ADMIN_PERMISSIONS_CHANGED: "Administrator permissions changed",
  ADMIN_PROMOTED_TO_SUPER_ADMIN: "Promoted to Super Admin",
  SUPER_ADMIN_STATUS_REMOVED: "Super Admin status removed",
  ADMIN_DEMOTED: "Administrator demoted",
  ADMIN_DISABLED: "Administrator disabled",
  ADMIN_REACTIVATED: "Administrator reactivated",
  USER_PASSWORD_RESET: "User password reset",
  USER_DISABLED: "User disabled",
  USER_REACTIVATED: "User reactivated",
  USER_DELETED: "User deleted",
  DRILL_CREATED: "Drill created",
  DRILL_UPDATED: "Drill updated",
  DRILL_SENT: "Drill sent",
  CONTENT_CREATED: "Content created",
  CONTENT_UPDATED: "Content updated",
  CONTENT_DELETED: "Content deleted",
  PLATFORM_SETTING_CHANGED: "Platform setting changed",
  EMAIL_TEST_SENT: "Test email sent",
  PASSWORD_RESET_EMAIL_SENT: "Password reset email sent",
  PASSWORD_RESET_COMPLETED: "Password reset completed",
};

export const AUDIT_CATEGORIES = [
  { id: "authentication", label: "Authentication", actions: ["ADMIN_LOGIN_SUCCESS", "ADMIN_LOGIN_FAILED", "ADMIN_LOGOUT", "PASSWORD_RESET_EMAIL_SENT", "PASSWORD_RESET_COMPLETED"] },
  {
    id: "administrators",
    label: "Administrators",
    actions: [
      "ADMIN_CREATED",
      "USER_PROMOTED_TO_ADMIN",
      "ADMIN_PERMISSIONS_CHANGED",
      "ADMIN_PROMOTED_TO_SUPER_ADMIN",
      "SUPER_ADMIN_STATUS_REMOVED",
      "ADMIN_DEMOTED",
      "ADMIN_DISABLED",
      "ADMIN_REACTIVATED",
    ],
  },
  {
    id: "users",
    label: "Users",
    actions: ["USER_PASSWORD_RESET", "USER_DISABLED", "USER_REACTIVATED", "USER_DELETED"],
  },
  {
    id: "platform",
    label: "Platform",
    actions: ["DRILL_CREATED", "DRILL_UPDATED", "DRILL_SENT", "CONTENT_CREATED", "CONTENT_UPDATED", "CONTENT_DELETED", "PLATFORM_SETTING_CHANGED", "EMAIL_TEST_SENT"],
  },
] as const;

export function getAuditCategory(action: string): string {
  for (const category of AUDIT_CATEGORIES) {
    if ((category.actions as readonly string[]).includes(action)) {
      return category.id;
    }
  }
  return "other";
}
