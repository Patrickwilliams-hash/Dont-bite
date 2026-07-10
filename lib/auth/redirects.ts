import type { UserRole } from "@prisma/client";

const USER_DASHBOARD_PREFIX = "/dashboard";

function isSafeUserDashboardPath(path: string): boolean {
  return path === USER_DASHBOARD_PREFIX || path.startsWith(`${USER_DASHBOARD_PREFIX}/`);
}

export function resolvePostLoginPath(role: UserRole, next: string | null | undefined): string {
  if (role === "admin") return "/admin";
  if (next && isSafeUserDashboardPath(next)) return next;
  return "/dashboard";
}
