import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/guards";
import { markDrillSpotted, serializeDrillHistoryItem } from "@/lib/drills/service";

interface SpotBody {
  sendId?: string;
}

export async function POST(req: Request) {
  try {
    const auth = await requireUser();
    if (!auth.ok) return auth.response;

    const body = (await req.json()) as SpotBody;
    const sendId = body.sendId?.trim();
    if (!sendId) {
      return NextResponse.json({ error: "sendId is required." }, { status: 400 });
    }

    const send = await markDrillSpotted(sendId, auth.user.id);
    if (!send) {
      return NextResponse.json({ error: "Drill not found." }, { status: 404 });
    }

    return NextResponse.json({ drill: serializeDrillHistoryItem(send) });
  } catch (error) {
    console.error("Spot drill error", error);
    return NextResponse.json({ error: "Failed to mark drill as spotted." }, { status: 500 });
  }
}
