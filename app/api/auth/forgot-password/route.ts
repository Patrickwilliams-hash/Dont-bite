import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getEmailConfig } from "@/lib/email/config";
import { sendEmail, EmailSendError } from "@/lib/email/mailer";
import { buildPasswordResetEmail } from "@/lib/email/templates/password-reset-email";
import {
  PASSWORD_RESET_GENERIC_MESSAGE,
  buildPasswordResetUrl,
  createPasswordResetToken,
  invalidateUnusedPasswordResetTokens,
} from "@/lib/auth/password-reset";
import { getAuditRequestContext, recordAdminAuditLog } from "@/lib/audit/admin-audit";
import { AUDIT_ACTIONS } from "@/lib/audit/actions";

interface ForgotPasswordBody {
  email?: string;
}

export async function POST(req: Request) {
  const auditContext = getAuditRequestContext(req);

  try {
    const body = (await req.json()) as ForgotPasswordBody;
    const email = body.email?.trim().toLowerCase() ?? "";
    if (!email) {
      return NextResponse.json({ error: "Email is required." }, { status: 400 });
    }

    const user = await db.user.findUnique({
      where: { email },
      select: { id: true, email: true, isActive: true },
    });

    if (!user?.isActive) {
      return NextResponse.json({ ok: true, message: PASSWORD_RESET_GENERIC_MESSAGE });
    }

    let createdTokenId: string | null = null;

    try {
      const { appUrl } = getEmailConfig();
      const tokenResult = await db.$transaction(async (tx) => {
        await invalidateUnusedPasswordResetTokens(user.id, tx);
        return createPasswordResetToken(user.id, tx);
      });

      createdTokenId = tokenResult.id;
      const resetUrl = buildPasswordResetUrl(tokenResult.rawToken, appUrl);
      const emailContent = buildPasswordResetEmail(resetUrl);

      await sendEmail({
        to: user.email,
        subject: emailContent.subject,
        text: emailContent.text,
        html: emailContent.html,
      });

      try {
        await recordAdminAuditLog({
          actorUserId: user.id,
          action: AUDIT_ACTIONS.PASSWORD_RESET_EMAIL_SENT,
          targetType: "user",
          targetId: user.id,
          targetLabel: user.email,
          metadata: { channel: "self_service" },
          context: auditContext,
        });
      } catch (auditError) {
        console.error("Password reset email audit log failed", auditError);
      }
    } catch (error) {
      if (createdTokenId) {
        await db.passwordResetToken.delete({ where: { id: createdTokenId } }).catch(() => undefined);
      }

      console.error("Password reset email delivery failed", {
        userId: user.id,
        error: error instanceof Error ? error.name : "unknown",
        smtp: error instanceof EmailSendError,
      });
    }

    return NextResponse.json({ ok: true, message: PASSWORD_RESET_GENERIC_MESSAGE });
  } catch (error) {
    console.error("Forgot password error", error);
    return NextResponse.json(
      { error: "We couldn't process your request right now. Please try again later." },
      { status: 500 }
    );
  }
}
