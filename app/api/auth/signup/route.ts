import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import type { DrillFrequency } from "@/lib/mock-store";
import { hash } from "bcryptjs";

interface SignUpBody {
  name?: string;
  email?: string;
  password?: string;
  frequency?: string;
}

const ALLOWED_FREQUENCIES: DrillFrequency[] = ["weekly", "fortnightly", "monthly"];

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as SignUpBody;
    const name = body.name?.trim() ?? "";
    const email = body.email?.trim().toLowerCase() ?? "";
    const password = body.password ?? "";
    const frequency = body.frequency as DrillFrequency;

    if (!name || !email || !ALLOWED_FREQUENCIES.includes(frequency) || password.length < 8) {
      return NextResponse.json(
        { error: "Missing fields or password is too short (min 8 chars)." },
        { status: 400 }
      );
    }

    const existing = await db.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json(
        { error: "An account with that email already exists." },
        { status: 409 }
      );
    }

    const passwordHash = await hash(password, 12);

    const user = await db.user.create({
      data: { name, email, frequency, passwordHash, role: "user", isActive: true },
      select: { name: true, email: true, frequency: true, joinedAt: true, trainingActive: true },
    });

    return NextResponse.json({ user }, { status: 201 });
  } catch (error) {
    console.error("Signup error", error);
    return NextResponse.json({ error: "Failed to create account." }, { status: 500 });
  }
}
