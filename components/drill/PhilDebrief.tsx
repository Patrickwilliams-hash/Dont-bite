import { PhilMascot } from "@/components/phil/PhilMascot";
import { RedFlagHighlight } from "@/components/drill/RedFlagHighlight";
import { FakeUrlBar } from "@/components/drill/FakeUrlBar";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { CheckCircle, Lock } from "lucide-react";
import type { DebriefTemplateContent } from "@/lib/drill/template-content";

export function PhilDebrief({ content }: { content: DebriefTemplateContent }) {
  return (
    <div className="max-w-3xl mx-auto px-5 py-12">
      <div className="flex items-center justify-center gap-2 text-xs font-bold text-navy/50 mb-6">
        <Lock size={14} />
        This is a simulated Don&apos;t Bite training drill. You reached this page because the
        drill link was followed.
      </div>

      <div className="rounded-2xl border border-navy/10 overflow-hidden mb-8 shadow-[var(--shadow-soft)]">
        <div className="bg-navy/5 border-b border-navy/10 p-3">
          <FakeUrlBar
            fakeDomain={content.fakeDomain}
            realDomainHint={content.realDomainHint}
          />
        </div>
        <div className="relative bg-white">
          <div className="p-8 blur-[3px] select-none pointer-events-none" aria-hidden>
            <div className="w-14 h-14 bg-navy rounded-2xl mx-auto flex items-center justify-center text-white font-black text-xl mb-3">
              {content.brandName.slice(0, 2).toUpperCase()}
            </div>
            <h3 className="text-center text-xl font-bold text-navy">{content.brandName}</h3>
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
              Training drill
            </h1>
            <p className="text-navy/70 mt-2 max-w-sm">
              This page shows what a fake <strong>{content.brandName}</strong> landing page could
              look like. It was part of a safe Don&apos;t Bite drill — not a real scam.
            </p>
          </div>
        </div>
      </div>

      <Card className="mb-6">
        <h2 className="font-bold text-xl text-navy mb-2">What this drill was simulating</h2>
        <p className="text-navy/70 text-sm mb-4">
          The training email was titled <strong>{content.title}</strong>. In a real attack, a
          page at{" "}
          <code className="text-coral font-mono text-xs">{content.fakeDomain}</code> might ask for
          information a scammer could misuse.
        </p>
        <h3 className="font-bold text-navy mb-3">Warning signs to watch for:</h3>
        <RedFlagHighlight flags={content.redFlags} />
      </Card>

      <Card className="mb-6">
        <h2 className="font-bold text-xl text-navy mb-3">Why it&apos;s dangerous</h2>
        <p className="text-navy/70 leading-relaxed">{content.whyDangerous}</p>
      </Card>

      <Card className="mb-6">
        <h2 className="font-bold text-xl text-navy mb-3">How to spot it next time</h2>
        <ul className="space-y-2">
          {content.howToSpot.map((tip) => (
            <li key={tip} className="flex gap-2 items-start text-navy/70 text-sm">
              <CheckCircle className="w-4 h-4 text-mint shrink-0 mt-0.5" />
              {tip}
            </li>
          ))}
        </ul>
      </Card>

      <div className="rounded-2xl bg-mint/15 border border-mint/30 p-5 text-center mb-8">
        <p className="font-bold text-navy">Educational debrief</p>
        <p className="text-navy/60 text-sm mt-1">
          These warning signs are for learning. Next time a suspicious email arrives, pause before
          following links — and report it if you are unsure.
        </p>
      </div>

      <div className="flex flex-wrap gap-3 justify-center">
        <Button href="/dashboard" size="lg">
          Back to Dashboard
        </Button>
        <Button href={`/learn/${content.learnSlug}`} variant="ghost" size="lg">
          Read Full Article
        </Button>
      </div>
    </div>
  );
}
