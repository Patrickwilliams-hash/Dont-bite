import { NextResponse } from "next/server";
import { clearSessionCookie, readSessionTokenFromCookie, revokeSession, validateSessionToken } from "@/lib/auth/session";
import { getAuditRequestContext, recordAdminAuditLog, AuditLogWriteError } from "@/lib/audit/admin-audit";
import { AUDIT_ACTIONS } from "@/lib/audit/actions";
import { db } from "@/lib/db";

export async function POST(req: Request) {
  const auditContext = getAuditRequestContext(req);

  try {
    const token = await readSessionTokenFromCookie();
    let adminActor: { id: string; email: string } | null = null;

    if (token) {
      const validated = await validateSessionToken(token);
      if (validated?.user.role === "admin") {
        adminActor = { id: validated.user.id, email: validated.user.email };
      }
      await revokeSession(token);
    }

    if (adminActor) {
      await db.$transaction(async (tx) => {
        await recordAdminAuditLog({
          actorUserId: adminActor.id,
          action: AUDIT_ACTIONS.ADMIN_LOGOUT,
          targetType: "admin_session",
          targetLabel: adminActor.email,
          context: auditContext,
          tx,
        });
      });
    }

    await clearSessionCookie();
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof AuditLogWriteError) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    console.error("Logout error", error);
    return NextResponse.json({ error: "Failed to log out." }, { status: 500 });
  }
}
