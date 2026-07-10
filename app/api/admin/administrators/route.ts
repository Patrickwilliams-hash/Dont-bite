import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth/guards";
import { generateTempPassword, hashPassword } from "@/lib/auth/password";

const ADMIN_SELECT = {
  id: true,
  name: true,
  email: true,
  role: true,
  isActive: true,
  joinedAt: true,
  createdAt: true,
  lastLoginAt: true,
} as const;

interface CreateAdminBody {
  name?: string;
  email?: string;
}

export async function GET() {
  try {
    const auth = await requireAdmin();
    if (!auth.ok) return auth.response;

    const administrators = await db.user.findMany({
      where: { role: "admin" },
      orderBy: { createdAt: "asc" },
      select: ADMIN_SELECT,
    });

    return NextResponse.json({ administrators });
  } catch (error) {
    console.error("Admin list error", error);
    return NextResponse.json({ error: "Failed to load administrators." }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const auth = await requireAdmin();
    if (!auth.ok) return auth.response;

    const body = (await req.json()) as CreateAdminBody;
    const name = body.name?.trim() ?? "";
    const email = body.email?.trim().toLowerCase() ?? "";

    if (!name || !email) {
      return NextResponse.json({ error: "Name and email are required." }, { status: 400 });
    }

    const existing = await db.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json(
        { error: "An account with that email already exists." },
        { status: 409 }
      );
    }

    const tempPassword = generateTempPassword();
    const passwordHash = await hashPassword(tempPassword);

    const administrator = await db.user.create({
      data: {
        name,
        email,
        passwordHash,
        role: "admin",
        isActive: true,
        mustChangePassword: true,
        passwordUpdatedAt: new Date(),
        frequency: "monthly",
        trainingActive: false,
      },
      select: ADMIN_SELECT,
    });

    return NextResponse.json({ administrator, tempPassword }, { status: 201 });
  } catch (error) {
    console.error("Create admin error", error);
    return NextResponse.json({ error: "Failed to create administrator." }, { status: 500 });
  }
}
