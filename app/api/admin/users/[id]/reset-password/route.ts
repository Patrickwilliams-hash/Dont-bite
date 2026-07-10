import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdminPermission } from "@/lib/auth/guards";
import { getEmailConfig } from "@/lib/email/config";
import { sendEmail, EmailSendError } from "@/lib/email/mailer";
import { buildPasswordResetEmail } from "@/lib/email/templates/password-reset-email";
import {
  buildPasswordResetUrl,
  createPasswordResetToken,
  invalidateUnusedPasswordResetTokens,
} from "@/lib/auth/password-reset";
import { getAuditRequestContext, recordAdminAuditLog } from "@/lib/audit/admin-audit";
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
      select: { id: true, email: true, role: true, isActive: true },
    });

    if (!target) {
      return NextResponse.json({ error: "User not found." }, { status: 404 });
    }

    if (target.role !== "user") {
      return NextResponse.json(
        { error: "Password reset emails can only be sent for training user accounts." },
        { status: 403 }
      );
    }

    let createdTokenId: string | null = null;

    try {
      const { appUrl } = getEmailConfig();
      const tokenResult = await db.$transaction(async (tx) => {
        await invalidateUnusedPasswordResetTokens(target.id, tx);
        return createPasswordResetToken(target.id, tx);
      });

      createdTokenId = tokenResult.id;
      const resetUrl = buildPasswordResetUrl(tokenResult.rawToken, appUrl);
      const emailContent = buildPasswordResetEmail(resetUrl);

      await sendEmail({
        to: target.email,
        subject: emailContent.subject,
        text: emailContent.text,
        html: emailContent.html,
      });

      try {
        await recordAdminAuditLog({
          actorUserId: auth.user.id,
          action: AUDIT_ACTIONS.ADMIN_PASSWORD_RESET_EMAIL_SENT,
          targetType: "user",
          targetId: target.id,
          targetLabel: target.email,
          metadata: { channel: "admin_initiated" },
          context: auditContext,
        });
      } catch (auditError) {
        console.error("Admin password reset email audit log failed", auditError);
      }
    } catch (error) {
      if (createdTokenId) {
        await db.passwordResetToken
          .delete({ where: { id: createdTokenId } })
          .catch(() => undefined);
      }

      console.error("Admin password reset email delivery failed", {
        targetUserId: target.id,
        error: error instanceof Error ? error.name : "unknown",
        smtp: error instanceof EmailSendError,
      });

      return NextResponse.json(
        {
          error:
            "We couldn't send the password reset email right now. Please try again shortly.",
        },
        { status: 502 }
      );
    }

    return NextResponse.json({
      ok: true,
      message: "Password reset instructions have been sent to the user.",
    });
  } catch (error) {
    console.error("Admin send password reset email error", error);
    return NextResponse.json(
      { error: "Failed to send password reset email." },
      { status: 500 }
    );
  }
}
