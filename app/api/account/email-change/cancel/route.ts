import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/guards";
import { invalidatePendingEmailChangeRequests } from "@/lib/auth/email-change";
import { getAuditRequestContext, recordAdminAuditLog } from "@/lib/audit/admin-audit";
import { AUDIT_ACTIONS } from "@/lib/audit/actions";

export async function POST(req: Request) {
  const auditContext = getAuditRequestContext(req);

  try {
    const auth = await requireUser();
    if (!auth.ok) return auth.response;

    const cancelled = await invalidatePendingEmailChangeRequests(auth.user.id);

    if (cancelled > 0) {
      try {
        await recordAdminAuditLog({
          actorUserId: auth.user.id,
          action: AUDIT_ACTIONS.EMAIL_CHANGE_CANCELLED,
          targetType: "user",
          targetId: auth.user.id,
          targetLabel: auth.user.email,
          metadata: { channel: "self_service" },
          context: auditContext,
        });
      } catch (auditError) {
        console.error("Email change cancel audit log failed", auditError);
      }
    }

    return NextResponse.json({ ok: true, message: "Email change cancelled." });
  } catch (error) {
    console.error("Email change cancel error", error);
    return NextResponse.json(
      { error: "We couldn't process your request right now. Please try again later." },
      { status: 500 }
    );
  }
}
