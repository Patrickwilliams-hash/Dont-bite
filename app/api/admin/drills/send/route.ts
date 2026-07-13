import { NextResponse } from "next/server";
import { AUDIT_ACTIONS } from "@/lib/audit/actions";
import { getAuditRequestContext, recordAdminAuditLog } from "@/lib/audit/admin-audit";
import { requireAdminPermission } from "@/lib/auth/guards";
import { db } from "@/lib/db";
import {
  DrillSendDeliveryError,
  DrillSendValidationError,
  sendDrillManually,
} from "@/lib/drill/send-drill";

export async function POST(req: Request) {
  try {
    const auth = await requireAdminPermission("manage_drills");
    if (!auth.ok) return auth.response;

    const body = (await req.json()) as {
      templateId?: unknown;
      userId?: unknown;
    };

    const templateId = typeof body.templateId === "string" ? body.templateId.trim() : "";
    const userId = typeof body.userId === "string" ? body.userId.trim() : "";

    if (!templateId || !userId) {
      return NextResponse.json({ error: "A template and recipient are required." }, { status: 400 });
    }

    const auditContext = getAuditRequestContext(req);

    try {
      const result = await sendDrillManually({
        templateId,
        userId,
        triggeredByUserId: auth.user.id,
      });

      const [template, recipient] = await Promise.all([
        db.drillTemplate.findUnique({
          where: { id: templateId },
          select: { title: true },
        }),
        db.user.findUnique({
          where: { id: userId },
          select: { name: true, email: true },
        }),
      ]);

      await recordAdminAuditLog({
        actorUserId: auth.user.id,
        action: AUDIT_ACTIONS.DRILL_SENT,
        targetType: "drill_template",
        targetId: templateId,
        targetLabel: template?.title ?? "Drill template",
        metadata: {
          deliveryId: result.deliveryId,
          recipientUserId: userId,
          recipientLabel: recipient?.name ?? "Training user",
          channel: "manual_send",
          result: "sent",
        },
        context: auditContext,
      });

      return NextResponse.json({
        ok: true,
        deliveryId: result.deliveryId,
        status: result.status,
      });
    } catch (error) {
      if (error instanceof DrillSendValidationError) {
        return NextResponse.json({ error: error.message }, { status: 400 });
      }

      if (error instanceof DrillSendDeliveryError) {
        const [template, recipient] = await Promise.all([
          db.drillTemplate.findUnique({
            where: { id: templateId },
            select: { title: true },
          }),
          db.user.findUnique({
            where: { id: userId },
            select: { name: true },
          }),
        ]);

        await recordAdminAuditLog({
          actorUserId: auth.user.id,
          action: AUDIT_ACTIONS.DRILL_SEND_FAILED,
          targetType: "drill_template",
          targetId: templateId,
          targetLabel: template?.title ?? "Drill template",
          metadata: {
            deliveryId: error.deliveryId,
            recipientUserId: userId,
            recipientLabel: recipient?.name ?? "Training user",
            channel: "manual_send",
            result: "failed",
            sendErrorCode: error.sendErrorCode,
          },
          context: auditContext,
        });

        return NextResponse.json({ error: error.message }, { status: 502 });
      }

      throw error;
    }
  } catch (error) {
    console.error("Admin drill send error", error);
    return NextResponse.json({ error: "Failed to send drill." }, { status: 500 });
  }
}
