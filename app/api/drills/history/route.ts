import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/guards";
import { getUserDrillHistory } from "@/lib/drills/service";

export async function GET() {
  try {
    const auth = await requireUser();
    if (!auth.ok) return auth.response;

    const drills = await getUserDrillHistory(auth.user.id);
    return NextResponse.json({ drills });
  } catch (error) {
    console.error("Drill history error", error);
    return NextResponse.json({ error: "Failed to load training history." }, { status: 500 });
  }
}
