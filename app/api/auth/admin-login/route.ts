import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { authenticateWithPassword } from "@/lib/auth/login";
import { createSession, setSessionCookie } from "@/lib/auth/session";
import { getAuditRequestContext, recordAdminAuditLog, AuditLogWriteError } from "@/lib/audit/admin-audit";
import { AUDIT_ACTIONS } from "@/lib/audit/actions";
import {
  adminTierLabel,
  summarizeAdminPermissions,
} from "@/lib/auth/admin-permissions";

interface AdminLoginBody {
  email?: string;
  password?: string;
}

export async function POST(req: Request) {
  const auditContext = getAuditRequestContext(req);

  try {
    const body = (await req.json()) as AdminLoginBody;
    const email = body.email?.trim().toLowerCase() ?? "";
    const password = body.password ?? "";

    if (!email || !password) {
      return NextResponse.json({ error: "Email and password are required." }, { status: 400 });
    }

    const auth = await authenticateWithPassword(email, password);
    if (!auth.ok) {
      try {
        await recordAdminAuditLog({
          action: AUDIT_ACTIONS.ADMIN_LOGIN_FAILED,
          targetType: "admin_session",
          targetLabel: email,
          metadata: { reason: "invalid_credentials" },
          context: auditContext,
        });
      } catch {
        // Best-effort only for failed sign-in attempts.
      }
      return NextResponse.json({ error: "Invalid email or password." }, { status: 401 });
    }

    if (auth.user.role !== "admin") {
      try {
        await recordAdminAuditLog({
          action: AUDIT_ACTIONS.ADMIN_LOGIN_FAILED,
          targetType: "admin_session",
          targetLabel: email,
          metadata: { reason: "not_admin" },
          context: auditContext,
        });
      } catch {
        // Best-effort only for failed sign-in attempts.
      }
      return NextResponse.json(
        { error: "This account does not have admin access." },
        { status: 403 }
      );
    }

    const adminProfile = await db.user.findUnique({
      where: { id: auth.user.id },
      select: { adminTier: true, adminPermissions: true },
    });

    await db.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: auth.user.id },
        data: { lastLoginAt: new Date() },
      });
      await recordAdminAuditLog({
        actorUserId: auth.user.id,
        action: AUDIT_ACTIONS.ADMIN_LOGIN_SUCCESS,
        targetType: "admin_session",
        targetLabel: auth.user.email,
        metadata: { adminTier: adminProfile?.adminTier ?? null },
        context: auditContext,
        tx,
      });
    });

    const { token, session } = await createSession(auth.user.id);
    await setSessionCookie(token, session.expiresAt);

    const tier = adminProfile?.adminTier ?? null;

    return NextResponse.json({
      user: {
        name: auth.user.name,
        email: auth.user.email,
        frequency: auth.user.frequency,
        joinedAt: auth.user.joinedAt,
        trainingActive: auth.user.trainingActive,
        role: auth.user.role,
        adminTier: tier,
        adminTierLabel: adminTierLabel(tier),
        permissionsSummary: summarizeAdminPermissions({
          adminTier: tier,
          adminPermissions: adminProfile?.adminPermissions ?? [],
        }),
      },
      mustChangePassword: auth.user.mustChangePassword,
    });
  } catch (error) {
    if (error instanceof AuditLogWriteError) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    console.error("Admin login error", error);
    return NextResponse.json({ error: "Failed to log in." }, { status: 500 });
  }
}
