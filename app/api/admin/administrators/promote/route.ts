import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdminPermission } from "@/lib/auth/guards";
import { getAuditRequestContext, recordAdminAuditLog, AuditLogWriteError } from "@/lib/audit/admin-audit";
import { AUDIT_ACTIONS } from "@/lib/audit/actions";

interface PromoteBody {
  userId?: string;
}

export async function POST(req: Request) {
  const auditContext = getAuditRequestContext(req);

  try {
    const auth = await requireAdminPermission("manage_admins");
    if (!auth.ok) return auth.response;

    const body = (await req.json()) as PromoteBody;
    const userId = body.userId?.trim() ?? "";

    if (!userId) {
      return NextResponse.json({ error: "User ID is required." }, { status: 400 });
    }

    const user = await db.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, email: true, role: true, isActive: true },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found." }, { status: 404 });
    }

    if (user.role === "admin") {
      return NextResponse.json({ error: "This account is already an administrator." }, { status: 409 });
    }

    const administrator = await db.$transaction(async (tx) => {
      const updated = await tx.user.update({
        where: { id: userId },
        data: {
          role: "admin",
          adminTier: "administrator",
          adminPermissions: [],
          trainingActive: false,
        },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          adminTier: true,
          adminPermissions: true,
          isActive: true,
          joinedAt: true,
          createdAt: true,
          lastLoginAt: true,
        },
      });

      await recordAdminAuditLog({
        actorUserId: auth.user.id,
        action: AUDIT_ACTIONS.USER_PROMOTED_TO_ADMIN,
        targetType: "administrator",
        targetId: updated.id,
        targetLabel: updated.email,
        context: auditContext,
        tx,
      });

      return updated;
    });

    return NextResponse.json({ administrator });
  } catch (error) {
    if (error instanceof AuditLogWriteError) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    console.error("Promote admin error", error);
    return NextResponse.json({ error: "Failed to promote user." }, { status: 500 });
  }
}
