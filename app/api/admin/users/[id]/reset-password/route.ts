import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdminPermission } from "@/lib/auth/guards";
import { generateTempPassword, hashPassword } from "@/lib/auth/password";
import { getAuditRequestContext, recordAdminAuditLog, AuditLogWriteError } from "@/lib/audit/admin-audit";
import { AUDIT_ACTIONS } from "@/lib/audit/actions";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auditContext = getAuditRequestContext(req);

  try {
    const auth = await requireAdminPermission("manage_users");
    if (!auth.ok) return auth.response;

    const { id } = await params;
    const target = await db.user.findUnique({
      where: { id },
      select: { id: true, email: true, role: true },
    });

    if (!target) {
      return NextResponse.json({ error: "User not found." }, { status: 404 });
    }

    if (target.role !== "user") {
      return NextResponse.json({ error: "Only training user accounts can be reset here." }, { status: 403 });
    }

    const tempPassword = generateTempPassword();
    const passwordHash = await hashPassword(tempPassword);

    await db.$transaction(async (tx) => {
      await tx.user.update({
        where: { id },
        data: {
          passwordHash,
          mustChangePassword: true,
          passwordUpdatedAt: new Date(),
        },
      });

      await recordAdminAuditLog({
        actorUserId: auth.user.id,
        action: AUDIT_ACTIONS.USER_PASSWORD_RESET,
        targetType: "user",
        targetId: target.id,
        targetLabel: target.email,
        metadata: { temporaryPasswordIssued: true },
        context: auditContext,
        tx,
      });
    });

    return NextResponse.json({ ok: true, tempPassword });
  } catch (error) {
    if (error instanceof AuditLogWriteError) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    console.error("Reset password error", error);
    return NextResponse.json({ error: "Failed to reset password." }, { status: 500 });
  }
}
