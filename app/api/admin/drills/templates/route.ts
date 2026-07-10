import { NextResponse } from "next/server";
import { requireAdminPermission } from "@/lib/auth/guards";
import { listDrillTemplates } from "@/lib/drills/catalog";

export async function GET() {
  try {
    const auth = await requireAdminPermission("manage_drills");
    if (!auth.ok) return auth.response;

    const templates = listDrillTemplates().map((template) => ({
      id: template.id,
      title: template.title,
      scamType: template.scamType,
      subject: template.subject,
      previewText: template.previewText,
      senderName: template.senderName,
      senderEmail: template.senderEmail,
      brandName: template.brandName,
      fakeDomain: template.fakeDomain,
      learnSlug: template.learnSlug,
    }));

    return NextResponse.json({ templates });
  } catch (error) {
    console.error("Admin drill templates error", error);
    return NextResponse.json({ error: "Failed to load drill templates." }, { status: 500 });
  }
}
