"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { setLocalUserSession, type DrillFrequency } from "@/lib/mock-store";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

function ChangePasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const defaultEmail = searchParams.get("email") ?? "";

  const [email, setEmail] = useState(defaultEmail);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (newPassword.length < 8) {
      setError("New password must be at least 8 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("New passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim(),
          currentPassword,
          newPassword,
        }),
      });

      const payload = (await res.json()) as {
        error?: string;
        user?: { name: string; email: string; frequency: DrillFrequency; joinedAt: string };
      };

      if (!res.ok || !payload.user) {
        setError(payload.error ?? "Could not change password.");
        return;
      }

      setLocalUserSession(payload.user);
      router.push("/dashboard");
    } catch {
      setError("Could not change password.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-lg mx-auto px-5 py-16">
      <h1 className="font-display text-3xl font-black text-navy mb-2">Change your password</h1>
      <p className="text-navy/60 mb-6">
        Your password was reset by an admin. Please set a new one to continue.
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
            />
          </div>
          <div>
            <label htmlFor="currentPassword" className="block text-sm font-bold text-navy mb-1">
              Current password
            </label>
            <input
              id="currentPassword"
              type="password"
              required
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="w-full rounded-xl border border-navy/15 px-4 py-3 text-navy focus:outline-none focus:ring-2 focus:ring-orange/50"
            />
          </div>
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
            />
          </div>

          {error && <p className="text-coral text-sm font-bold">{error}</p>}
          <Button type="submit" size="lg" className="w-full">
            {loading ? "Updating..." : "Update password"}
          </Button>
        </form>
      </Card>
    </div>
  );
}

export default function ChangePasswordPage() {
  return (
    <Suspense fallback={<div className="max-w-lg mx-auto px-5 py-16 text-navy/60">Loading...</div>}>
      <ChangePasswordForm />
    </Suspense>
  );
}
