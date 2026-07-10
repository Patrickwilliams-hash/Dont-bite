import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth/guards";
import {
  EMAIL_CHANGE_EXPIRY_MS,
  EMAIL_CHANGE_RESEND_COOLDOWN_MS,
  createEmailChangeRequest,
  findActiveEmailChangeRequest,
  invalidatePendingEmailChangeRequests,
} from "@/lib/auth/email-change";
import { sendEmail } from "@/lib/email/mailer";
import { buildEmailChangeVerificationEmail } from "@/lib/email/templates/email-change-emails";

export async function POST() {
  try {
    const auth = await requireUser();
    if (!auth.ok) return auth.response;

    const pending = await findActiveEmailChangeRequest(auth.user.id);
    if (!pending) {
      return NextResponse.json(
        { error: "There is no pending email change to resend. Start a new email change." },
        { status: 400 }
      );
    }

    const cooldownEndsAt = pending.createdAt.getTime() + EMAIL_CHANGE_RESEND_COOLDOWN_MS;
    if (Date.now() < cooldownEndsAt) {
      const waitSeconds = Math.ceil((cooldownEndsAt - Date.now()) / 1000);
      return NextResponse.json(
        { error: `Please wait ${waitSeconds}s before requesting another code.` },
        { status: 429 }
      );
    }

    // A resend issues a fresh code and invalidates the previous one.
    const request = await db.$transaction(async (tx) => {
      await invalidatePendingEmailChangeRequests(auth.user.id, tx);
      return createEmailChangeRequest(auth.user.id, pending.newEmail, tx);
    });

    try {
      const emailContent = buildEmailChangeVerificationEmail(request.code);
      await sendEmail({
        to: pending.newEmail,
        subject: emailContent.subject,
        text: emailContent.text,
        html: emailContent.html,
      });
    } catch (error) {
      await db.emailChangeRequest
        .delete({ where: { id: request.id } })
        .catch(() => undefined);
      console.error("Email change resend failed", {
        userId: auth.user.id,
        error: error instanceof Error ? error.name : "unknown",
      });
      return NextResponse.json(
        { error: "We couldn't send a new code right now. Please try again shortly." },
        { status: 502 }
      );
    }

    return NextResponse.json({
      ok: true,
      message: "We've sent a new verification code to your new email address.",
      pending: {
        newEmail: pending.newEmail,
        expiresAt: new Date(Date.now() + EMAIL_CHANGE_EXPIRY_MS).toISOString(),
        resendAvailableAt: new Date(Date.now() + EMAIL_CHANGE_RESEND_COOLDOWN_MS).toISOString(),
      },
    });
  } catch (error) {
    console.error("Email change resend error", error);
    return NextResponse.json(
      { error: "We couldn't process your request right now. Please try again later." },
      { status: 500 }
    );
  }
}
