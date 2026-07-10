import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth/guards";
import { generateTempPassword, hashPassword } from "@/lib/auth/password";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAdmin();
    if (!auth.ok) return auth.response;

    const { id } = await params;
    const tempPassword = generateTempPassword();
    const passwordHash = await hashPassword(tempPassword);

    await db.user.update({
      where: { id },
      data: {
        passwordHash,
        mustChangePassword: true,
        passwordUpdatedAt: new Date(),
      },
    });

    return NextResponse.json({ ok: true, tempPassword });
  } catch (error) {
    console.error("Reset password error", error);
    return NextResponse.json({ error: "Failed to reset password." }, { status: 500 });
  }
}
