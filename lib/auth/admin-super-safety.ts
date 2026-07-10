import { db } from "@/lib/db";

export async function countSuperAdmins(excludeUserId?: string): Promise<number> {
  return db.user.count({
    where: {
      role: "admin",
      isActive: true,
      adminTier: "super_admin",
      ...(excludeUserId ? { id: { not: excludeUserId } } : {}),
    },
  });
}

export async function assertCanRemoveSuperAdminStatus(
  actorUserId: string,
  targetUserId: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (actorUserId === targetUserId) {
    return { ok: false, error: "You cannot change your own Super Admin status." };
  }

  const target = await db.user.findUnique({
    where: { id: targetUserId },
    select: { id: true, role: true, adminTier: true, isActive: true },
  });

  if (!target || target.role !== "admin") {
    return { ok: false, error: "Administrator account not found." };
  }

  if (target.adminTier === "super_admin" && target.isActive) {
    const remaining = await countSuperAdmins(targetUserId);
    if (remaining === 0) {
      return { ok: false, error: "Cannot remove the last active Super Admin." };
    }
  }

  return { ok: true };
}
