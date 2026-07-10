"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useMockStore } from "@/lib/use-mock-store";
import type { DrillHistoryItem } from "@/lib/drills/service";
import { PhilMascot } from "@/components/phil/PhilMascot";
import { ProtectedDashboardGate } from "@/components/dashboard/ProtectedDashboardGate";
import { useRedirectAdminFromDashboard } from "@/components/dashboard/useRedirectAdminFromDashboard";
import { Card, Badge } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { ArrowLeft, History } from "lucide-react";

function formatDateTime(value: string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleString("en-NZ", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function statusBadge(status: DrillHistoryItem["status"]) {
  switch (status) {
    case "caught":
      return <Badge>Bit</Badge>;
    case "spotted":
      return <Badge>Spotted</Badge>;
    case "expired":
      return <Badge>Expired</Badge>;
    default:
      return <Badge>Pending</Badge>;
  }
}

export default function TrainingHistoryPage() {
  const store = useMockStore();
  const redirectingAdmin = useRedirectAdminFromDashboard();
  const [drills, setDrills] = useState<DrillHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actingId, setActingId] = useState<string | null>(null);

  useEffect(() => {
    if (!store.user) return;
    let mounted = true;

    async function load() {
      setLoading(true);
      setError("");
      try {
        const res = await fetch("/api/drills/history");
        const payload = (await res.json()) as {
          error?: string;
          drills?: DrillHistoryItem[];
        };
        if (!mounted) return;
        if (!res.ok || !payload.drills) {
          setError(payload.error ?? "Could not load training history.");
          return;
        }
        setDrills(payload.drills);
      } catch {
        if (mounted) setError("Could not load training history.");
      } finally {
        if (mounted) setLoading(false);
      }
    }

    void load();
    return () => {
      mounted = false;
    };
  }, [store.user]);

  if (!store.user) return <ProtectedDashboardGate />;
  if (redirectingAdmin) {
    return (
      <div className="max-w-3xl mx-auto px-5 py-16 text-center text-navy/60">
        Redirecting to admin…
      </div>
    );
  }

  async function markSpotted(sendId: string) {
    setActingId(sendId);
    setError("");
    try {
      const res = await fetch("/api/drills/spot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sendId }),
      });
      const payload = (await res.json()) as {
        error?: string;
        drill?: DrillHistoryItem;
      };
      if (!res.ok || !payload.drill) {
        setError(payload.error ?? "Could not mark this drill as spotted.");
        return;
      }
      setDrills((current) =>
        current.map((item) => (item.id === sendId ? payload.drill! : item))
      );
    } catch {
      setError("Could not mark this drill as spotted.");
    } finally {
      setActingId(null);
    }
  }

  return (
    <div className="max-w-3xl mx-auto px-5 md:px-10 py-12">
      <Link
        href="/dashboard"
        className="inline-flex items-center gap-2 text-sm font-bold text-navy/60 hover:text-orange mb-6"
      >
        <ArrowLeft size={16} /> Back to dashboard
      </Link>

      <div className="flex items-center gap-3 mb-2">
        <History className="w-6 h-6 text-orange" />
        <h1 className="font-display text-3xl font-black text-navy">Training History</h1>
      </div>
      <p className="text-navy/60 mb-8">
        Review your previous drills and Phil&apos;s lessons.
      </p>

      {error && (
        <p className="mb-4 text-sm font-bold text-coral bg-coral/10 border border-coral/20 rounded-lg px-3 py-2">
          {error}
        </p>
      )}

      {loading ? (
        <Card className="text-center py-14">
          <p className="text-navy/60">Loading your drills…</p>
        </Card>
      ) : drills.length === 0 ? (
        <Card className="text-center py-14">
          <PhilMascot pose="thinking" size={110} className="mx-auto mb-5" />
          <h2 className="font-bold text-xl text-navy mb-2">No drills yet.</h2>
          <p className="text-navy/60 max-w-md mx-auto mb-8">
            Once your training begins, your completed drills and Phil&apos;s lessons will appear
            here — what was sent, when, and how you handled it.
          </p>
          <div className="flex flex-wrap gap-3 justify-center">
            <Button href="/learn" variant="ghost" size="sm">
              Browse the Scam Library
            </Button>
            <Button href="/dashboard/settings" variant="ghost" size="sm">
              Training Settings
            </Button>
          </div>
        </Card>
      ) : (
        <ul className="space-y-3">
          {drills.map((drill) => (
            <li key={drill.id}>
              <Card className="!p-4">
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <h2 className="font-bold text-navy">{drill.title}</h2>
                      {statusBadge(drill.status)}
                      {drill.isTest && <Badge>Test</Badge>}
                    </div>
                    <p className="text-sm text-navy/60 capitalize">{drill.scamType.replace("-", " ")}</p>
                    <p className="text-xs text-navy/45 mt-1">Sent {formatDateTime(drill.sentAt)}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {drill.status === "pending" && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="!rounded-lg"
                        disabled={actingId === drill.id}
                        onClick={() => void markSpotted(drill.id)}
                      >
                        {actingId === drill.id ? "Saving…" : "I spotted this"}
                      </Button>
                    )}
                    {drill.lessonPath && (
                      <Button size="sm" href={drill.lessonPath} className="!rounded-lg">
                        View lesson
                      </Button>
                    )}
                    {drill.learnSlug && (
                      <Button
                        size="sm"
                        variant="ghost"
                        href={`/learn/${drill.learnSlug}`}
                        className="!rounded-lg"
                      >
                        Read article
                      </Button>
                    )}
                  </div>
                </div>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
