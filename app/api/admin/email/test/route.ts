import { NextResponse } from "next/server";
import { requireSuperAdmin } from "@/lib/auth/guards";
import { buildTestEmailContent, EmailSendError, sendEmail } from "@/lib/email/mailer";
import { EmailConfigError } from "@/lib/email/config";
import { getAuditRequestContext, recordAdminAuditLog, AuditLogWriteError } from "@/lib/audit/admin-audit";
import { AUDIT_ACTIONS } from "@/lib/audit/actions";

interface TestEmailBody {
  to?: string;
}

export async function POST(req: Request) {
  const auditContext = getAuditRequestContext(req);

  try {
    const auth = await requireSuperAdmin();
    if (!auth.ok) return auth.response;

    const body = (await req.json()) as TestEmailBody;
    const to = body.to?.trim() ?? "";

    if (!to) {
      return NextResponse.json({ error: "Recipient email address is required." }, { status: 400 });
    }

    const { subject, text, html } = buildTestEmailContent();

    await sendEmail({ to, subject, text, html });

    await recordAdminAuditLog({
      actorUserId: auth.user.id,
      action: AUDIT_ACTIONS.EMAIL_TEST_SENT,
      targetType: "email",
      targetLabel: to,
      metadata: { purpose: "smtp_test" },
      context: auditContext,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof AuditLogWriteError) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    if (error instanceof EmailConfigError || error instanceof EmailSendError) {
      return NextResponse.json({ error: error.message }, { status: 503 });
    }
    console.error("Admin test email error", error);
    return NextResponse.json({ error: "Failed to send test email." }, { status: 500 });
  }
}
