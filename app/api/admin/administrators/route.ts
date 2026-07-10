import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdminPermission } from "@/lib/auth/guards";
import { generateTempPassword, hashPassword } from "@/lib/auth/password";
import { getAuditRequestContext, recordAdminAuditLog, AuditLogWriteError } from "@/lib/audit/admin-audit";
import { AUDIT_ACTIONS } from "@/lib/audit/actions";

const ADMIN_SELECT = {
  id: true,
  name: true,
  email: true,
  role: true,
  adminTier: true,
  adminPermissions: true,
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
    const auth = await requireAdminPermission("manage_admins");
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
  const auditContext = getAuditRequestContext(req);

  try {
    const auth = await requireAdminPermission("manage_admins");
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

    const administrator = await db.$transaction(async (tx) => {
      const created = await tx.user.create({
        data: {
          name,
          email,
          passwordHash,
          role: "admin",
          adminTier: "administrator",
          adminPermissions: [],
          isActive: true,
          mustChangePassword: true,
          passwordUpdatedAt: new Date(),
          frequency: "monthly",
          trainingActive: false,
        },
        select: ADMIN_SELECT,
      });

      await recordAdminAuditLog({
        actorUserId: auth.user.id,
        action: AUDIT_ACTIONS.ADMIN_CREATED,
        targetType: "administrator",
        targetId: created.id,
        targetLabel: created.email,
        metadata: { adminTier: created.adminTier },
        context: auditContext,
        tx,
      });

      return created;
    });

    return NextResponse.json({ administrator, tempPassword }, { status: 201 });
  } catch (error) {
    if (error instanceof AuditLogWriteError) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    console.error("Create admin error", error);
    return NextResponse.json({ error: "Failed to create administrator." }, { status: 500 });
  }
}
