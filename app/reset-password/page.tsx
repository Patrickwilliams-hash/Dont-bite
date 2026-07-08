"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

export default function ResetPasswordPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!token) {
      setError("Missing reset token.");
      return;
    }
    if (newPassword.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, newPassword }),
      });
      const payload = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(payload.error ?? "Could not reset password.");
        return;
      }
      router.push("/login");
    } catch {
      setError("Could not reset password.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-lg mx-auto px-5 py-16">
      <h1 className="font-display text-3xl font-black text-navy mb-2">Reset password</h1>
      <p className="text-navy/60 mb-6">Set a new password for your account.</p>

      <Card>
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label htmlFor="newPassword" className="block text-sm font-bold text-navy mb-1">
              New password
            </label>
            <input
              id="newPassword"
              type="password"
              required
              minLength={8}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full rounded-xl border border-navy/15 px-4 py-3 text-navy focus:outline-none focus:ring-2 focus:ring-orange/50"
              placeholder="At least 8 characters"
            />
          </div>
          <div>
            <label htmlFor="confirmPassword" className="block text-sm font-bold text-navy mb-1">
              Confirm new password
            </label>
            <input
              id="confirmPassword"
              type="password"
              required
              minLength={8}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full rounded-xl border border-navy/15 px-4 py-3 text-navy focus:outline-none focus:ring-2 focus:ring-orange/50"
              placeholder="Repeat password"
            />
          </div>
          {error && <p className="text-coral text-sm font-bold">{error}</p>}
          <Button type="submit" size="lg" className="w-full">
            {loading ? "Resetting..." : "Reset password"}
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
