import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdminPermission } from "@/lib/auth/guards";
import { AUDIT_ACTIONS } from "@/lib/audit/actions";
import { getAuditRequestContext, recordAdminAuditLog } from "@/lib/audit/admin-audit";
import { assertTemplateId, createDrillSend } from "@/lib/drills/service";

interface SendBody {
  userId?: string;
  templateId?: string;
  isTest?: boolean;
}

export async function POST(req: Request) {
  try {
    const auth = await requireAdminPermission("manage_drills");
    if (!auth.ok) return auth.response;

    const body = (await req.json()) as SendBody;
    const userId = body.userId?.trim();
    const templateId = body.templateId?.trim();
    const isTest = body.isTest !== false;

    if (!userId || !templateId) {
      return NextResponse.json(
        { error: "userId and templateId are required." },
        { status: 400 }
      );
    }

    let template;
    try {
      template = assertTemplateId(templateId);
    } catch {
      return NextResponse.json({ error: "Unknown drill template." }, { status: 400 });
    }

    const user = await db.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        trainingActive: true,
      },
    });

    if (!user || user.role !== "user") {
      return NextResponse.json({ error: "Training user not found." }, { status: 404 });
    }
    if (!user.isActive) {
      return NextResponse.json({ error: "That user account is disabled." }, { status: 400 });
    }

    const send = await createDrillSend({
      userId: user.id,
      template,
      isTest,
      sentByAdminId: auth.user.id,
    });

    await recordAdminAuditLog({
      actorUserId: auth.user.id,
      action: AUDIT_ACTIONS.DRILL_SENT,
      targetType: "user",
      targetId: user.id,
      targetLabel: user.email,
      metadata: {
        templateId: template.id,
        templateTitle: template.title,
        drillSendId: send.id,
        isTest,
      },
      context: getAuditRequestContext(req),
    });

    const trackPath = `/api/drills/track/${send.trackingToken}`;
    const lessonPath = `/caught/${template.id}?send=${send.id}`;

    return NextResponse.json({
      send: {
        id: send.id,
        templateId: send.templateId,
        title: send.title,
        status: send.status,
        isTest: send.isTest,
        sentAt: send.sentAt.toISOString(),
        expiresAt: send.expiresAt?.toISOString() ?? null,
        trackPath,
        lessonPath,
        preview: {
          subject: template.subject,
          senderName: template.senderName,
          senderEmail: template.senderEmail,
          previewText: template.previewText,
        },
      },
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        trainingActive: user.trainingActive,
      },
    });
  } catch (error) {
    console.error("Admin send drill error", error);
    return NextResponse.json({ error: "Failed to send drill." }, { status: 500 });
  }
}
