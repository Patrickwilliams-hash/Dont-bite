import { NextResponse } from "next/server";
import { requireAdminPermission } from "@/lib/auth/guards";
import { getPlatformDrillStats } from "@/lib/drills/service";

export async function GET() {
  try {
    const auth = await requireAdminPermission("manage_drills");
    if (!auth.ok) return auth.response;

    const stats = await getPlatformDrillStats();
    return NextResponse.json({ stats });
  } catch (error) {
    console.error("Admin drill stats error", error);
    return NextResponse.json({ error: "Failed to load drill stats." }, { status: 500 });
  }
}
