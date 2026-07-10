"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { logout, setLocalUserSession, type DrillFrequency } from "@/lib/mock-store";
import { PhilMascot } from "@/components/phil/PhilMascot";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";

type SessionState =
  | { status: "loading" }
  | { status: "guest" }
  | { status: "admin" }
  | { status: "user"; email: string };

function AdminLoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const accessDenied = searchParams.get("denied") === "1";
  const [sessionState, setSessionState] = useState<SessionState>({ status: "loading" });
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function checkSession() {
      try {
        const res = await fetch("/api/auth/session");
        if (!mounted) return;
        if (!res.ok) {
          setSessionState({ status: "guest" });
          return;
        }
        const payload = (await res.json()) as {
          user?: { role?: string; email?: string; name?: string; frequency?: DrillFrequency; joinedAt?: string; trainingActive?: boolean };
        };
        if (payload.user?.role === "admin") {
          router.replace("/admin");
          setSessionState({ status: "admin" });
          return;
        }
        if (payload.user?.email) {
          setSessionState({ status: "user", email: payload.user.email });
          return;
        }
        setSessionState({ status: "guest" });
      } catch {
        if (mounted) setSessionState({ status: "guest" });
      }
    }

    checkSession();
    return () => {
      mounted = false;
    };
  }, [router]);

  useEffect(() => {
    if (accessDenied && sessionState.status === "guest") {
      setError("Admin access is required to view that page.");
    }
  }, [accessDenied, sessionState.status]);

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    logout();
    setSessionState({ status: "guest" });
    setError("");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/admin-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password }),
      });

      const payload = (await res.json()) as {
        error?: string;
        user?: {
          name: string;
          email: string;
          frequency: DrillFrequency;
          joinedAt: string;
          trainingActive: boolean;
          role?: "user" | "admin";
        };
        mustChangePassword?: boolean;
      };

      if (!res.ok || !payload.user) {
        setError(payload.error ?? "Invalid email or password.");
        return;
      }

      setLocalUserSession(payload.user);
      if (payload.mustChangePassword) {
        router.push(`/change-password?email=${encodeURIComponent(payload.user.email)}`);
        return;
      }
      router.push("/admin");
    } catch {
      setError("Could not log in. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  if (sessionState.status === "loading" || sessionState.status === "admin") {
    return (
      <div className="max-w-lg mx-auto px-5 py-16 text-center text-navy/60">
        {sessionState.status === "admin" ? "Redirecting to admin…" : "Checking session…"}
      </div>
    );
  }

  if (sessionState.status === "user") {
    return (
      <div className="max-w-lg mx-auto px-5 py-16">
        <Card className="text-center">
          <h1 className="font-display text-2xl font-black text-navy mb-2">Admin access required</h1>
          <p className="text-navy/65 mb-6 leading-relaxed">
            The account <strong className="text-navy">{sessionState.email}</strong> does not have
            admin access.
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <Button href="/dashboard" size="sm">
              Go to dashboard
            </Button>
            <Button size="sm" variant="ghost" onClick={handleLogout}>
              Log out
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto px-5 py-16">
      <div className="text-center mb-8">
        <PhilMascot pose="cool" size={100} className="mx-auto mb-4" />
        <h1 className="font-display text-3xl font-black text-navy">Admin sign in</h1>
        <p className="text-sm text-navy/60 mt-2">Don&apos;t Bite control centre access only.</p>
      </div>

      <Card>
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label htmlFor="admin-email" className="block text-sm font-bold text-navy mb-1">
              Email address
            </label>
            <input
              id="admin-email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-xl border border-navy/15 px-4 py-3 text-navy focus:outline-none focus:ring-2 focus:ring-orange/50"
              placeholder="admin@example.com"
            />
          </div>
          <div>
            <label htmlFor="admin-password" className="block text-sm font-bold text-navy mb-1">
              Password
            </label>
            <input
              id="admin-password"
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
            {loading ? "Signing in..." : "Sign in to admin"}
          </Button>
        </form>
      </Card>

      <div className="text-center text-sm text-navy/60 mt-6 space-y-2">
        <p>
          <Link href="/" className="font-bold text-orange hover:underline">
            Back to home
          </Link>
        </p>
        <p>
          Training user?{" "}
          <Link href="/login" className="font-bold text-orange hover:underline">
            Log in to your dashboard
          </Link>
        </p>
      </div>
    </div>
  );
}

export default function AdminLoginPage() {
  return (
    <Suspense fallback={<div className="max-w-lg mx-auto px-5 py-16 text-center text-navy/60">Loading…</div>}>
      <AdminLoginForm />
    </Suspense>
  );
}
