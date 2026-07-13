import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdminPermission } from "@/lib/auth/guards";
import { PARCELPATH_DRILL_SLUG } from "@/lib/drill/parcelpath-template";

export async function GET() {
  try {
    const auth = await requireAdminPermission("manage_drills");
    if (!auth.ok) return auth.response;

    const template = await db.drillTemplate.findFirst({
      where: {
        slug: PARCELPATH_DRILL_SLUG,
        isActive: true,
      },
      select: {
        id: true,
        slug: true,
        title: true,
        brandName: true,
        scamType: true,
        emailSubject: true,
        emailPreviewText: true,
        isActive: true,
      },
    });

    return NextResponse.json({
      templates: template ? [template] : [],
    });
  } catch (error) {
    console.error("Admin drill templates error", error);
    return NextResponse.json({ error: "Failed to load drill templates." }, { status: 500 });
  }
}
