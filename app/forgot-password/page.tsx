"use client";

import { useState } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [resetUrl, setResetUrl] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setMessage("");
    setResetUrl("");
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
        resetUrl?: string;
      };
      if (!res.ok) {
        setError(payload.error ?? "Could not process password reset.");
        return;
      }
      setMessage("If that account exists, a password reset link has been generated.");
      if (payload.resetUrl) setResetUrl(payload.resetUrl);
    } catch {
      setError("Could not process password reset.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-lg mx-auto px-5 py-16">
      <h1 className="font-display text-3xl font-black text-navy mb-2">Forgot password</h1>
      <p className="text-navy/60 mb-6">
        Enter your email and we&apos;ll generate a reset link.
      </p>

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

          {error && <p className="text-coral text-sm font-bold">{error}</p>}
          {message && <p className="text-navy text-sm font-bold">{message}</p>}
          {resetUrl && (
            <p className="text-sm text-navy/70">
              Dev reset link:{" "}
              <Link href={resetUrl} className="font-bold text-orange hover:underline">
                {resetUrl}
              </Link>
            </p>
          )}

          <Button type="submit" size="lg" className="w-full">
            {loading ? "Generating..." : "Generate reset link"}
          </Button>
        </form>
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
