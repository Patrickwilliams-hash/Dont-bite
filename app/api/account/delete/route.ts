import { NextResponse } from "next/server";
import { compare } from "bcryptjs";
import { db } from "@/lib/db";
import { clearSessionCookie, readSessionTokenFromCookie, revokeSession } from "@/lib/auth/session";
import { requireUser } from "@/lib/auth/guards";

interface DeleteAccountBody {
  password?: string;
}

export async function POST(req: Request) {
  try {
    const auth = await requireUser();
    if (!auth.ok) return auth.response;

    const body = (await req.json()) as DeleteAccountBody;
    const password = body.password ?? "";

    if (!password) {
      return NextResponse.json(
        { error: "Password is required to delete an account." },
        { status: 400 }
      );
    }

    const user = await db.user.findUnique({
      where: { id: auth.user.id },
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
    const sessionToken = await readSessionTokenFromCookie();
    if (sessionToken) {
      await revokeSession(sessionToken);
    }
    await clearSessionCookie();

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Delete account error", error);
    return NextResponse.json({ error: "Failed to delete account." }, { status: 500 });
  }
}
