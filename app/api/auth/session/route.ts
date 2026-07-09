import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/guards";

export async function GET() {
  try {
    const auth = await requireUser();
    if (!auth.ok) return auth.response;

    return NextResponse.json({
      user: {
        name: auth.user.name,
        email: auth.user.email,
        frequency: auth.user.frequency,
        joinedAt: auth.user.joinedAt,
        trainingActive: auth.user.trainingActive,
        role: auth.user.role,
      },
      mustChangePassword: auth.user.mustChangePassword,
    });
  } catch (error) {
    console.error("Session lookup error", error);
    return NextResponse.json({ error: "Failed to fetch session." }, { status: 500 });
  }
}
