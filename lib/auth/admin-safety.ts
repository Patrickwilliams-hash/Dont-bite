import { db } from "@/lib/db";

export async function countActiveAdmins(excludeUserId?: string): Promise<number> {
  return db.user.count({
    where: {
      role: "admin",
      isActive: true,
      ...(excludeUserId ? { id: { not: excludeUserId } } : {}),
    },
  });
}

export async function assertCanDemoteOrDisableAdmin(
  actorUserId: string,
  targetUserId: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (actorUserId === targetUserId) {
    return { ok: false, error: "You cannot change your own administrator access." };
  }

  const target = await db.user.findUnique({
    where: { id: targetUserId },
    select: { id: true, role: true, isActive: true },
  });

  if (!target || target.role !== "admin") {
    return { ok: false, error: "Administrator account not found." };
  }

  if (target.isActive) {
    const remaining = await countActiveAdmins(targetUserId);
    if (remaining === 0) {
      return { ok: false, error: "Cannot remove or disable the last active administrator." };
    }
  }

  return { ok: true };
}
