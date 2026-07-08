import { PhilMascot } from "@/components/phil/PhilMascot";
import { PhilTip } from "@/components/phil/PhilMascot";
import { Accordion } from "@/components/ui/Accordion";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";

const faqs = [
  {
    question: "Is this real phishing?",
    answer:
      "No. Don't Bite only sends simulated training emails that link to our own fake pages. We never collect real passwords, card numbers, or personal data. Everything stays in your browser for this demo.",
  },
  {
    question: "Do you store my personal data?",
    answer:
      "In this mockup, everything is stored locally in your browser. When we build the real service, we'll only store what's needed for training — never sensitive details you might type into a drill page.",
  },
  {
    question: "How often will I receive drills?",
    answer:
      "You choose: weekly, fortnightly, or monthly. Drills arrive at random times within that period to keep things realistic.",
  },
  {
    question: "What happens if I click a drill link?",
    answer:
      "You'll land on a fake page (like a bank login or delivery reschedule). If you start entering details, Phil appears with a friendly debrief explaining every red flag you missed.",
  },
  {
    question: "Can my employer or bank use this?",
    answer:
      "That's the long-term vision! We're building for the general public first, but corporate and bank partnerships for authorised brand simulations are on the roadmap.",
  },
];

export default function HowItWorksPage() {
  return (
    <div className="max-w-6xl mx-auto px-5 md:px-10 py-14 md:py-16">
      <section className="relative overflow-hidden rounded-[2rem] border border-white/80 bg-gradient-to-br from-[#fff8f5] via-[#ffe9ea] to-[#f8d7db] p-7 md:p-10 mb-12 shadow-[var(--shadow-soft)]">
        <div className="absolute -left-10 -bottom-12 w-56 h-56 rounded-full bg-coral/20 blur-2xl" aria-hidden />
        <div className="absolute right-4 top-4 hidden md:block" aria-hidden>
          <PhilMascot pose="magnifier" size={170} />
        </div>
        <p className="text-sm font-black uppercase tracking-widest text-coral-dark mb-2">How it works</p>
        <h1 className="font-display text-4xl md:text-6xl font-black tracking-[-0.02em] text-navy leading-[1.02] max-w-3xl mb-4">
          Realistic scam drills for everyday people.
        </h1>
        <p className="text-base md:text-lg text-navy/80 leading-relaxed max-w-2xl">
          Don&apos;t Bite gives you the same &quot;safe failure&quot; training big organisations
          use — realistic pressure, zero real risk, and instant coaching so you learn before
          scammers teach you the hard way.
        </p>
      </section>

      <section className="rounded-[2rem] bg-navy text-white p-6 md:p-8 mb-12">
        <div className="flex items-center justify-between gap-4 mb-6">
          <h2 className="font-display text-3xl md:text-4xl font-black">The 3-step loop</h2>
          <span className="text-xs md:text-sm font-extrabold uppercase tracking-wider text-coral-dark bg-white/10 px-3 py-1.5 rounded-full">
            Repeat Monthly
          </span>
        </div>
        <div className="grid md:grid-cols-3 gap-4">
          {[
            {
              step: "01",
              title: "Sign up",
              desc: "Pick your drill frequency and create your free account in under a minute.",
            },
            {
              step: "02",
              title: "Get tested",
              desc: "Receive realistic scam scenarios at random times to mimic real-world pressure.",
            },
            {
              step: "03",
              title: "Learn & improve",
              desc: "Get debriefed by Phil and track progress so weak spots become strengths.",
            },
          ].map((s) => (
            <Card key={s.step} className="bg-white text-navy border-white/70">
              <p className="text-xs font-black uppercase tracking-[0.18em] text-coral-dark">Step {s.step}</p>
              <h3 className="font-display text-2xl font-black mt-2 mb-2 leading-tight">{s.title}</h3>
              <p className="text-navy/75 leading-relaxed text-sm">{s.desc}</p>
            </Card>
          ))}
        </div>
      </section>

      <section className="grid lg:grid-cols-[1.2fr_1fr] gap-6 mb-12">
        <Card className="p-7 md:p-8">
          <h3 className="font-display text-3xl font-black text-navy mb-3">Why this works</h3>
          <p className="text-navy/75 leading-relaxed mb-4">
            Reading scam tips is helpful, but habits are built under pressure. Don&apos;t Bite
            recreates that pressure safely, then explains every red flag while it&apos;s still
            fresh in your mind.
          </p>
          <div className="grid sm:grid-cols-2 gap-3 text-sm font-bold">
            <div className="rounded-xl bg-blush/55 border border-white px-4 py-3 text-navy">Realistic fake scenarios</div>
            <div className="rounded-xl bg-blush/55 border border-white px-4 py-3 text-navy">No real data ever collected</div>
            <div className="rounded-xl bg-blush/55 border border-white px-4 py-3 text-navy">Instant debrief on mistakes</div>
            <div className="rounded-xl bg-blush/55 border border-white px-4 py-3 text-navy">Progress tracking over time</div>
          </div>
        </Card>

        <div className="space-y-4">
          <PhilTip>
            Think of me as a reformed trickster. I know all the old scams because I used to
            use them — now I teach you how to spot them before they bite.
          </PhilTip>
          <Card className="bg-coral/10 border-coral/25">
            <h4 className="font-bold text-navy mb-2">Designed for real life</h4>
            <p className="text-navy/75 text-sm leading-relaxed">
              Drills arrive unexpectedly, just like real scams. That means your reactions get
              better where it matters: when you&apos;re busy, distracted, or in a rush.
            </p>
          </Card>
        </div>
      </section>

      <section className="mb-12">
        <h2 className="font-display text-3xl md:text-4xl font-black text-navy mb-5">
          Frequently asked questions
        </h2>
        <Accordion items={faqs} />
      </section>

      <div className="text-center">
        <Button href="/signup" size="lg" className="min-w-[220px]">
          Start Your Free Drills
        </Button>
      </div>
    </div>
  );
}
