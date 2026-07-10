"use client";

import { useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { useMockStore } from "@/lib/use-mock-store";
import { getWeakestScamType } from "@/lib/mock-store";
import { useTrainingStats } from "@/components/dashboard/useTrainingStats";
import { PhilMascot } from "@/components/phil/PhilMascot";
import { ProtectedDashboardGate } from "@/components/dashboard/ProtectedDashboardGate";
import { useRedirectAdminFromDashboard } from "@/components/dashboard/useRedirectAdminFromDashboard";
import { StatCard, Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { ArrowLeft, Share2, Check } from "lucide-react";

const ReportBarChart = dynamic(
  () => import("@/components/dashboard/StatsChart").then((mod) => mod.ReportBarChart),
  { ssr: false, loading: () => <div className="h-[200px] rounded-xl bg-navy/5 animate-pulse" /> }
);

const ScamTypeChart = dynamic(
  () => import("@/components/dashboard/StatsChart").then((mod) => mod.ScamTypeChart),
  { ssr: false, loading: () => <div className="h-[220px] rounded-xl bg-navy/5 animate-pulse" /> }
);

const tipsByType: Record<string, string> = {
  phishing:
    "Focus on checking sender addresses and hovering over links before clicking. When in doubt, go directly to the website.",
  subscription:
    "Never give your card for a 'free' trial. Read the cancellation policy and set a reminder to cancel before it renews.",
  delivery:
    "Verify tracking numbers on the official courier site. Be suspicious of small fees requested via email links.",
  "social-engineering":
    "Hang up and call back on the official number. No legitimate organisation asks for gift cards or remote access.",
  invoice: "Always verify changed bank details by phone using a number you already have.",
  romance:
    "Never send money to someone you haven't met. Reverse image search profile photos.",
};

export default function ReportPage() {
  const store = useMockStore();
  const { stats, loading: statsLoading } = useTrainingStats();
  const redirectingAdmin = useRedirectAdminFromDashboard();
  const [copied, setCopied] = useState(false);
  const weakest = getWeakestScamType({ user: store.user, stats });
  if (!store.user) return <ProtectedDashboardGate />;
  if (redirectingAdmin) {
    return (
      <div className="max-w-3xl mx-auto px-5 py-16 text-center text-navy/60">
        Redirecting to admin…
      </div>
    );
  }

  const month = new Date().toLocaleDateString("en-NZ", { month: "long", year: "numeric" });
  const completedDrills = stats.spotted + stats.caught;
  const spotRate =
    completedDrills > 0 ? `${Math.round((stats.spotted / completedDrills) * 100)}%` : "—";
  const hasTrainingHistory = stats.monthlyTrend.length > 0;

  function handleShare() {
    const text = `My Don't Bite Report (${month}):
Drills: ${stats.drillsSent} | Spotted: ${stats.spotted} | Caught: ${stats.caught}
Spot rate: ${spotRate}
Don't take the bait.`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="max-w-4xl mx-auto px-5 md:px-10 py-12">
      <Link
        href="/dashboard"
        className="inline-flex items-center gap-2 text-sm font-bold text-navy/60 hover:text-orange mb-6"
      >
        <ArrowLeft size={16} /> Back to dashboard
      </Link>

      <div className="flex flex-col md:flex-row items-center gap-6 mb-10">
        <PhilMascot pose="thinking" size={120} />
        <div>
          <p className="text-sm font-bold text-coral uppercase tracking-wide">Monthly Report</p>
          <h1 className="font-display text-3xl font-black text-navy">{month}</h1>
          <p className="text-navy/60 mt-1">Hey {store.user.name}, here&apos;s how you did.</p>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <StatCard label="Drills sent" value={statsLoading ? "…" : stats.drillsSent} />
        <StatCard label="Scams spotted" value={statsLoading ? "…" : stats.spotted} />
        <StatCard label="Times caught" value={statsLoading ? "…" : stats.caught} />
        <StatCard label="Spot rate" value={statsLoading ? "…" : spotRate} />
      </div>

      <div className="grid md:grid-cols-2 gap-6 mb-8">
        <Card>
          <h2 className="font-bold text-navy mb-4">Monthly activity</h2>
          {hasTrainingHistory ? (
            <ReportBarChart data={stats.monthlyTrend} />
          ) : (
            <div className="h-[200px] flex items-center justify-center text-navy/50 text-sm text-center px-6">
              Once you&apos;ve completed a few drills, your activity will appear here.
            </div>
          )}
        </Card>
        <Card>
          <h2 className="font-bold text-navy mb-4">Where scams caught you</h2>
          <ScamTypeChart data={stats.byScamType} />
        </Card>
      </div>

      <Card className="mb-8">
        <div className="flex items-start gap-4">
          <PhilMascot pose="point" size={64} className="shrink-0" />
          <div>
            <h2 className="font-bold text-navy mb-2">Phil&apos;s personalised tip</h2>
            <p className="text-navy/70 leading-relaxed">
              {tipsByType[weakest] || tipsByType.phishing}
            </p>
          </div>
        </div>
      </Card>

      <div className="text-center">
        <Button variant="ghost" onClick={handleShare}>
          {copied ? (
            <>
              <Check size={16} className="mr-2" /> Copied!
            </>
          ) : (
            <>
              <Share2 size={16} className="mr-2" /> Share Report
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
