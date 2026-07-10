import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth/guards";

interface PromoteBody {
  userId?: string;
}

export async function POST(req: Request) {
  try {
    const auth = await requireAdmin();
    if (!auth.ok) return auth.response;

    const body = (await req.json()) as PromoteBody;
    const userId = body.userId?.trim() ?? "";

    if (!userId) {
      return NextResponse.json({ error: "User ID is required." }, { status: 400 });
    }

    const user = await db.user.findUnique({
      where: { id: userId },
      select: { id: true, role: true, isActive: true },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found." }, { status: 404 });
    }

    if (user.role === "admin") {
      return NextResponse.json({ error: "This account is already an administrator." }, { status: 409 });
    }

    const administrator = await db.user.update({
      where: { id: userId },
      data: {
        role: "admin",
        trainingActive: false,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        joinedAt: true,
        createdAt: true,
        lastLoginAt: true,
      },
    });

    return NextResponse.json({ administrator });
  } catch (error) {
    console.error("Promote admin error", error);
    return NextResponse.json({ error: "Failed to promote user." }, { status: 500 });
  }
}
