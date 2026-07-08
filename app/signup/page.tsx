"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { setLocalUserSession, type DrillFrequency } from "@/lib/mock-store";
import { PhilMascot } from "@/components/phil/PhilMascot";
import { BrandName } from "@/components/brand/BrandName";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";

export default function SignUpPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [frequency, setFrequency] = useState<DrillFrequency>("weekly");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !email.trim()) return;

    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          password,
          frequency,
        }),
      });

      const payload = (await res.json()) as {
        error?: string;
        user?: { name: string; email: string; frequency: DrillFrequency; joinedAt: string };
      };

      if (!res.ok || !payload.user) {
        setError(payload.error ?? "Could not create account.");
        return;
      }

      setLocalUserSession(payload.user);
      router.push("/dashboard");
    } catch {
      setError("Could not create account. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-lg mx-auto px-5 py-16">
      <div className="text-center mb-8">
        <PhilMascot pose="intro" size={140} className="mx-auto mb-4" />
        <h1 className="font-display text-3xl font-black text-navy flex flex-wrap items-baseline justify-center gap-x-2">
          Join <BrandName size="lg" />
        </h1>
        <p className="text-navy/60 mt-2">Start your free scam-awareness drills</p>
      </div>

      <div className="rounded-xl bg-gold/15 border border-gold/30 p-4 text-sm text-navy/80 mb-6 text-center">
        We&apos;ll send simulated scam emails to your inbox for you to spot. It&apos;s a safe
        training service — we never send real phishing or collect sensitive data.
      </div>

      <Card>
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label htmlFor="name" className="block text-sm font-bold text-navy mb-1">
              Your name
            </label>
            <input
              id="name"
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-xl border border-navy/15 px-4 py-3 text-navy focus:outline-none focus:ring-2 focus:ring-orange/50"
            />
          </div>
          <div>
            <label htmlFor="email" className="block text-sm font-bold text-navy mb-1">
              Email address
            </label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-xl border border-navy/15 px-4 py-3 text-navy focus:outline-none focus:ring-2 focus:ring-orange/50"
              placeholder="you@example.com"
            />
            <p className="text-xs text-navy/50 mt-1">This is where your practice drills arrive.</p>
          </div>
          <div>
            <label htmlFor="password" className="block text-sm font-bold text-navy mb-1">
              Password
            </label>
            <input
              id="password"
              type="password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-xl border border-navy/15 px-4 py-3 text-navy focus:outline-none focus:ring-2 focus:ring-orange/50"
              placeholder="At least 8 characters"
            />
          </div>
          <div>
            <label htmlFor="frequency" className="block text-sm font-bold text-navy mb-1">
              Drill frequency
            </label>
            <select
              id="frequency"
              value={frequency}
              onChange={(e) => setFrequency(e.target.value as DrillFrequency)}
              className="w-full rounded-xl border border-navy/15 px-4 py-3 text-navy focus:outline-none focus:ring-2 focus:ring-orange/50 bg-white"
            >
              <option value="weekly">Weekly</option>
              <option value="fortnightly">Fortnightly</option>
              <option value="monthly">Monthly</option>
            </select>
          </div>
          <Button type="submit" size="lg" className="w-full">
            {loading ? "Creating account..." : "Create Free Account"}
          </Button>
          {error && <p className="text-coral text-sm font-bold">{error}</p>}
        </form>
      </Card>

      <p className="text-center text-sm text-navy/60 mt-6">
        Already signed up?{" "}
        <Link href="/login" className="font-bold text-orange hover:underline">
          Log in
        </Link>
      </p>
    </div>
  );
}
