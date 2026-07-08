import { NextResponse } from "next/server";
import { compare } from "bcryptjs";
import { db } from "@/lib/db";

interface DeleteAccountBody {
  email?: string;
  password?: string;
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as DeleteAccountBody;
    const email = body.email?.trim().toLowerCase() ?? "";
    const password = body.password ?? "";

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required to delete an account." },
        { status: 400 }
      );
    }

    const user = await db.user.findUnique({
      where: { email },
      select: { id: true, passwordHash: true },
    });

    if (!user) {
      return NextResponse.json({ error: "Account not found." }, { status: 404 });
    }

    // Password confirmation ensures only the account owner can delete it.
    const ok = await compare(password, user.passwordHash);
    if (!ok) {
      return NextResponse.json({ error: "Password is incorrect." }, { status: 401 });
    }

    // Related records (e.g. password reset tokens) cascade via the schema.
    await db.user.delete({ where: { id: user.id } });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Delete account error", error);
    return NextResponse.json({ error: "Failed to delete account." }, { status: 500 });
  }
}
