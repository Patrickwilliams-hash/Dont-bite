"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { AUDIT_CATEGORIES } from "@/lib/audit/actions";

interface AuditEntry {
  id: string;
  createdAt: string;
  action: string;
  actionLabel: string;
  targetType: string;
  targetLabel: string | null;
  metadata: Record<string, unknown> | null;
  actorName: string;
  actorEmail: string;
  actorAdminTierLabel: string;
  summary: string;
}

interface ActivityLogPanelProps {
  onError: (message: string) => void;
}

function formatDateTime(value: string) {
  return new Date(value).toLocaleString("en-NZ", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function ActivityLogPanel({ onError }: ActivityLogPanelProps) {
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(25);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [selected, setSelected] = useState<AuditEntry | null>(null);

  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [targetType, setTargetType] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [sort, setSort] = useState<"newest" | "oldest">("newest");

  const queryString = useMemo(() => {
    const params = new URLSearchParams();
    if (search.trim()) params.set("search", search.trim());
    if (category) params.set("category", category);
    if (targetType) params.set("targetType", targetType);
    if (dateFrom) params.set("dateFrom", dateFrom);
    if (dateTo) params.set("dateTo", dateTo);
    params.set("sort", sort);
    params.set("page", String(page));
    params.set("pageSize", String(pageSize));
    return params.toString();
  }, [search, category, targetType, dateFrom, dateTo, sort, page, pageSize]);

  const loadEntries = useCallback(async () => {
    setLoading(true);
    onError("");
    try {
      const res = await fetch(`/api/admin/audit-log?${queryString}`);
      const payload = (await res.json()) as {
        error?: string;
        entries?: AuditEntry[];
        total?: number;
      };
      if (!res.ok || !payload.entries) {
        onError(payload.error ?? "Could not load activity log.");
        return;
      }
      setEntries(payload.entries);
      setTotal(payload.total ?? 0);
    } catch {
      onError("Could not load activity log.");
    } finally {
      setLoading(false);
    }
  }, [queryString, onError]);

  useEffect(() => {
    loadEntries();
  }, [loadEntries]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  async function exportCsv() {
    setExporting(true);
    onError("");
    try {
      const res = await fetch(`/api/admin/audit-log/export?${queryString}`);
      if (!res.ok) {
        const payload = (await res.json()) as { error?: string };
        onError(payload.error ?? "Could not export activity log.");
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "admin-activity-log.csv";
      link.click();
      URL.revokeObjectURL(url);
    } catch {
      onError("Could not export activity log.");
    } finally {
      setExporting(false);
    }
  }

  const selectClass =
    "rounded-lg border border-navy/15 bg-white px-3 py-2 text-sm text-navy focus:outline-none focus:ring-2 focus:ring-orange/40";

  return (
    <div className="space-y-4">
      <Card className="!p-4">
        <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-3 mb-4">
          <div>
            <h2 className="font-bold text-lg text-navy">Activity log</h2>
            <p className="text-sm text-navy/60">
              Review important administrator actions across the platform.
            </p>
          </div>
          <Button
            size="sm"
            className="!rounded-lg self-start lg:self-auto"
            onClick={exportCsv}
            disabled={exporting || loading}
          >
            {exporting ? "Exporting…" : "Export CSV"}
          </Button>
        </div>

        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-3 mb-4">
          <input
            type="search"
            value={search}
            onChange={(e) => {
              setPage(1);
              setSearch(e.target.value);
            }}
            placeholder="Search administrator name or email"
            className={selectClass}
          />
          <select
            value={category}
            onChange={(e) => {
              setPage(1);
              setCategory(e.target.value);
            }}
            className={selectClass}
          >
            <option value="">All categories</option>
            {AUDIT_CATEGORIES.map((item) => (
              <option key={item.id} value={item.id}>
                {item.label}
              </option>
            ))}
          </select>
          <select
            value={targetType}
            onChange={(e) => {
              setPage(1);
              setTargetType(e.target.value);
            }}
            className={selectClass}
          >
            <option value="">All target types</option>
            <option value="administrator">Administrator</option>
            <option value="user">User</option>
            <option value="admin_session">Admin session</option>
          </select>
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => {
              setPage(1);
              setDateFrom(e.target.value);
            }}
            className={selectClass}
            aria-label="From date"
          />
          <input
            type="date"
            value={dateTo}
            onChange={(e) => {
              setPage(1);
              setDateTo(e.target.value);
            }}
            className={selectClass}
            aria-label="To date"
          />
          <select
            value={sort}
            onChange={(e) => {
              setPage(1);
              setSort(e.target.value as "newest" | "oldest");
            }}
            className={selectClass}
          >
            <option value="newest">Newest first</option>
            <option value="oldest">Oldest first</option>
          </select>
        </div>

        {loading ? (
          <p className="text-sm text-navy/60 py-8 text-center">Loading activity log…</p>
        ) : entries.length === 0 ? (
          <p className="text-sm text-navy/60 py-8 text-center">
            No activity matches your current filters.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-sm">
              <thead>
                <tr className="border-b border-navy/10 text-left text-navy/60">
                  <th className="py-2 pr-3 font-bold">Date and time</th>
                  <th className="py-2 pr-3 font-bold">Administrator</th>
                  <th className="py-2 pr-3 font-bold">Type</th>
                  <th className="py-2 pr-3 font-bold">Action</th>
                  <th className="py-2 pr-3 font-bold">Target</th>
                  <th className="py-2 pr-0 font-bold">Details</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((entry) => (
                  <tr key={entry.id} className="border-b border-navy/5 hover:bg-blush/20">
                    <td className="py-2.5 pr-3 text-navy/75 whitespace-nowrap">
                      {formatDateTime(entry.createdAt)}
                    </td>
                    <td className="py-2.5 pr-3">
                      <p className="font-bold text-navy">{entry.actorName}</p>
                      {entry.actorEmail && (
                        <p className="text-xs text-navy/55">{entry.actorEmail}</p>
                      )}
                    </td>
                    <td className="py-2.5 pr-3 text-navy/75">{entry.actorAdminTierLabel}</td>
                    <td className="py-2.5 pr-3 text-navy/80">{entry.actionLabel}</td>
                    <td className="py-2.5 pr-3 text-navy/75">
                      {entry.targetLabel || entry.targetType}
                    </td>
                    <td className="py-2.5 pr-0">
                      <button
                        type="button"
                        className="text-left text-xs font-bold text-navy hover:text-coral-dark"
                        onClick={() => setSelected(entry)}
                      >
                        {entry.summary}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="flex items-center justify-between gap-3 mt-4">
          <p className="text-xs text-navy/55">
            Showing page {page} of {totalPages} ({total} total events)
          </p>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="ghost"
              className="!rounded-lg"
              disabled={page <= 1 || loading}
              onClick={() => setPage((value) => Math.max(1, value - 1))}
            >
              Previous
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="!rounded-lg"
              disabled={page >= totalPages || loading}
              onClick={() => setPage((value) => value + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      </Card>

      {selected && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <button
            type="button"
            className="absolute inset-0 bg-navy/40"
            aria-label="Close details"
            onClick={() => setSelected(null)}
          />
          <div className="relative w-full max-w-lg rounded-2xl bg-white border border-navy/10 shadow-2xl p-5">
            <h3 className="font-display text-xl font-black text-navy mb-2">Activity details</h3>
            <p className="text-sm text-navy/70 mb-4">{selected.summary}</p>
            <dl className="space-y-2 text-sm">
              <div>
                <dt className="font-bold text-navy/55">Timestamp</dt>
                <dd className="text-navy">{formatDateTime(selected.createdAt)}</dd>
              </div>
              <div>
                <dt className="font-bold text-navy/55">Action code</dt>
                <dd className="font-mono text-xs text-navy/70">{selected.action}</dd>
              </div>
              <div>
                <dt className="font-bold text-navy/55">Target type</dt>
                <dd className="text-navy">{selected.targetType}</dd>
              </div>
              {selected.metadata && Object.keys(selected.metadata).length > 0 && (
                <div>
                  <dt className="font-bold text-navy/55 mb-1">Metadata</dt>
                  <dd className="rounded-lg bg-navy/5 p-3 font-mono text-xs text-navy/75 whitespace-pre-wrap">
                    {JSON.stringify(selected.metadata, null, 2)}
                  </dd>
                </div>
              )}
            </dl>
            <div className="flex justify-end mt-4">
              <Button size="sm" variant="ghost" className="!rounded-lg" onClick={() => setSelected(null)}>
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
