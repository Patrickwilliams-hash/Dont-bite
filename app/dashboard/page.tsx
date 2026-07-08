"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import dynamic from "next/dynamic";
import { useMockStore } from "@/lib/use-mock-store";
import { sendNewDrill } from "@/lib/mock-store";
import { PhilMascot } from "@/components/phil/PhilMascot";
import { Button } from "@/components/ui/Button";
import { StatCard, Card } from "@/components/ui/Card";
import { BarChart3, BookOpen, Inbox, Mail, ShieldCheck, MousePointerClick } from "lucide-react";

const TrendChart = dynamic(
  () => import("@/components/dashboard/StatsChart").then((mod) => mod.TrendChart),
  {
    ssr: false,
    loading: () => <div className="h-[220px] rounded-xl bg-navy/5 animate-pulse" />,
  }
);

export default function DashboardPage() {
  const store = useMockStore();
  const router = useRouter();

  useEffect(() => {
    if (!store.user) router.push("/signup");
  }, [store.user, router]);

  if (!store.user) return null;

  const pending = store.emails.filter((e) => e.outcome === "pending").length;

  return (
    <div className="max-w-5xl mx-auto px-5 md:px-10 py-12">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 mb-8">
        <div className="flex items-center gap-4">
          <PhilMascot pose="wave" size={80} />
          <div>
            <p className="text-sm font-bold text-coral uppercase tracking-wide">Dashboard</p>
            <h1 className="font-display text-3xl font-black text-navy">
              Hey {store.user.name}!
            </h1>
            <p className="text-navy/60 text-sm">
              {pending > 0
                ? `You have ${pending} email${pending > 1 ? "s" : ""} waiting for your call`
                : "You're all caught up — nice work"}
            </p>
          </div>
        </div>
        <Button variant="secondary" size="sm" onClick={() => sendNewDrill()}>
          Send Practice Drill
        </Button>
      </div>

      {/* How the real thing works */}
      <Card className="mb-8 bg-blush/70 border-navy/10">
        <div className="flex items-start gap-4">
          <div className="w-11 h-11 rounded-xl bg-navy/10 flex items-center justify-center shrink-0">
            <Mail className="w-5 h-5 text-navy" />
          </div>
          <div>
            <h2 className="font-bold text-navy mb-1">How your training works</h2>
            <p className="text-navy/75 text-sm leading-relaxed">
              We send simulated scam emails to your inbox at random times — mixed in with your
              normal mail. Spot one and report it, and you build the habit. Click a link by
              mistake and Phil steps in with a lesson so you&apos;re ready next time.
            </p>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <StatCard label="Drills sent" value={store.stats.drillsSent} />
        <StatCard label="Scams spotted" value={store.stats.spotted} />
        <StatCard label="Times caught" value={store.stats.caught} />
        <StatCard label="Streak" value={store.stats.streak} sub="good calls in a row" />
      </div>

      <Card className="mb-8">
        <h2 className="font-bold text-navy mb-4">Your progress (last 3 months)</h2>
        <TrendChart data={store.stats.monthlyTrend} />
      </Card>

      <div className="grid md:grid-cols-3 gap-4">
        <Link href="/dashboard/inbox">
          <Card className="hover:shadow-xl transition-shadow cursor-pointer h-full">
            <Inbox className="w-8 h-8 text-orange mb-3" />
            <h3 className="font-bold text-navy">Open Inbox</h3>
            <p className="text-navy/60 text-sm mt-1">
              {pending > 0 ? `${pending} awaiting your decision` : "Check your drill emails"}
            </p>
          </Card>
        </Link>
        <Link href="/dashboard/report">
          <Card className="hover:shadow-xl transition-shadow cursor-pointer h-full">
            <BarChart3 className="w-8 h-8 text-orange mb-3" />
            <h3 className="font-bold text-navy">Monthly Report</h3>
            <p className="text-navy/60 text-sm mt-1">See your stats and Phil&apos;s tips</p>
          </Card>
        </Link>
        <Link href="/learn">
          <Card className="hover:shadow-xl transition-shadow cursor-pointer h-full">
            <BookOpen className="w-8 h-8 text-orange mb-3" />
            <h3 className="font-bold text-navy">Scam Library</h3>
            <p className="text-navy/60 text-sm mt-1">Brush up between drills</p>
          </Card>
        </Link>
      </div>

      {/* Quick legend */}
      <div className="flex flex-wrap gap-4 mt-8 text-xs font-bold text-navy/60">
        <span className="inline-flex items-center gap-1.5">
          <ShieldCheck size={14} className="text-mint" /> Report a scam = a good call
        </span>
        <span className="inline-flex items-center gap-1.5">
          <MousePointerClick size={14} className="text-coral" /> Click a scam link = caught
        </span>
      </div>
    </div>
  );
}
