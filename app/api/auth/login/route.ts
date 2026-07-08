import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { compare, hash } from "bcryptjs";

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
      },
    });

    if (!user || !user.isActive) {
      return NextResponse.json({ error: "Invalid email or password." }, { status: 401 });
    }

    let validPassword = false;
    if (user.passwordHash && user.passwordHash.startsWith("$2")) {
      validPassword = await compare(password, user.passwordHash);
    } else {
      // Legacy account (created before password hashing existed): adopt this login
      // password as their new hash so they can continue normally.
      const upgradedHash = await hash(password, 12);
      await db.user.update({
        where: { id: user.id },
        data: {
          passwordHash: upgradedHash,
          passwordUpdatedAt: new Date(),
        },
      });
      validPassword = true;
    }

    if (!validPassword) {
      return NextResponse.json({ error: "Invalid email or password." }, { status: 401 });
    }

    await db.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    return NextResponse.json({
      user: {
        name: user.name,
        email: user.email,
        frequency: user.frequency,
        joinedAt: user.joinedAt,
      },
      mustChangePassword: user.mustChangePassword,
    });
  } catch (error) {
    console.error("Login lookup error", error);
    return NextResponse.json({ error: "Failed to log in." }, { status: 500 });
  }
}
