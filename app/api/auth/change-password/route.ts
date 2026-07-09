import { NextResponse } from "next/server";
import { compare, hash } from "bcryptjs";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth/guards";

interface ChangePasswordBody {
  currentPassword?: string;
  newPassword?: string;
}

export async function POST(req: Request) {
  try {
    const auth = await requireUser();
    if (!auth.ok) return auth.response;

    const body = (await req.json()) as ChangePasswordBody;
    const currentPassword = body.currentPassword ?? "";
    const newPassword = body.newPassword ?? "";

    if (!currentPassword || newPassword.length < 8) {
      return NextResponse.json(
        { error: "Current password and a new 8+ character password are required." },
        { status: 400 }
      );
    }

    const user = await db.user.findUnique({
      where: { id: auth.user.id },
      select: {
        id: true,
        name: true,
        email: true,
        frequency: true,
        joinedAt: true,
        passwordHash: true,
        isActive: true,
        trainingActive: true,
      },
    });

    if (!user || !user.isActive) {
      return NextResponse.json({ error: "Account not found." }, { status: 404 });
    }

    const ok = await compare(currentPassword, user.passwordHash);
    if (!ok) {
      return NextResponse.json({ error: "Current password is incorrect." }, { status: 401 });
    }

    const updatedHash = await hash(newPassword, 12);
    await db.user.update({
      where: { id: user.id },
      data: {
        passwordHash: updatedHash,
        mustChangePassword: false,
        passwordUpdatedAt: new Date(),
      },
    });

    return NextResponse.json({
      user: {
        name: user.name,
        email: user.email,
        frequency: user.frequency,
        joinedAt: user.joinedAt,
        trainingActive: user.trainingActive,
      },
    });
  } catch (error) {
    console.error("Change password error", error);
    return NextResponse.json({ error: "Failed to change password." }, { status: 500 });
  }
}
