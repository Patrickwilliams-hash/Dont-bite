import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/guards";
import { listDrillTemplates } from "@/lib/drills/catalog";
import { createDrillSend, serializeDrillHistoryItem } from "@/lib/drills/service";

interface TestBody {
  templateId?: string;
}

export async function POST(req: Request) {
  try {
    const auth = await requireUser();
    if (!auth.ok) return auth.response;

    if (auth.user.role !== "user") {
      return NextResponse.json(
        { error: "Test drills are for training accounts." },
        { status: 403 }
      );
    }

    let body: TestBody = {};
    try {
      body = (await req.json()) as TestBody;
    } catch {
      body = {};
    }

    const templates = listDrillTemplates();
    const requested = body.templateId?.trim();
    const template =
      (requested ? templates.find((item) => item.id === requested) : null) ??
      templates[Math.floor(Math.random() * templates.length)];

    if (!template) {
      return NextResponse.json({ error: "No drill templates available." }, { status: 500 });
    }

    const send = await createDrillSend({
      userId: auth.user.id,
      template,
      isTest: true,
    });

    return NextResponse.json({
      drill: serializeDrillHistoryItem(send),
      trackPath: `/api/drills/track/${send.trackingToken}`,
      lessonPath: `/caught/${template.id}?send=${send.id}`,
      preview: {
        subject: template.subject,
        senderName: template.senderName,
        senderEmail: template.senderEmail,
        previewText: template.previewText,
      },
    });
  } catch (error) {
    console.error("User test drill error", error);
    return NextResponse.json({ error: "Failed to create a test drill." }, { status: 500 });
  }
}
