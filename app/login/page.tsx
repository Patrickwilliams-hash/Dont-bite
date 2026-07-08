"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { setLocalUserSession, type DrillFrequency } from "@/lib/mock-store";
import { PhilMascot } from "@/components/phil/PhilMascot";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password }),
      });

      const payload = (await res.json()) as {
        error?: string;
        user?: { name: string; email: string; frequency: DrillFrequency; joinedAt: string };
        mustChangePassword?: boolean;
      };

      if (!res.ok || !payload.user) {
        setError(payload.error ?? "No account found with that email. Sign up first!");
        return;
      }

      setLocalUserSession(payload.user);
      if (payload.mustChangePassword) {
        router.push(`/change-password?email=${encodeURIComponent(payload.user.email)}`);
        return;
      }
      router.push("/dashboard");
    } catch {
      setError("Could not log in. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-lg mx-auto px-5 py-16">
      <div className="text-center mb-8">
        <PhilMascot pose="cool" size={100} className="mx-auto mb-4" />
        <h1 className="font-display text-3xl font-black text-navy">Welcome back</h1>
      </div>

      <Card>
        <form onSubmit={handleSubmit} className="space-y-5">
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
          </div>
          <div>
            <label htmlFor="password" className="block text-sm font-bold text-navy mb-1">
              Password
            </label>
            <input
              id="password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-xl border border-navy/15 px-4 py-3 text-navy focus:outline-none focus:ring-2 focus:ring-orange/50"
              placeholder="Your password"
            />
          </div>
          {error && <p className="text-coral text-sm font-bold">{error}</p>}
          <Button type="submit" size="lg" className="w-full">
            {loading ? "Logging in..." : "Log In"}
          </Button>
        </form>
      </Card>

      <div className="text-center text-sm text-navy/60 mt-6 space-y-2">
        <p>
          No account?{" "}
          <Link href="/signup" className="font-bold text-orange hover:underline">
            Sign up free
          </Link>
        </p>
        <p>
          <Link href="/forgot-password" className="font-bold text-orange hover:underline">
            Forgot password?
          </Link>
        </p>
      </div>
    </div>
  );
}
