import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { compare } from "bcryptjs";
import { createSession, setSessionCookie } from "@/lib/auth/session";

interface LoginBody {
  email?: string;
  password?: string;
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as LoginBody;
    const email = body.email?.trim().toLowerCase() ?? "";
    const password = body.password ?? "";

    if (!email || !password) {
      return NextResponse.json({ error: "Email and password are required." }, { status: 400 });
    }

    const user = await db.user.findUnique({
      where: { email },
      select: {
        id: true,
        name: true,
        email: true,
        frequency: true,
        joinedAt: true,
        passwordHash: true,
        isActive: true,
        mustChangePassword: true,
        trainingActive: true,
      },
    });

    if (!user || !user.isActive) {
      return NextResponse.json({ error: "Invalid email or password." }, { status: 401 });
    }

    // Stage 1 hardening: only accept proper bcrypt hashes.
    if (!user.passwordHash || !user.passwordHash.startsWith("$2")) {
      return NextResponse.json({ error: "Invalid email or password." }, { status: 401 });
    }

    const validPassword = await compare(password, user.passwordHash);

    if (!validPassword) {
      return NextResponse.json({ error: "Invalid email or password." }, { status: 401 });
    }

    await db.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    const { token, session } = await createSession(user.id);
    await setSessionCookie(token, session.expiresAt);

    return NextResponse.json({
      user: {
        name: user.name,
        email: user.email,
        frequency: user.frequency,
        joinedAt: user.joinedAt,
        trainingActive: user.trainingActive,
      },
      mustChangePassword: user.mustChangePassword,
    });
  } catch (error) {
    console.error("Login lookup error", error);
    return NextResponse.json({ error: "Failed to log in." }, { status: 500 });
  }
}
