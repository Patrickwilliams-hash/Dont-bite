import { NextResponse } from "next/server";
import { requireAdminPermission } from "@/lib/auth/guards";
import { queryAuditLogsForExport } from "@/lib/audit/query";
import { formatAuditSummary } from "@/lib/audit/admin-audit";
import { AUDIT_ACTION_LABELS } from "@/lib/audit/actions";
import { adminTierLabel } from "@/lib/auth/admin-permissions";

function escapeCsv(value: string): string {
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return `"${value.replaceAll('"', '""')}"`;
  }
  return value;
}

export async function GET(req: Request) {
  try {
    const auth = await requireAdminPermission("view_audit_log");
    if (!auth.ok) return auth.response;

    const url = new URL(req.url);
    const entries = await queryAuditLogsForExport({
      search: url.searchParams.get("search") ?? undefined,
      action: url.searchParams.get("action") ?? undefined,
      category: url.searchParams.get("category") ?? undefined,
      targetType: url.searchParams.get("targetType") ?? undefined,
      dateFrom: url.searchParams.get("dateFrom") ?? undefined,
      dateTo: url.searchParams.get("dateTo") ?? undefined,
      sort: (url.searchParams.get("sort") as "newest" | "oldest" | null) ?? "newest",
    });

    const header = [
      "timestamp_iso",
      "administrator_name",
      "administrator_email",
      "administrator_type",
      "action",
      "action_label",
      "target_type",
      "target_label",
      "summary",
    ];

    const rows = entries.map((entry) => [
      entry.createdAt.toISOString(),
      entry.actor?.name ?? "Unknown",
      entry.actor?.email ?? "",
      entry.actor ? adminTierLabel(entry.actor.adminTier) : "Unknown",
      entry.action,
      AUDIT_ACTION_LABELS[entry.action as keyof typeof AUDIT_ACTION_LABELS] ?? entry.action,
      entry.targetType,
      entry.targetLabel ?? "",
      formatAuditSummary({
        action: entry.action,
        actorName: entry.actor?.name ?? "Unknown",
        targetLabel: entry.targetLabel,
        metadata: (entry.metadata as Record<string, unknown> | null) ?? null,
      }),
    ]);

    const csv = [header, ...rows].map((row) => row.map((cell) => escapeCsv(String(cell))).join(",")).join("\n");

    return new NextResponse(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": 'attachment; filename="admin-activity-log.csv"',
      },
    });
  } catch (error) {
    console.error("Audit log export error", error);
    return NextResponse.json({ error: "Failed to export activity log." }, { status: 500 });
  }
}
