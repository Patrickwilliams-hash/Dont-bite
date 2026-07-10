import { NextResponse } from "next/server";
import { compare } from "bcryptjs";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth/guards";
import {
  EMAIL_CHANGE_EXPIRY_MS,
  EMAIL_CHANGE_RESEND_COOLDOWN_MS,
  createEmailChangeRequest,
  findActiveEmailChangeRequest,
  invalidatePendingEmailChangeRequests,
  isValidEmailAddress,
  normalizeEmail,
} from "@/lib/auth/email-change";
import { sendEmail } from "@/lib/email/mailer";
import { buildEmailChangeVerificationEmail } from "@/lib/email/templates/email-change-emails";
import { getAuditRequestContext, recordAdminAuditLog } from "@/lib/audit/admin-audit";
import { AUDIT_ACTIONS } from "@/lib/audit/actions";

interface StartEmailChangeBody {
  currentPassword?: string;
  newEmail?: string;
  confirmEmail?: string;
}

/** Returns the current pending email-change request, if any, so the UI can resume. */
export async function GET() {
  try {
    const auth = await requireUser();
    if (!auth.ok) return auth.response;

    const pending = await findActiveEmailChangeRequest(auth.user.id);
    if (!pending) {
      return NextResponse.json({ pending: null });
    }

    return NextResponse.json({
      pending: {
        newEmail: pending.newEmail,
        expiresAt: pending.expiresAt.toISOString(),
        resendAvailableAt: new Date(
          pending.createdAt.getTime() + EMAIL_CHANGE_RESEND_COOLDOWN_MS
        ).toISOString(),
      },
    });
  } catch (error) {
    console.error("Email change status error", error);
    return NextResponse.json({ error: "Failed to load email change status." }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const auditContext = getAuditRequestContext(req);

  try {
    const auth = await requireUser();
    if (!auth.ok) return auth.response;

    const body = (await req.json()) as StartEmailChangeBody;
    const currentPassword = body.currentPassword ?? "";
    const newEmail = normalizeEmail(body.newEmail ?? "");
    const confirmEmail = normalizeEmail(body.confirmEmail ?? "");

    if (!currentPassword || !newEmail || !confirmEmail) {
      return NextResponse.json(
        { error: "Current password and new email address are required." },
        { status: 400 }
      );
    }

    if (!isValidEmailAddress(newEmail)) {
      return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
    }

    if (newEmail !== confirmEmail) {
      return NextResponse.json({ error: "Email addresses do not match." }, { status: 400 });
    }

    const user = await db.user.findUnique({
      where: { id: auth.user.id },
      select: { id: true, email: true, passwordHash: true, isActive: true },
    });

    if (!user?.isActive) {
      return NextResponse.json({ error: "Account not found." }, { status: 404 });
    }

    const passwordOk = await compare(currentPassword, user.passwordHash);
    if (!passwordOk) {
      return NextResponse.json({ error: "Current password is incorrect." }, { status: 401 });
    }

    if (newEmail === user.email) {
      return NextResponse.json(
        { error: "That is already the email address on your account." },
        { status: 400 }
      );
    }

    const taken = await db.user.findUnique({ where: { email: newEmail }, select: { id: true } });
    if (taken) {
      return NextResponse.json(
        { error: "That email address can't be used for this account." },
        { status: 409 }
      );
    }

    const request = await db.$transaction(async (tx) => {
      await invalidatePendingEmailChangeRequests(user.id, tx);
      return createEmailChangeRequest(user.id, newEmail, tx);
    });

    try {
      const emailContent = buildEmailChangeVerificationEmail(request.code);
      await sendEmail({
        to: newEmail,
        subject: emailContent.subject,
        text: emailContent.text,
        html: emailContent.html,
      });
    } catch (error) {
      // No orphan OTP if the user never received it.
      await db.emailChangeRequest
        .delete({ where: { id: request.id } })
        .catch(() => undefined);
      console.error("Email change verification send failed", {
        userId: user.id,
        error: error instanceof Error ? error.name : "unknown",
      });
      return NextResponse.json(
        { error: "We couldn't send the verification code right now. Please try again shortly." },
        { status: 502 }
      );
    }

    try {
      await recordAdminAuditLog({
        actorUserId: user.id,
        action: AUDIT_ACTIONS.EMAIL_CHANGE_REQUESTED,
        targetType: "user",
        targetId: user.id,
        targetLabel: user.email,
        metadata: { channel: "self_service" },
        context: auditContext,
      });
    } catch (auditError) {
      console.error("Email change request audit log failed", auditError);
    }

    return NextResponse.json({
      ok: true,
      message: "We've sent a six-digit verification code to your new email address.",
      pending: {
        newEmail,
        expiresAt: new Date(Date.now() + EMAIL_CHANGE_EXPIRY_MS).toISOString(),
        resendAvailableAt: new Date(Date.now() + EMAIL_CHANGE_RESEND_COOLDOWN_MS).toISOString(),
      },
    });
  } catch (error) {
    console.error("Email change start error", error);
    return NextResponse.json(
      { error: "We couldn't process your request right now. Please try again later." },
      { status: 500 }
    );
  }
}
