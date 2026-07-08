import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import type { DrillFrequency } from "@/lib/mock-store";

interface SettingsBody {
  email?: string;
  trainingActive?: boolean;
  frequency?: string;
}

const ALLOWED_FREQUENCIES: DrillFrequency[] = ["weekly", "fortnightly", "monthly"];

export async function PATCH(req: Request) {
  try {
    const body = (await req.json()) as SettingsBody;
    const email = body.email?.trim().toLowerCase() ?? "";

    if (!email) {
      return NextResponse.json({ error: "Email is required." }, { status: 400 });
    }

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

    const existing = await db.user.findUnique({ where: { email }, select: { id: true, isActive: true } });
    if (!existing || !existing.isActive) {
      return NextResponse.json({ error: "Account not found." }, { status: 404 });
    }

    const user = await db.user.update({
      where: { id: existing.id },
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
