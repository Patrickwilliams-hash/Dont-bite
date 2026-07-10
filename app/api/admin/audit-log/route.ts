import { NextResponse } from "next/server";
import { requireAdminPermission } from "@/lib/auth/guards";
import { queryAuditLogs } from "@/lib/audit/query";
import { formatAuditSummary } from "@/lib/audit/admin-audit";
import { AUDIT_ACTION_LABELS } from "@/lib/audit/actions";
import { adminTierLabel } from "@/lib/auth/admin-permissions";

export async function GET(req: Request) {
  try {
    const auth = await requireAdminPermission("view_audit_log");
    if (!auth.ok) return auth.response;

    const url = new URL(req.url);
    const result = await queryAuditLogs({
      search: url.searchParams.get("search") ?? undefined,
      action: url.searchParams.get("action") ?? undefined,
      category: url.searchParams.get("category") ?? undefined,
      targetType: url.searchParams.get("targetType") ?? undefined,
      dateFrom: url.searchParams.get("dateFrom") ?? undefined,
      dateTo: url.searchParams.get("dateTo") ?? undefined,
      sort: (url.searchParams.get("sort") as "newest" | "oldest" | null) ?? "newest",
      page: Number(url.searchParams.get("page") ?? "1"),
      pageSize: Number(url.searchParams.get("pageSize") ?? "25"),
    });

    return NextResponse.json({
      ...result,
      entries: result.entries.map((entry) => ({
        id: entry.id,
        createdAt: entry.createdAt,
        action: entry.action,
        actionLabel: AUDIT_ACTION_LABELS[entry.action as keyof typeof AUDIT_ACTION_LABELS] ?? entry.action,
        targetType: entry.targetType,
        targetId: entry.targetId,
        targetLabel: entry.targetLabel,
        metadata: entry.metadata,
        actorName: entry.actor?.name ?? "Unknown",
        actorEmail: entry.actor?.email ?? "",
        actorAdminTier: entry.actor?.adminTier ?? null,
        actorAdminTierLabel: entry.actor ? adminTierLabel(entry.actor.adminTier) : "Unknown",
        summary: formatAuditSummary({
          action: entry.action,
          actorName: entry.actor?.name ?? "Unknown",
          targetLabel: entry.targetLabel,
          metadata: (entry.metadata as Record<string, unknown> | null) ?? null,
        }),
      })),
    });
  } catch (error) {
    console.error("Audit log list error", error);
    return NextResponse.json({ error: "Failed to load activity log." }, { status: 500 });
  }
}
