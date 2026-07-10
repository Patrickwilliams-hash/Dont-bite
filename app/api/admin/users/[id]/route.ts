import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdminPermission } from "@/lib/auth/guards";
import { getAuditRequestContext, recordAdminAuditLog, AuditLogWriteError } from "@/lib/audit/admin-audit";
import { AUDIT_ACTIONS } from "@/lib/audit/actions";

export async function DELETE(
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
      select: { id: true, email: true, role: true },
    });

    if (!target) {
      return NextResponse.json({ error: "User not found." }, { status: 404 });
    }

    if (target.role !== "user") {
      return NextResponse.json({ error: "Only training user accounts can be deleted here." }, { status: 403 });
    }

    await db.$transaction(async (tx) => {
      await recordAdminAuditLog({
        actorUserId: auth.user.id,
        action: AUDIT_ACTIONS.USER_DELETED,
        targetType: target.role === "admin" ? "administrator" : "user",
        targetId: target.id,
        targetLabel: target.email,
        context: auditContext,
        tx,
      });
      await tx.user.delete({ where: { id } });
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof AuditLogWriteError) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    console.error("Delete user error", error);
    return NextResponse.json({ error: "Failed to delete user." }, { status: 500 });
  }
}
