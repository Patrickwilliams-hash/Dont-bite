"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [completed, setCompleted] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!token) {
      setError("This reset link is invalid or has expired.");
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
        setError(payload.error ?? "This reset link is invalid or has expired.");
        return;
      }
      setCompleted(true);
    } catch {
      setError("Could not reset password. Please try again later.");
    } finally {
      setLoading(false);
    }
  }

  if (!token) {
    return (
      <div className="max-w-lg mx-auto px-5 py-16">
        <h1 className="font-display text-3xl font-black text-navy mb-2">Reset password</h1>
        <Card>
          <p className="text-navy text-sm font-bold mb-4">
            This reset link is invalid or has expired.
          </p>
          <p className="text-sm text-navy/65 mb-4">
            Request a new link from the forgot password page. Links expire after 30 minutes and can
            only be used once.
          </p>
          <Link href="/forgot-password" className="text-sm font-bold text-orange hover:underline">
            Request a new reset link
          </Link>
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

  return (
    <div className="max-w-lg mx-auto px-5 py-16">
      <h1 className="font-display text-3xl font-black text-navy mb-2">Reset password</h1>
      <p className="text-navy/60 mb-6">Choose a new password for your account.</p>

      <Card>
        {completed ? (
          <div className="space-y-4">
            <p className="text-navy text-sm font-bold">
              Your password has been updated successfully.
            </p>
            <p className="text-sm text-navy/65">
              For your security, you&apos;ve been signed out everywhere. Log in again with your new
              password.
            </p>
            <Link href="/login" className="inline-flex text-sm font-bold text-orange hover:underline">
              Go to log in
            </Link>
          </div>
        ) : (
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
                autoComplete="new-password"
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
                autoComplete="new-password"
              />
            </div>
            {error && <p className="text-coral text-sm font-bold">{error}</p>}
            <Button type="submit" size="lg" className="w-full" disabled={loading}>
              {loading ? "Updating password..." : "Update password"}
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

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div className="max-w-lg mx-auto px-5 py-16 text-navy/60">Loading...</div>}>
      <ResetPasswordForm />
    </Suspense>
  );
}
