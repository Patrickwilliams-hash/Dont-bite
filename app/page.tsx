import { PhilMascot } from "@/components/phil/PhilMascot";
import { Button } from "@/components/ui/Button";
import { Card, IconCircle } from "@/components/ui/Card";
import {
  Mail,
  Target,
  BarChart3,
  Shield,
  Package,
  Building2,
  Gift,
  CreditCard,
  Play,
} from "lucide-react";

const immunityCards = [
  {
    icon: Mail,
    title: "Realistic Phishing Drills",
    body: "Practice emails that feel like the real thing — without the real risk.",
  },
  {
    icon: Target,
    title: "Instant Feedback",
    body: "Phil explains what nearly caught you the moment you take the bait.",
  },
  {
    icon: BarChart3,
    title: "Track Your Progress",
    body: "Monthly reports show where you're improving and what to watch for next.",
  },
  {
    icon: Shield,
    title: "Stronger Every Day",
    body: "Build scam-spotting habits that stick, one safe lesson at a time.",
  },
];

const scamTypes = [
  { icon: Package, title: "Delivery Scams", color: "bg-[#E8F4F8]" },
  { icon: Building2, title: "Bank Impersonation", color: "bg-[#E8EEF8]" },
  { icon: Gift, title: "Too Good To Be True", color: "bg-[#FFF0E8]" },
  { icon: CreditCard, title: "Subscription Traps", color: "bg-[#F0E8F8]" },
];

const howSteps = [
  "Sign up free",
  "Receive a drill",
  "Spot the red flags",
  "Learn from Phil",
  "Track monthly progress",
];

export default function HomePage() {
  return (
    <>
      {/* Hero */}
      <section className="hero-section">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/backgrounds/hero-coral-bg.png"
          alt=""
          aria-hidden
          className="hero-bg"
        />

        <div className="hero-inner">
          <div className="hero-copy">
            <h1>
              We teach you to spot it, <span>before</span> it bites.
            </h1>
            <p className="hero-lead">
              Don&apos;t Bite sends realistic scam-awareness practice so you can learn, improve, and
              outsmart scammers.
            </p>

            <div className="hero-cta-block">
              <div className="hero-actions">
                <Button href="/signup" size="md" className="!rounded-lg min-w-[180px]">
                  Get Started Free
                </Button>
                <Button href="/how-it-works" variant="ghost" size="md" className="!rounded-lg min-w-[180px] !bg-white/40 !border-navy/30">
                  <Play size={18} className="fill-navy/20" />
                  See How It Works
                </Button>
              </div>

              <div className="hero-trust" aria-label="Trust notes">
                <span>Easy sign up</span>
                <span>No personal data stored</span>
                <span>Cancel anytime</span>
              </div>
            </div>
          </div>

          <div className="hero-art" aria-hidden>
            <PhilMascot pose="sign" responsive className="hero-phil animate-float" />
          </div>
        </div>
      </section>

      {/* Build your immunity */}
      <section className="px-5 md:px-10 py-16 max-w-6xl mx-auto">
        <div className="text-center mb-10">
          <p className="section-eyebrow mb-2">Build your immunity</p>
          <h2 className="font-display text-4xl md:text-5xl font-black text-navy">
            A safer way to learn the hard lessons.
          </h2>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {immunityCards.map((card) => (
            <Card key={card.title} className="text-center">
              <IconCircle className="mx-auto mb-4">
                <card.icon className="w-7 h-7 text-coral-dark" />
              </IconCircle>
              <h3 className="font-extrabold text-navy mb-2">{card.title}</h3>
              <p className="text-muted text-sm leading-relaxed">{card.body}</p>
            </Card>
          ))}
        </div>
      </section>

      {/* Common scams we simulate */}
      <section className="mx-5 md:mx-10 mb-16 rounded-[2rem] bg-blush px-5 md:px-10 py-14 max-w-6xl lg:mx-auto">
        <div className="text-center mb-10">
          <p className="section-eyebrow mb-2">Stay ahead of scammers</p>
          <h2 className="font-display text-3xl md:text-4xl font-black text-navy">
            Common scams we simulate
          </h2>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {scamTypes.map((scam) => (
            <div
              key={scam.title}
              className="rounded-[1.5rem] bg-white/90 p-5 text-center shadow-[var(--shadow-soft)]"
            >
              <div
                className={`w-20 h-20 rounded-2xl ${scam.color} mx-auto mb-3 flex items-center justify-center`}
              >
                <scam.icon className="w-9 h-9 text-navy" strokeWidth={1.75} />
              </div>
              <p className="font-extrabold text-navy text-sm">{scam.title}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="mx-5 md:mx-10 mb-16 max-w-6xl lg:mx-auto">
        <div className="rounded-[2rem] bg-navy px-5 md:px-8 py-10 md:py-12 shadow-[var(--shadow-soft)]">
          <div className="text-center mb-10">
          <p className="section-eyebrow mb-2">Simple process</p>
            <h2 className="font-display text-3xl md:text-4xl font-black text-white">How it works</h2>
            <p className="text-white/75 text-sm md:text-base mt-2">
              Five quick steps. One safer brain.
            </p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 md:gap-4">
            {howSteps.map((step, i) => (
              <div
                key={step}
                className="rounded-2xl bg-white/95 border border-white/80 p-4 md:p-5 text-center min-h-[130px] flex flex-col items-center justify-start"
              >
                <div className="w-9 h-9 rounded-full bg-coral text-white font-black flex items-center justify-center text-sm mb-3">
                  {i + 1}
                </div>
                <p className="text-sm md:text-[0.95rem] font-extrabold text-navy leading-snug">{step}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Bottom CTA */}
      <section className="mx-5 md:mx-10 mb-20 max-w-6xl lg:mx-auto">
        <div className="rounded-[2rem] bg-coral px-6 md:px-10 py-8 flex flex-col md:flex-row items-center justify-between gap-6 shadow-[var(--shadow-soft)]">
          <div className="flex items-center gap-4">
            <PhilMascot pose="wave" size={88} onDark />
            <div className="text-white">
              <h2 className="font-display text-2xl md:text-3xl font-black">
                Ready to outsmart the scammers?
              </h2>
              <p className="text-white/85 mt-1 text-sm md:text-base">
                Join free. Get drilled. Get smarter.
              </p>
            </div>
          </div>
          <Button href="/signup" variant="navy" size="lg" className="shrink-0 bg-navy">
            Get Started Free
          </Button>
        </div>
      </section>
    </>
  );
}
