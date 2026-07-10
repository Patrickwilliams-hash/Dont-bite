import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdminPermission, requireSuperAdmin } from "@/lib/auth/guards";
import { assertCanDemoteOrDisableAdmin } from "@/lib/auth/admin-safety";
import { assertCanRemoveSuperAdminStatus } from "@/lib/auth/admin-super-safety";
import { revokeAllUserSessions } from "@/lib/auth/session";
import { getAuditRequestContext, recordAdminAuditLog, AuditLogWriteError } from "@/lib/audit/admin-audit";
import { AUDIT_ACTIONS } from "@/lib/audit/actions";
import { isSuperAdmin, sanitizePermissionList } from "@/lib/auth/admin-permissions";
import type { AdminTier } from "@prisma/client";

interface PatchAdminBody {
  role?: "user";
  isActive?: boolean;
  adminTier?: AdminTier;
  permissions?: string[];
}

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

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auditContext = getAuditRequestContext(req);

  try {
    const auth = await requireAdminPermission("manage_admins");
    if (!auth.ok) return auth.response;

    const { id } = await params;
    const body = (await req.json()) as PatchAdminBody;

    const target = await db.user.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        adminTier: true,
        adminPermissions: true,
        isActive: true,
      },
    });

    if (!target || target.role !== "admin") {
      return NextResponse.json({ error: "Administrator account not found." }, { status: 404 });
    }

    if (target.adminTier === "super_admin" && !isSuperAdmin(auth.user)) {
      return NextResponse.json({ error: "Super Admin access required." }, { status: 403 });
    }

    const demoting = body.role === "user";
    const disabling = body.isActive === false && target.isActive;
    const reactivating = body.isActive === true && !target.isActive;
    const permissionsInput = body.permissions !== undefined ? sanitizePermissionList(body.permissions) : undefined;
    const changingPermissions = permissionsInput !== null && permissionsInput !== undefined;
    const promotingSuper = body.adminTier === "super_admin" && target.adminTier !== "super_admin";
    const removingSuper = body.adminTier === "administrator" && target.adminTier === "super_admin";

    if (promotingSuper) {
      const superAuth = await requireSuperAdmin();
      if (!superAuth.ok) return superAuth.response;
    }

    if (removingSuper) {
      const superAuth = await requireSuperAdmin();
      if (!superAuth.ok) return superAuth.response;
    }

    if (body.adminTier === "super_admin" && !isSuperAdmin(auth.user)) {
      return NextResponse.json({ error: "Super Admin access required." }, { status: 403 });
    }

    if (demoting || disabling) {
      const safety = await assertCanDemoteOrDisableAdmin(auth.user.id, id);
      if (!safety.ok) {
        return NextResponse.json({ error: safety.error }, { status: 400 });
      }
    }

    if (removingSuper) {
      const safety = await assertCanRemoveSuperAdminStatus(auth.user.id, id);
      if (!safety.ok) {
        return NextResponse.json({ error: safety.error }, { status: 400 });
      }
    }

    if (
      !demoting &&
      body.isActive === undefined &&
      body.adminTier === undefined &&
      !changingPermissions
    ) {
      return NextResponse.json({ error: "No valid update provided." }, { status: 400 });
    }

    if (body.permissions !== undefined && permissionsInput === null) {
      return NextResponse.json({ error: "Invalid permissions list." }, { status: 400 });
    }

    const data: {
      role?: "user";
      isActive?: boolean;
      trainingActive?: boolean;
      adminTier?: AdminTier;
      adminPermissions?: string[];
    } = {};

    if (demoting) {
      data.role = "user";
      data.trainingActive = false;
    }

    if (body.isActive !== undefined) {
      data.isActive = body.isActive;
    }

    if (body.adminTier !== undefined) {
      data.adminTier = body.adminTier;
    }

    if (changingPermissions) {
      data.adminPermissions = permissionsInput;
    }

    const administrator = await db.$transaction(async (tx) => {
      const updated = await tx.user.update({
        where: { id },
        data,
        select: ADMIN_SELECT,
      });

      if (demoting) {
        await recordAdminAuditLog({
          actorUserId: auth.user.id,
          action: AUDIT_ACTIONS.ADMIN_DEMOTED,
          targetType: "administrator",
          targetId: target.id,
          targetLabel: target.email,
          context: auditContext,
          tx,
        });
      } else if (disabling) {
        await recordAdminAuditLog({
          actorUserId: auth.user.id,
          action: AUDIT_ACTIONS.ADMIN_DISABLED,
          targetType: "administrator",
          targetId: target.id,
          targetLabel: target.email,
          context: auditContext,
          tx,
        });
      } else if (reactivating) {
        await recordAdminAuditLog({
          actorUserId: auth.user.id,
          action: AUDIT_ACTIONS.ADMIN_REACTIVATED,
          targetType: "administrator",
          targetId: target.id,
          targetLabel: target.email,
          context: auditContext,
          tx,
        });
      }

      if (changingPermissions) {
        await recordAdminAuditLog({
          actorUserId: auth.user.id,
          action: AUDIT_ACTIONS.ADMIN_PERMISSIONS_CHANGED,
          targetType: "administrator",
          targetId: target.id,
          targetLabel: target.email,
          metadata: {
            before: target.adminPermissions,
            after: permissionsInput,
          },
          context: auditContext,
          tx,
        });
      }

      if (promotingSuper) {
        await recordAdminAuditLog({
          actorUserId: auth.user.id,
          action: AUDIT_ACTIONS.ADMIN_PROMOTED_TO_SUPER_ADMIN,
          targetType: "administrator",
          targetId: target.id,
          targetLabel: target.email,
          context: auditContext,
          tx,
        });
      }

      if (removingSuper) {
        await recordAdminAuditLog({
          actorUserId: auth.user.id,
          action: AUDIT_ACTIONS.SUPER_ADMIN_STATUS_REMOVED,
          targetType: "administrator",
          targetId: target.id,
          targetLabel: target.email,
          context: auditContext,
          tx,
        });
      }

      return updated;
    });

    if (disabling || demoting) {
      await revokeAllUserSessions(id);
    }

    return NextResponse.json({ administrator });
  } catch (error) {
    if (error instanceof AuditLogWriteError) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    console.error("Update administrator error", error);
    return NextResponse.json({ error: "Failed to update administrator." }, { status: 500 });
  }
}
