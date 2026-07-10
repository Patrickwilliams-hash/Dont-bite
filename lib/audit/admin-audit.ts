import crypto from "node:crypto";
import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import type { AuditAction } from "@/lib/audit/actions";
import { ADMIN_PERMISSION_LABELS, type AdminPermissionKey } from "@/lib/auth/admin-permissions";

export class AuditLogWriteError extends Error {
  constructor(message = "Failed to write administrator audit log.") {
    super(message);
    this.name = "AuditLogWriteError";
  }
}

export interface AuditRequestContext {
  requestId?: string;
  ipHash?: string;
  userAgent?: string;
}

export function getAuditRequestContext(req: Request): AuditRequestContext {
  const forwarded = req.headers.get("x-forwarded-for");
  const ip = forwarded?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || "";
  const userAgent = req.headers.get("user-agent")?.slice(0, 200) ?? undefined;
  const requestId = req.headers.get("x-request-id") ?? crypto.randomUUID();

  return {
    requestId,
    userAgent,
    ipHash: ip ? crypto.createHash("sha256").update(ip).digest("hex").slice(0, 16) : undefined,
  };
}

export async function recordAdminAuditLog(input: {
  actorUserId?: string;
  action: AuditAction;
  targetType: string;
  targetId?: string;
  targetLabel?: string;
  metadata?: Record<string, unknown>;
  context?: AuditRequestContext;
  tx?: Prisma.TransactionClient;
}) {
  const client = input.tx ?? db;
  try {
    await client.adminAuditLog.create({
      data: {
        actorUserId: input.actorUserId,
        action: input.action,
        targetType: input.targetType,
        targetId: input.targetId,
        targetLabel: input.targetLabel,
        metadata: input.metadata as Prisma.InputJsonValue | undefined,
        requestId: input.context?.requestId,
        ipHash: input.context?.ipHash,
        userAgent: input.context?.userAgent,
      },
    });
  } catch (error) {
    console.error("Audit log write failed", error);
    throw new AuditLogWriteError();
  }
}

export function permissionKeysToLabels(keys: string[]): string[] {
  return keys.map((key) => ADMIN_PERMISSION_LABELS[key as AdminPermissionKey] ?? key);
}

export function formatPermissionChangeSummary(metadata: Record<string, unknown> | null): string {
  if (!metadata) return "";
  const before = Array.isArray(metadata.before) ? permissionKeysToLabels(metadata.before as string[]) : [];
  const after = Array.isArray(metadata.after) ? permissionKeysToLabels(metadata.after as string[]) : [];
  if (before.length === 0 && after.length === 0) return "";
  const beforeText = before.length > 0 ? before.join(", ") : "None";
  const afterText = after.length > 0 ? after.join(", ") : "None";
  return `from ${beforeText} to ${afterText}`;
}

export function formatAuditSummary(input: {
  action: string;
  actorName: string;
  targetLabel?: string | null;
  metadata?: Record<string, unknown> | null;
}): string {
  const target = input.targetLabel ? ` for ${input.targetLabel}` : "";
  switch (input.action) {
    case "ADMIN_PERMISSIONS_CHANGED": {
      const change = formatPermissionChangeSummary(input.metadata ?? null);
      return `${input.actorName} changed administrator permissions${target}${change ? ` ${change}` : ""}.`;
    }
    case "ADMIN_PROMOTED_TO_SUPER_ADMIN":
      return `${input.actorName} promoted${target} to Super Admin.`;
    case "SUPER_ADMIN_STATUS_REMOVED":
      return `${input.actorName} removed Super Admin status${target}.`;
    case "USER_PROMOTED_TO_ADMIN":
      return `${input.actorName} promoted${target} to administrator.`;
    case "ADMIN_CREATED":
      return `${input.actorName} created administrator${target}.`;
    case "ADMIN_DEMOTED":
      return `${input.actorName} removed administrator rights${target}.`;
    case "ADMIN_DISABLED":
      return `${input.actorName} disabled administrator${target}.`;
    case "ADMIN_REACTIVATED":
      return `${input.actorName} reactivated administrator${target}.`;
    case "USER_PASSWORD_RESET":
      return `${input.actorName} reset the password${target}.`;
    case "USER_DELETED":
      return `${input.actorName} deleted user account${target}.`;
    case "ADMIN_LOGIN_SUCCESS":
      return `${input.actorName} signed in to admin.`;
    case "ADMIN_LOGOUT":
      return `${input.actorName} signed out of admin.`;
    case "ADMIN_LOGIN_FAILED":
      return `Failed admin sign-in attempt${target}.`;
    case "EMAIL_TEST_SENT":
      return `${input.actorName} sent a test email${target}.`;
    default:
      return `${input.actorName} performed ${input.action.replaceAll("_", " ").toLowerCase()}${target}.`;
  }
}
