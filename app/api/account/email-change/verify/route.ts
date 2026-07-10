import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth/guards";
import { clearSessionCookie, revokeAllUserSessions } from "@/lib/auth/session";
import {
  EMAIL_CHANGE_INVALID_CODE_MESSAGE,
  EMAIL_CHANGE_MAX_ATTEMPTS,
  emailChangeCodeMatches,
  findActiveEmailChangeRequest,
  invalidatePendingEmailChangeRequests,
} from "@/lib/auth/email-change";
import { getEmailConfig } from "@/lib/email/config";
import { sendEmail } from "@/lib/email/mailer";
import {
  buildEmailChangeConfirmedEmail,
  buildEmailChangedNoticeEmail,
} from "@/lib/email/templates/email-change-emails";
import { getAuditRequestContext, recordAdminAuditLog } from "@/lib/audit/admin-audit";
import { AUDIT_ACTIONS } from "@/lib/audit/actions";

interface VerifyEmailChangeBody {
  code?: string;
}

export async function POST(req: Request) {
  const auditContext = getAuditRequestContext(req);

  try {
    const auth = await requireUser();
    if (!auth.ok) return auth.response;

    const body = (await req.json()) as VerifyEmailChangeBody;
    const code = (body.code ?? "").trim();

    if (!/^\d{6}$/.test(code)) {
      return NextResponse.json(
        { error: "Enter the six-digit verification code." },
        { status: 400 }
      );
    }

    const request = await findActiveEmailChangeRequest(auth.user.id);
    if (!request) {
      return NextResponse.json({ error: EMAIL_CHANGE_INVALID_CODE_MESSAGE }, { status: 400 });
    }

    if (!emailChangeCodeMatches(code, request.codeHash)) {
      const failedAttempts = request.failedAttempts + 1;
      const exhausted = failedAttempts >= EMAIL_CHANGE_MAX_ATTEMPTS;
      await db.emailChangeRequest.update({
        where: { id: request.id },
        data: {
          failedAttempts,
          ...(exhausted ? { invalidatedAt: new Date() } : {}),
        },
      });

      return NextResponse.json(
        {
          error: exhausted
            ? "Too many incorrect attempts. This request has been cancelled — start a new email change to try again."
            : EMAIL_CHANGE_INVALID_CODE_MESSAGE,
        },
        { status: 400 }
      );
    }

    // Re-check the address wasn't claimed while the request was pending.
    const taken = await db.user.findUnique({
      where: { email: request.newEmail },
      select: { id: true },
    });
    if (taken) {
      await db.emailChangeRequest.update({
        where: { id: request.id },
        data: { invalidatedAt: new Date() },
      });
      return NextResponse.json(
        { error: "That email address can't be used for this account." },
        { status: 409 }
      );
    }

    const oldEmail = auth.user.email;

    await db.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: auth.user.id },
        data: { email: request.newEmail },
      });

      await tx.emailChangeRequest.update({
        where: { id: request.id },
        data: { usedAt: new Date() },
      });

      await invalidatePendingEmailChangeRequests(auth.user.id, tx);

      await revokeAllUserSessions(auth.user.id, tx);
    });

    await clearSessionCookie();

    // Confirmation notices are best-effort: the change has already completed.
    try {
      const notice = buildEmailChangedNoticeEmail();
      await sendEmail({
        to: oldEmail,
        subject: notice.subject,
        text: notice.text,
        html: notice.html,
      });
    } catch (error) {
      console.error("Email change old-address notice failed", {
        userId: auth.user.id,
        error: error instanceof Error ? error.name : "unknown",
      });
    }

    try {
      const { appUrl } = getEmailConfig();
      const confirmation = buildEmailChangeConfirmedEmail(`${appUrl}/login`);
      await sendEmail({
        to: request.newEmail,
        subject: confirmation.subject,
        text: confirmation.text,
        html: confirmation.html,
      });
    } catch (error) {
      console.error("Email change new-address confirmation failed", {
        userId: auth.user.id,
        error: error instanceof Error ? error.name : "unknown",
      });
    }

    try {
      await recordAdminAuditLog({
        actorUserId: auth.user.id,
        action: AUDIT_ACTIONS.EMAIL_CHANGE_COMPLETED,
        targetType: "user",
        targetId: auth.user.id,
        targetLabel: request.newEmail,
        metadata: { channel: "self_service" },
        context: auditContext,
      });
    } catch (auditError) {
      console.error("Email change completion audit log failed", auditError);
    }

    return NextResponse.json({
      ok: true,
      message:
        "Your email address has been changed. For your security you've been signed out everywhere — log in again with your new email address.",
    });
  } catch (error) {
    console.error("Email change verify error", error);
    return NextResponse.json(
      { error: "We couldn't verify the code right now. Please try again later." },
      { status: 500 }
    );
  }
}
