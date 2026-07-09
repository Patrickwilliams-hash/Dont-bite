import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import type { DrillFrequency } from "@/lib/mock-store";
import { requireUser } from "@/lib/auth/guards";

interface SettingsBody {
  trainingActive?: boolean;
  frequency?: string;
}

const ALLOWED_FREQUENCIES: DrillFrequency[] = ["weekly", "fortnightly", "monthly"];

export async function PATCH(req: Request) {
  try {
    const auth = await requireUser();
    if (!auth.ok) return auth.response;

    const body = (await req.json()) as SettingsBody;

    const data: { trainingActive?: boolean; frequency?: DrillFrequency } = {};

    if (typeof body.trainingActive === "boolean") {
      data.trainingActive = body.trainingActive;
    }
    if (body.frequency !== undefined) {
      if (!ALLOWED_FREQUENCIES.includes(body.frequency as DrillFrequency)) {
        return NextResponse.json({ error: "Invalid training frequency." }, { status: 400 });
      }
      data.frequency = body.frequency as DrillFrequency;
    }

    if (Object.keys(data).length === 0) {
      return NextResponse.json({ error: "Nothing to update." }, { status: 400 });
    }

    const user = await db.user.update({
      where: { id: auth.user.id },
      data,
      select: {
        name: true,
        email: true,
        frequency: true,
        joinedAt: true,
        trainingActive: true,
      },
    });

    return NextResponse.json({ user });
  } catch (error) {
    console.error("Update settings error", error);
    return NextResponse.json({ error: "Failed to update settings." }, { status: 500 });
  }
}
