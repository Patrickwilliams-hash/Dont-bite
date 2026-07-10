import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth/guards";
import { assertCanDemoteOrDisableAdmin } from "@/lib/auth/admin-safety";
import { revokeAllUserSessions } from "@/lib/auth/session";

interface PatchAdminBody {
  role?: "user";
  isActive?: boolean;
}

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

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAdmin();
    if (!auth.ok) return auth.response;

    const { id } = await params;
    const body = (await req.json()) as PatchAdminBody;

    const target = await db.user.findUnique({
      where: { id },
      select: { id: true, role: true, isActive: true },
    });

    if (!target || target.role !== "admin") {
      return NextResponse.json({ error: "Administrator account not found." }, { status: 404 });
    }

    const demoting = body.role === "user";
    const disabling = body.isActive === false && target.isActive;

    if (demoting || disabling) {
      const safety = await assertCanDemoteOrDisableAdmin(auth.user.id, id);
      if (!safety.ok) {
        return NextResponse.json({ error: safety.error }, { status: 400 });
      }
    }

    if (!demoting && body.isActive === undefined) {
      return NextResponse.json({ error: "No valid update provided." }, { status: 400 });
    }

    const data: { role?: "user"; isActive?: boolean; trainingActive?: boolean } = {};

    if (demoting) {
      data.role = "user";
      data.trainingActive = false;
    }

    if (body.isActive !== undefined) {
      data.isActive = body.isActive;
    }

    const administrator = await db.user.update({
      where: { id },
      data,
      select: ADMIN_SELECT,
    });

    if (disabling || demoting) {
      await revokeAllUserSessions(id);
    }

    return NextResponse.json({ administrator });
  } catch (error) {
    console.error("Update administrator error", error);
    return NextResponse.json({ error: "Failed to update administrator." }, { status: 500 });
  }
}
