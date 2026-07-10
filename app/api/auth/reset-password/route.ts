import { NextResponse } from "next/server";
import { hash } from "bcryptjs";
import { db } from "@/lib/db";
import { hashPasswordResetToken } from "@/lib/auth/password-reset";
import { revokeAllUserSessions } from "@/lib/auth/session";
import { getAuditRequestContext, recordAdminAuditLog } from "@/lib/audit/admin-audit";
import { AUDIT_ACTIONS } from "@/lib/audit/actions";

interface ResetPasswordBody {
  token?: string;
  newPassword?: string;
}

export async function POST(req: Request) {
  const auditContext = getAuditRequestContext(req);

  try {
    const body = (await req.json()) as ResetPasswordBody;
    const token = body.token ?? "";
    const newPassword = body.newPassword ?? "";

    if (!token || newPassword.length < 8) {
      return NextResponse.json(
        { error: "Reset token and a new 8+ character password are required." },
        { status: 400 }
      );
    }

    const tokenHash = hashPasswordResetToken(token);
    const resetToken = await db.passwordResetToken.findUnique({
      where: { tokenHash },
      select: { id: true, userId: true, expiresAt: true, usedAt: true },
    });

    if (!resetToken || resetToken.usedAt || resetToken.expiresAt.getTime() < Date.now()) {
      return NextResponse.json({ error: "Reset link is invalid or expired." }, { status: 400 });
    }

    const passwordHash = await hash(newPassword, 12);

    await db.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: resetToken.userId },
        data: {
          passwordHash,
          mustChangePassword: false,
          passwordUpdatedAt: new Date(),
        },
      });

      await tx.passwordResetToken.update({
        where: { id: resetToken.id },
        data: { usedAt: new Date() },
      });

      await tx.passwordResetToken.updateMany({
        where: {
          userId: resetToken.userId,
          usedAt: null,
          id: { not: resetToken.id },
        },
        data: { usedAt: new Date() },
      });

      await revokeAllUserSessions(resetToken.userId, tx);
    });

    const user = await db.user.findUnique({
      where: { id: resetToken.userId },
      select: { id: true, email: true },
    });

    if (user) {
      try {
        await recordAdminAuditLog({
          actorUserId: user.id,
          action: AUDIT_ACTIONS.PASSWORD_RESET_COMPLETED,
          targetType: "user",
          targetId: user.id,
          targetLabel: user.email,
          metadata: { channel: "self_service" },
          context: auditContext,
        });
      } catch (auditError) {
        console.error("Password reset completion audit log failed", auditError);
      }
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Reset password error", error);
    return NextResponse.json({ error: "Failed to reset password." }, { status: 500 });
  }
}
