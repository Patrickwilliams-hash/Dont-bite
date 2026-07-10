"use client";

import { useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { useMockStore } from "@/lib/use-mock-store";
import { updateLocalUser } from "@/lib/mock-store";
import { useTrainingStats } from "@/components/dashboard/useTrainingStats";
import { PhilMascot } from "@/components/phil/PhilMascot";
import { ProtectedDashboardGate } from "@/components/dashboard/ProtectedDashboardGate";
import { useRedirectAdminFromDashboard } from "@/components/dashboard/useRedirectAdminFromDashboard";
import { Button } from "@/components/ui/Button";
import { StatCard, Card } from "@/components/ui/Card";
import { BookOpen, History, Settings, ShieldCheck, Sprout } from "lucide-react";

const TrendChart = dynamic(
  () => import("@/components/dashboard/StatsChart").then((mod) => mod.TrendChart),
  {
    ssr: false,
    loading: () => <div className="h-[220px] rounded-xl bg-navy/5 animate-pulse" />,
  }
);

export default function DashboardPage() {
  const store = useMockStore();
  const { stats, loading: statsLoading } = useTrainingStats();
  const redirectingAdmin = useRedirectAdminFromDashboard();
  const [savingStatus, setSavingStatus] = useState(false);
  const [statusError, setStatusError] = useState("");
  if (!store.user) return <ProtectedDashboardGate />;
  if (redirectingAdmin) {
    return (
      <div className="max-w-3xl mx-auto px-5 py-16 text-center text-navy/60">
        Redirecting to admin…
      </div>
    );
  }

  const firstName = store.user.name.split(" ")[0];
  const trainingActive = store.user.trainingActive;

  const completedDrills = stats.spotted + stats.caught;
  const spotRate =
    completedDrills > 0 ? `${Math.round((stats.spotted / completedDrills) * 100)}%` : "—";
  const hasTrainingHistory = stats.monthlyTrend.length > 0;

  async function toggleTraining() {
    if (!store.user) return;
    setSavingStatus(true);
    setStatusError("");
    try {
      const res = await fetch("/api/account/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ trainingActive: !trainingActive }),
      });
      const payload = (await res.json()) as {
        error?: string;
        user?: { trainingActive: boolean };
      };
      if (!res.ok || !payload.user) {
        setStatusError(payload.error ?? "Could not update your training status.");
        return;
      }
      updateLocalUser({ trainingActive: payload.user.trainingActive });
    } catch {
      setStatusError("Could not update your training status.");
    } finally {
      setSavingStatus(false);
    }
  }

  return (
    <div className="max-w-5xl mx-auto px-5 md:px-10 py-12">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 mb-8">
        <div className="flex items-center gap-4">
          <PhilMascot pose="wave" size={80} />
          <div>
            <p className="text-sm font-bold text-coral uppercase tracking-wide">Dashboard</p>
            <h1 className="font-display text-3xl font-black text-navy">Hey {firstName}!</h1>
            <p className="text-navy/60 text-sm mt-0.5">
              {trainingActive
                ? "Your training is active. Your next drill will arrive when you least expect it."
                : "Your training is currently paused. Resume training when you're ready."}
            </p>
          </div>
        </div>
        <div className="flex flex-col items-start md:items-end gap-1.5 shrink-0">
          <span
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-extrabold uppercase tracking-wide ${
              trainingActive ? "bg-mint/50 text-navy" : "bg-gold/30 text-navy"
            }`}
          >
            <span
              className={`w-2 h-2 rounded-full ${trainingActive ? "bg-emerald-500" : "bg-orange"}`}
            />
            Training {trainingActive ? "active" : "paused"}
          </span>
          <Button variant="ghost" size="sm" onClick={toggleTraining} disabled={savingStatus}>
            {savingStatus
              ? "Saving..."
              : trainingActive
                ? "Pause Training"
                : "Resume Training"}
          </Button>
          {statusError && <p className="text-coral text-xs font-bold">{statusError}</p>}
        </div>
      </div>

      <Card className="mb-8 bg-blush/70 border-navy/10">
        <div className="flex items-start gap-4">
          <div className="w-11 h-11 rounded-xl bg-navy/10 flex items-center justify-center shrink-0">
            <ShieldCheck className="w-5 h-5 text-navy" />
          </div>
          <div>
            <h2 className="font-bold text-navy mb-1">How your training works</h2>
            <p className="text-navy/75 text-sm leading-relaxed">
              Don&apos;t Bite sends you realistic training drills — simulated scams and online
              traps — at unpredictable times. Spot one and you build the habit. Get caught out
              and Phil steps in with a lesson so you&apos;re ready for the real thing.
            </p>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <StatCard label="Drills sent" value={statsLoading ? "…" : stats.drillsSent} />
        <StatCard label="Scams spotted" value={statsLoading ? "…" : stats.spotted} />
        <StatCard label="Times caught" value={statsLoading ? "…" : stats.caught} />
        <StatCard
          label="Spot rate"
          value={statsLoading ? "…" : spotRate}
          sub="of completed drills spotted"
        />
      </div>

      <Card className="mb-8">
        <h2 className="font-bold text-navy mb-4">Your progress</h2>
        {hasTrainingHistory ? (
          <TrendChart data={stats.monthlyTrend} />
        ) : (
          <div className="h-[220px] flex flex-col items-center justify-center text-center gap-2 rounded-xl bg-blush/40 border border-navy/5 px-6">
            <Sprout className="w-8 h-8 text-orange" />
            <p className="font-bold text-navy">Your training journey starts here.</p>
            <p className="text-navy/60 text-sm max-w-sm">
              Once you&apos;ve completed a few drills, your progress will appear here.
            </p>
          </div>
        )}
      </Card>

      <div className="grid md:grid-cols-3 gap-4">
        <Link href="/dashboard/history">
          <Card className="hover:shadow-xl transition-shadow cursor-pointer h-full">
            <History className="w-8 h-8 text-orange mb-3" />
            <h3 className="font-bold text-navy">Training History</h3>
            <p className="text-navy/60 text-sm mt-1">
              Review previous drills and Phil&apos;s lessons.
            </p>
          </Card>
        </Link>
        <Link href="/learn">
          <Card className="hover:shadow-xl transition-shadow cursor-pointer h-full">
            <BookOpen className="w-8 h-8 text-orange mb-3" />
            <h3 className="font-bold text-navy">Scam Library</h3>
            <p className="text-navy/60 text-sm mt-1">
              Learn about common scams, traps and warning signs.
            </p>
          </Card>
        </Link>
        <Link href="/dashboard/settings">
          <Card className="hover:shadow-xl transition-shadow cursor-pointer h-full">
            <Settings className="w-8 h-8 text-orange mb-3" />
            <h3 className="font-bold text-navy">Account &amp; Training Settings</h3>
            <p className="text-navy/60 text-sm mt-1">
              Manage your account and training preferences.
            </p>
          </Card>
        </Link>
      </div>
    </div>
  );
}
