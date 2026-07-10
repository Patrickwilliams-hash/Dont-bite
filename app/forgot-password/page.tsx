"use client";

import { useState } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

const GENERIC_SUCCESS_MESSAGE =
  "If an account exists for that email address, we've sent password reset instructions.";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });
      const payload = (await res.json()) as {
        error?: string;
        ok?: boolean;
        message?: string;
      };
      if (!res.ok) {
        setError(payload.error ?? "We couldn't process your request right now. Please try again later.");
        return;
      }
      setSubmitted(true);
    } catch {
      setError("We couldn't process your request right now. Please try again later.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-lg mx-auto px-5 py-16">
      <h1 className="font-display text-3xl font-black text-navy mb-2">Forgot password</h1>
      <p className="text-navy/60 mb-6">
        Enter your email address and we&apos;ll send reset instructions if an account exists.
      </p>

      <Card>
        {submitted ? (
          <div className="space-y-4">
            <p className="text-navy text-sm font-bold leading-relaxed">{GENERIC_SUCCESS_MESSAGE}</p>
            <p className="text-sm text-navy/65">
              Check your inbox and spam folder. The link expires in 30 minutes.
            </p>
            <Link
              href="/login"
              className="inline-flex text-sm font-bold text-orange hover:underline"
            >
              Return to log in
            </Link>
          </div>
        ) : (
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
                autoComplete="email"
              />
            </div>

            {error && <p className="text-coral text-sm font-bold">{error}</p>}

            <Button type="submit" size="lg" className="w-full" disabled={loading}>
              {loading ? "Sending instructions..." : "Send reset instructions"}
            </Button>
          </form>
        )}
      </Card>

      <p className="text-center text-sm text-navy/60 mt-6">
        Back to{" "}
        <Link href="/login" className="font-bold text-orange hover:underline">
          log in
        </Link>
      </p>
    </div>
  );
}
