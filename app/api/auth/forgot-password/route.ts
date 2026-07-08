import { NextResponse } from "next/server";
import crypto from "node:crypto";
import { db } from "@/lib/db";

interface ForgotPasswordBody {
  email?: string;
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as ForgotPasswordBody;
    const email = body.email?.trim().toLowerCase() ?? "";
    if (!email) {
      return NextResponse.json({ error: "Email is required." }, { status: 400 });
    }

    const user = await db.user.findUnique({
      where: { email },
      select: { id: true },
    });

    // Do not reveal whether user exists in production-style flow.
    if (!user) {
      return NextResponse.json({ ok: true });
    }

    const rawToken = crypto.randomBytes(32).toString("hex");
    const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await db.passwordResetToken.create({
      data: {
        userId: user.id,
        tokenHash,
        expiresAt,
      },
    });

    return NextResponse.json({
      ok: true,
      resetUrl: `/reset-password?token=${rawToken}`,
      note: "In production this URL should be emailed to the user.",
    });
  } catch (error) {
    console.error("Forgot password error", error);
    return NextResponse.json({ error: "Failed to create reset request." }, { status: 500 });
  }
}
