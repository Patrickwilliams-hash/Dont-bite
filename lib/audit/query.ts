import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { AUDIT_CATEGORIES } from "@/lib/audit/actions";

export interface AuditLogFilters {
  search?: string;
  action?: string;
  category?: string;
  targetType?: string;
  dateFrom?: string;
  dateTo?: string;
  sort?: "newest" | "oldest";
  page?: number;
  pageSize?: number;
}

export function buildAuditLogWhere(filters: AuditLogFilters): Prisma.AdminAuditLogWhereInput {
  const where: Prisma.AdminAuditLogWhereInput = {};

  if (filters.action) {
    where.action = filters.action;
  } else if (filters.category) {
    const category = AUDIT_CATEGORIES.find((item) => item.id === filters.category);
    if (category) {
      where.action = { in: [...category.actions] };
    }
  }

  if (filters.targetType) {
    where.targetType = filters.targetType;
  }

  if (filters.dateFrom || filters.dateTo) {
    where.createdAt = {};
    if (filters.dateFrom) {
      where.createdAt.gte = new Date(filters.dateFrom);
    }
    if (filters.dateTo) {
      const end = new Date(filters.dateTo);
      end.setHours(23, 59, 59, 999);
      where.createdAt.lte = end;
    }
  }

  if (filters.search?.trim()) {
    const query = filters.search.trim();
    where.OR = [
      { targetLabel: { contains: query, mode: "insensitive" } },
      { actor: { name: { contains: query, mode: "insensitive" } } },
      { actor: { email: { contains: query, mode: "insensitive" } } },
    ];
  }

  return where;
}

export async function queryAuditLogs(filters: AuditLogFilters) {
  const page = Math.max(1, filters.page ?? 1);
  const pageSize = Math.min(100, Math.max(1, filters.pageSize ?? 25));
  const where = buildAuditLogWhere(filters);

  const [total, entries] = await Promise.all([
    db.adminAuditLog.count({ where }),
    db.adminAuditLog.findMany({
      where,
      orderBy: { createdAt: filters.sort === "oldest" ? "asc" : "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: {
        id: true,
        action: true,
        targetType: true,
        targetId: true,
        targetLabel: true,
        metadata: true,
        createdAt: true,
        actor: {
          select: {
            name: true,
            email: true,
            adminTier: true,
          },
        },
      },
    }),
  ]);

  return { total, page, pageSize, entries };
}

export async function queryAuditLogsForExport(filters: AuditLogFilters, limit = 5000) {
  const where = buildAuditLogWhere(filters);
  return db.adminAuditLog.findMany({
    where,
    orderBy: { createdAt: filters.sort === "oldest" ? "asc" : "desc" },
    take: limit,
    select: {
      id: true,
      action: true,
      targetType: true,
      targetId: true,
      targetLabel: true,
      metadata: true,
      createdAt: true,
      actor: {
        select: {
          name: true,
          email: true,
          adminTier: true,
        },
      },
    },
  });
}
