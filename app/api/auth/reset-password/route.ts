import { NextResponse } from "next/server";
import crypto from "node:crypto";
import { hash } from "bcryptjs";
import { db } from "@/lib/db";

interface ResetPasswordBody {
  token?: string;
  newPassword?: string;
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as ResetPasswordBody;
    const token = body.token ?? "";
    const newPassword = body.newPassword ?? "";

    if (!token || newPassword.length < 8) {
      return NextResponse.json(
        { error: "Reset token and a new 8+ character password are required." },
        { status: 400 }
      );
    }

    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
    const resetToken = await db.passwordResetToken.findUnique({
      where: { tokenHash },
      select: { id: true, userId: true, expiresAt: true, usedAt: true },
    });

    if (!resetToken || resetToken.usedAt || resetToken.expiresAt.getTime() < Date.now()) {
      return NextResponse.json({ error: "Reset link is invalid or expired." }, { status: 400 });
    }

    const passwordHash = await hash(newPassword, 12);
    await db.user.update({
      where: { id: resetToken.userId },
      data: {
        passwordHash,
        mustChangePassword: false,
        passwordUpdatedAt: new Date(),
      },
    });

    await db.passwordResetToken.update({
      where: { id: resetToken.id },
      data: { usedAt: new Date() },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Reset password error", error);
    return NextResponse.json({ error: "Failed to reset password." }, { status: 500 });
  }
}
