import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdminPermission } from "@/lib/auth/guards";
import {
  invalidatePendingEmailChangeRequests,
  isValidEmailAddress,
  normalizeEmail,
} from "@/lib/auth/email-change";
import { revokeAllUserSessions } from "@/lib/auth/session";
import { getEmailConfig } from "@/lib/email/config";
import { sendEmail } from "@/lib/email/mailer";
import {
  buildAdminEmailChangeConfirmedEmail,
  buildAdminEmailChangedNoticeEmail,
} from "@/lib/email/templates/email-change-emails";
import { getAuditRequestContext, recordAdminAuditLog } from "@/lib/audit/admin-audit";
import { AUDIT_ACTIONS } from "@/lib/audit/actions";

interface AdminChangeEmailBody {
  newEmail?: string;
  confirmEmail?: string;
  reason?: string;
}

const MIN_REASON_LENGTH = 10;

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auditContext = getAuditRequestContext(req);

  try {
    const auth = await requireAdminPermission("manage_users");
    if (!auth.ok) return auth.response;

    const { id } = await params;
    const body = (await req.json()) as AdminChangeEmailBody;
    const newEmail = normalizeEmail(body.newEmail ?? "");
    const confirmEmail = normalizeEmail(body.confirmEmail ?? "");
    const reason = body.reason?.trim() ?? "";

    if (!newEmail || !confirmEmail) {
      return NextResponse.json(
        { error: "New email address and confirmation are required." },
        { status: 400 }
      );
    }

    if (!isValidEmailAddress(newEmail)) {
      return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
    }

    if (newEmail !== confirmEmail) {
      return NextResponse.json({ error: "Email addresses do not match." }, { status: 400 });
    }

    if (reason.length < MIN_REASON_LENGTH) {
      return NextResponse.json(
        { error: "A meaningful reason for this change is required." },
        { status: 400 }
      );
    }

    const target = await db.user.findUnique({
      where: { id },
      select: { id: true, email: true, role: true, isActive: true },
    });

    if (!target) {
      return NextResponse.json({ error: "User not found." }, { status: 404 });
    }

    if (target.role !== "user") {
      return NextResponse.json(
        { error: "Only training user accounts can be changed here." },
        { status: 403 }
      );
    }

    if (newEmail === target.email) {
      return NextResponse.json(
        { error: "That is already the email address on this account." },
        { status: 400 }
      );
    }

    const taken = await db.user.findUnique({
      where: { email: newEmail },
      select: { id: true },
    });
    if (taken) {
      return NextResponse.json(
        { error: "That email address is already in use by another account." },
        { status: 409 }
      );
    }

    const oldEmail = target.email;

    await db.$transaction(async (tx) => {
      const raceTaken = await tx.user.findUnique({
        where: { email: newEmail },
        select: { id: true },
      });
      if (raceTaken) {
        throw new Error("EMAIL_TAKEN");
      }

      await invalidatePendingEmailChangeRequests(target.id, tx);

      await tx.user.update({
        where: { id: target.id },
        data: { email: newEmail },
      });

      await revokeAllUserSessions(target.id, tx);
    });

    try {
      await recordAdminAuditLog({
        actorUserId: auth.user.id,
        action: AUDIT_ACTIONS.ADMIN_USER_EMAIL_CHANGED,
        targetType: "user",
        targetId: target.id,
        targetLabel: newEmail,
        metadata: {
          channel: "admin_recovery",
          reason,
          previousEmail: oldEmail,
          newEmail,
        },
        context: auditContext,
      });
    } catch (auditError) {
      console.error("Admin user email change audit log failed", auditError);
    }

    const notificationFailures: string[] = [];

    try {
      const oldNotice = buildAdminEmailChangedNoticeEmail();
      await sendEmail({
        to: oldEmail,
        subject: oldNotice.subject,
        text: oldNotice.text,
        html: oldNotice.html,
      });
    } catch (error) {
      notificationFailures.push("old");
      console.error("Admin email change old-address notice failed", {
        targetUserId: target.id,
        error: error instanceof Error ? error.name : "unknown",
      });
    }

    try {
      const { appUrl } = getEmailConfig();
      const newNotice = buildAdminEmailChangeConfirmedEmail(
        `${appUrl}/login`,
        `${appUrl}/forgot-password`
      );
      await sendEmail({
        to: newEmail,
        subject: newNotice.subject,
        text: newNotice.text,
        html: newNotice.html,
      });
    } catch (error) {
      notificationFailures.push("new");
      console.error("Admin email change new-address notice failed", {
        targetUserId: target.id,
        error: error instanceof Error ? error.name : "unknown",
      });
    }

    if (notificationFailures.length === 2) {
      return NextResponse.json({
        ok: true,
        emailChanged: true,
        notificationsSent: false,
        message:
          "The account email was changed and all sessions were ended, but notification emails could not be delivered to either address. Please inform the user directly.",
      });
    }

    if (notificationFailures.length === 1) {
      const which =
        notificationFailures[0] === "old"
          ? "the previous email address"
          : "the new email address";
      return NextResponse.json({
        ok: true,
        emailChanged: true,
        notificationsSent: false,
        message: `The account email was changed and all sessions were ended, but the notification email to ${which} could not be delivered. Please inform the user directly.`,
      });
    }

    return NextResponse.json({
      ok: true,
      emailChanged: true,
      notificationsSent: true,
      message:
        "The account email was changed, all sessions were ended, and notification emails were sent to both addresses.",
    });
  } catch (error) {
    if (error instanceof Error && error.message === "EMAIL_TAKEN") {
      return NextResponse.json(
        { error: "That email address is already in use by another account." },
        { status: 409 }
      );
    }

    console.error("Admin change user email error", error);
    return NextResponse.json(
      { error: "Failed to change the account email address." },
      { status: 500 }
    );
  }
}
