"use client";

import Link from "next/link";
import { useMockStore } from "@/lib/use-mock-store";
import { PhilMascot } from "@/components/phil/PhilMascot";
import { ProtectedDashboardGate } from "@/components/dashboard/ProtectedDashboardGate";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { ArrowLeft, History } from "lucide-react";

export default function TrainingHistoryPage() {
  const store = useMockStore();
  if (!store.user) return <ProtectedDashboardGate />;

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

      {/* Empty state — real drill history will populate this once the
          drill delivery system is built. */}
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
    </div>
  );
}
