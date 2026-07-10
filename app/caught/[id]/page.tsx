"use client";

import { Suspense, useEffect, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { getDrill } from "@/lib/drill-templates";
import { PhilMascot } from "@/components/phil/PhilMascot";
import { RedFlagHighlight } from "@/components/drill/RedFlagHighlight";
import { FakeUrlBar } from "@/components/drill/FakeUrlBar";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { CheckCircle, Lock } from "lucide-react";

function CaughtContent() {
  const params = useParams();
  const searchParams = useSearchParams();
  const drillId = params.id as string;
  const sendId = searchParams.get("send");
  const drill = getDrill(drillId);
  const [recorded, setRecorded] = useState(!sendId);

  useEffect(() => {
    if (!sendId) return;
    let mounted = true;

    async function ensureRecorded() {
      try {
        // Visiting the lesson after a tracked click is enough; history already
        // reflects caught status. Soft-refresh stats by hitting history once.
        await fetch("/api/drills/history");
        if (mounted) setRecorded(true);
      } catch {
        if (mounted) setRecorded(true);
      }
    }

    void ensureRecorded();
    return () => {
      mounted = false;
    };
  }, [sendId]);

  if (!drill) {
    return <div className="p-10 text-center">Lesson not found</div>;
  }

  return (
    <div className="max-w-3xl mx-auto px-5 py-12">
      <div className="flex items-center justify-center gap-2 text-xs font-bold text-navy/50 mb-6">
        <Lock size={14} />
        You&apos;re only seeing this page because you clicked a simulated scam link.
      </div>

      <div className="rounded-2xl border border-navy/10 overflow-hidden mb-8 shadow-[var(--shadow-soft)]">
        <div className="bg-navy/5 border-b border-navy/10 p-3">
          <FakeUrlBar fakeDomain={drill.fakeDomain} realDomainHint={drill.realDomainHint} />
        </div>
        <div className="relative bg-white">
          <div className="p-8 blur-[3px] select-none pointer-events-none" aria-hidden>
            <div className="w-14 h-14 bg-navy rounded-2xl mx-auto flex items-center justify-center text-white font-black text-xl mb-3">
              {drill.brandName.slice(0, 2).toUpperCase()}
            </div>
            <h3 className="text-center text-xl font-bold text-navy">{drill.brandName}</h3>
            <p className="text-center text-navy/50 text-sm mt-1">Sign in to continue</p>
            <div className="max-w-xs mx-auto mt-5 space-y-3">
              <div className="h-10 rounded-lg bg-navy/10" />
              <div className="h-10 rounded-lg bg-navy/10" />
              <div className="h-10 rounded-lg bg-coral/60" />
            </div>
          </div>
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/70 backdrop-blur-[1px] text-center px-6">
            <PhilMascot pose="surprised" size={120} className="mb-3" />
            <h1 className="font-display text-3xl md:text-4xl font-black text-navy">
              Gotcha!
            </h1>
            <p className="text-navy/70 mt-2 max-w-sm">
              That link led to a <strong>fake {drill.brandName}</strong> page built to steal
              your details. Good news: this was a safe Don&apos;t Bite drill.
            </p>
          </div>
        </div>
      </div>

      <Card className="mb-6">
        <h2 className="font-bold text-xl text-navy mb-2">What just happened</h2>
        <p className="text-navy/70 text-sm mb-4">
          You clicked the link in the <strong>{drill.title}</strong> email. In real life, the
          page would have loaded at{" "}
          <code className="text-coral font-mono text-xs">{drill.fakeDomain}</code> and asked for
          information a scammer could use against you.
        </p>
        <h3 className="font-bold text-navy mb-3">Red flags to catch next time:</h3>
        <RedFlagHighlight flags={drill.redFlags} />
      </Card>

      <Card className="mb-6">
        <h2 className="font-bold text-xl text-navy mb-3">Why it&apos;s dangerous</h2>
        <p className="text-navy/70 leading-relaxed">{drill.whyDangerous}</p>
      </Card>

      <Card className="mb-6">
        <h2 className="font-bold text-xl text-navy mb-3">How to spot it next time</h2>
        <ul className="space-y-2">
          {drill.howToSpot.map((tip) => (
            <li key={tip} className="flex gap-2 items-start text-navy/70 text-sm">
              <CheckCircle className="w-4 h-4 text-mint shrink-0 mt-0.5" />
              {tip}
            </li>
          ))}
        </ul>
      </Card>

      <div className="rounded-2xl bg-coral/10 border border-coral/25 p-5 text-center mb-8">
        <p className="font-bold text-navy">{recorded ? "Lesson logged" : "Logging lesson…"}</p>
        <p className="text-navy/60 text-sm mt-1">
          Next time an email like this lands in your inbox, report it instead of clicking.
        </p>
      </div>

      <div className="flex flex-wrap gap-3 justify-center">
        <Button href="/dashboard" size="lg">
          Back to Dashboard
        </Button>
        <Button href="/dashboard/history" variant="ghost" size="lg">
          Training History
        </Button>
        <Button href={`/learn/${drill.learnSlug}`} variant="ghost" size="lg">
          Read Full Article
        </Button>
      </div>
    </div>
  );
}

export default function CaughtPage() {
  return (
    <Suspense fallback={<div className="p-10 text-center">Loading lesson...</div>}>
      <CaughtContent />
    </Suspense>
  );
}
