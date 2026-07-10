import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { authenticateWithPassword, serializeSessionUser } from "@/lib/auth/login";
import { createSession, setSessionCookie } from "@/lib/auth/session";

interface AdminLoginBody {
  email?: string;
  password?: string;
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as AdminLoginBody;
    const email = body.email?.trim().toLowerCase() ?? "";
    const password = body.password ?? "";

    if (!email || !password) {
      return NextResponse.json({ error: "Email and password are required." }, { status: 400 });
    }

    const auth = await authenticateWithPassword(email, password);
    if (!auth.ok) {
      return NextResponse.json({ error: "Invalid email or password." }, { status: 401 });
    }

    if (auth.user.role !== "admin") {
      return NextResponse.json(
        { error: "This account does not have admin access." },
        { status: 403 }
      );
    }

    await db.user.update({
      where: { id: auth.user.id },
      data: { lastLoginAt: new Date() },
    });

    const { token, session } = await createSession(auth.user.id);
    await setSessionCookie(token, session.expiresAt);

    return NextResponse.json({
      user: serializeSessionUser(auth.user),
      mustChangePassword: auth.user.mustChangePassword,
    });
  } catch (error) {
    console.error("Admin login error", error);
    return NextResponse.json({ error: "Failed to log in." }, { status: 500 });
  }
}
