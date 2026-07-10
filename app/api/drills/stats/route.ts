import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/guards";
import { getUserDrillStats } from "@/lib/drills/service";

export async function GET() {
  try {
    const auth = await requireUser();
    if (!auth.ok) return auth.response;

    const stats = await getUserDrillStats(auth.user.id);
    return NextResponse.json({ stats });
  } catch (error) {
    console.error("Drill stats error", error);
    return NextResponse.json({ error: "Failed to load training stats." }, { status: 500 });
  }
}
