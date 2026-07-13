import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdminPermission } from "@/lib/auth/guards";
import { getAuditRequestContext, recordAdminAuditLog, AuditLogWriteError } from "@/lib/audit/admin-audit";
import { AUDIT_ACTIONS } from "@/lib/audit/actions";

interface TrainingBody {
  trainingActive?: boolean;
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auditContext = getAuditRequestContext(req);

  try {
    const auth = await requireAdminPermission("manage_users");
    if (!auth.ok) return auth.response;

    const body = (await req.json().catch(() => null)) as TrainingBody | null;
    if (!body || typeof body.trainingActive !== "boolean") {
      return NextResponse.json({ error: "A boolean trainingActive value is required." }, { status: 400 });
    }
    const nextTrainingActive = body.trainingActive;

    const { id } = await params;
    const target = await db.user.findUnique({
      where: { id },
      select: { id: true, email: true, role: true, trainingActive: true },
    });

    if (!target) {
      return NextResponse.json({ error: "User not found." }, { status: 404 });
    }

    if (target.role !== "user") {
      return NextResponse.json(
        { error: "Only training user accounts can have their training status changed." },
        { status: 403 }
      );
    }

    // No-op change: return current state without writing or auditing.
    if (target.trainingActive === nextTrainingActive) {
      return NextResponse.json({ ok: true, user: { id: target.id, trainingActive: target.trainingActive } });
    }

    const action = nextTrainingActive
      ? AUDIT_ACTIONS.USER_TRAINING_REACTIVATED
      : AUDIT_ACTIONS.USER_TRAINING_PAUSED;

    const updated = await db.$transaction(async (tx) => {
      const user = await tx.user.update({
        where: { id: target.id },
        data: { trainingActive: nextTrainingActive },
        select: { id: true, trainingActive: true },
      });

      await recordAdminAuditLog({
        actorUserId: auth.user.id,
        action,
        targetType: "user",
        targetId: target.id,
        targetLabel: target.email,
        metadata: { trainingActive: nextTrainingActive },
        context: auditContext,
        tx,
      });

      return user;
    });

    return NextResponse.json({ ok: true, user: { id: updated.id, trainingActive: updated.trainingActive } });
  } catch (error) {
    if (error instanceof AuditLogWriteError) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    console.error("Update training status error", error);
    return NextResponse.json({ error: "Failed to update training status." }, { status: 500 });
  }
}
