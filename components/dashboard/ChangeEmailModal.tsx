"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { logout } from "@/lib/mock-store";
import { Button } from "@/components/ui/Button";

type Step = "loading" | "form" | "code" | "done";

interface PendingInfo {
  newEmail: string;
  expiresAt: string;
  resendAvailableAt: string;
}

interface ApiPayload {
  ok?: boolean;
  error?: string;
  message?: string;
  pending?: PendingInfo | null;
}

const GENERIC_ERROR = "Something went wrong. Please try again.";

export function ChangeEmailModal({ onClose }: { onClose: () => void }) {
  const router = useRouter();

  const [step, setStep] = useState<Step>("loading");
  const [pending, setPending] = useState<PendingInfo | null>(null);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [confirmEmail, setConfirmEmail] = useState("");
  const [code, setCode] = useState("");

  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [resendWait, setResendWait] = useState(0);

  const closedRef = useRef(false);

  const updateResendWait = useCallback((info: PendingInfo | null) => {
    if (!info) {
      setResendWait(0);
      return;
    }
    const wait = Math.max(0, Math.ceil((new Date(info.resendAvailableAt).getTime() - Date.now()) / 1000));
    setResendWait(wait);
  }, []);

  // Resume an in-flight request if one exists.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/account/email-change");
        const payload = (await res.json()) as ApiPayload;
        if (cancelled) return;
        if (res.ok && payload.pending) {
          setPending(payload.pending);
          updateResendWait(payload.pending);
          setStep("code");
        } else {
          setStep("form");
        }
      } catch {
        if (!cancelled) setStep("form");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [updateResendWait]);

  // Tick the resend cooldown.
  useEffect(() => {
    if (step !== "code" || resendWait <= 0) return;
    const timer = setInterval(() => {
      setResendWait((value) => (value > 0 ? value - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [step, resendWait]);

  function close() {
    if (busy || closedRef.current) return;
    closedRef.current = true;
    onClose();
  }

  async function startChange(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setNotice("");

    if (newEmail.trim().toLowerCase() !== confirmEmail.trim().toLowerCase()) {
      setError("Email addresses do not match.");
      return;
    }

    setBusy(true);
    try {
      const res = await fetch("/api/account/email-change", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newEmail, confirmEmail }),
      });
      const payload = (await res.json()) as ApiPayload;
      if (!res.ok || !payload.pending) {
        setError(payload.error ?? GENERIC_ERROR);
        return;
      }
      setPending(payload.pending);
      updateResendWait(payload.pending);
      setCurrentPassword("");
      setCode("");
      setNotice(payload.message ?? "");
      setStep("code");
    } catch {
      setError(GENERIC_ERROR);
    } finally {
      setBusy(false);
    }
  }

  async function verifyCode(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setNotice("");
    setBusy(true);
    try {
      const res = await fetch("/api/account/email-change/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: code.trim() }),
      });
      const payload = (await res.json()) as ApiPayload;
      if (!res.ok || !payload.ok) {
        setError(payload.error ?? GENERIC_ERROR);
        return;
      }
      setStep("done");
    } catch {
      setError(GENERIC_ERROR);
    } finally {
      setBusy(false);
    }
  }

  async function resendCode() {
    setError("");
    setNotice("");
    setBusy(true);
    try {
      const res = await fetch("/api/account/email-change/resend", { method: "POST" });
      const payload = (await res.json()) as ApiPayload;
      if (!res.ok) {
        setError(payload.error ?? GENERIC_ERROR);
        return;
      }
      if (payload.pending) {
        setPending(payload.pending);
        updateResendWait(payload.pending);
      }
      setCode("");
      setNotice(payload.message ?? "A new code has been sent.");
    } catch {
      setError(GENERIC_ERROR);
    } finally {
      setBusy(false);
    }
  }

  async function cancelChange() {
    setError("");
    setBusy(true);
    try {
      await fetch("/api/account/email-change/cancel", { method: "POST" });
    } catch {
      // Best effort; the request expires on its own regardless.
    } finally {
      setBusy(false);
      close();
    }
  }

  function goToLogin() {
    logout();
    router.push("/login");
  }

  const inputClass =
    "w-full rounded-xl border border-navy/15 px-4 py-2.5 text-navy focus:outline-none focus:ring-2 focus:ring-orange/50";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        className="absolute inset-0 bg-navy/40"
        aria-label="Close email change"
        onClick={step === "done" ? undefined : close}
      />
      <div className="relative w-full max-w-md rounded-2xl bg-white border border-navy/10 shadow-2xl p-6">
        {step === "loading" && <p className="text-sm text-navy/60 py-8 text-center">Loading…</p>}

        {step === "form" && (
          <form onSubmit={startChange}>
            <h3 className="font-display text-xl font-black text-navy mb-2">Change email address</h3>
            <p className="text-sm text-navy/70 mb-4">
              We&apos;ll send a six-digit verification code to your new address. Your login email
              won&apos;t change until you enter it.
            </p>

            <label htmlFor="ec-password" className="block text-sm font-bold text-navy mb-1">
              Current password
            </label>
            <input
              id="ec-password"
              type="password"
              required
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              autoComplete="current-password"
              className={`${inputClass} mb-3`}
            />

            <label htmlFor="ec-new-email" className="block text-sm font-bold text-navy mb-1">
              New email address
            </label>
            <input
              id="ec-new-email"
              type="email"
              required
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              autoComplete="email"
              className={`${inputClass} mb-3`}
            />

            <label htmlFor="ec-confirm-email" className="block text-sm font-bold text-navy mb-1">
              Confirm new email address
            </label>
            <input
              id="ec-confirm-email"
              type="email"
              required
              value={confirmEmail}
              onChange={(e) => setConfirmEmail(e.target.value)}
              autoComplete="email"
              className={`${inputClass} mb-3`}
            />

            {error && <p className="text-coral text-sm font-bold mb-3">{error}</p>}

            <div className="flex gap-2 justify-end">
              <Button variant="ghost" size="sm" type="button" disabled={busy} onClick={close}>
                Cancel
              </Button>
              <Button size="sm" type="submit" disabled={busy}>
                {busy ? "Sending code..." : "Send verification code"}
              </Button>
            </div>
          </form>
        )}

        {step === "code" && pending && (
          <form onSubmit={verifyCode}>
            <h3 className="font-display text-xl font-black text-navy mb-2">Enter verification code</h3>
            <p className="text-sm text-navy/70 mb-4">
              We sent a six-digit code to <strong className="text-navy">{pending.newEmail}</strong>.
              It expires 15 minutes after it was sent. Check your inbox and spam folder.
            </p>

            <label htmlFor="ec-code" className="block text-sm font-bold text-navy mb-1">
              Verification code
            </label>
            <input
              id="ec-code"
              type="text"
              inputMode="numeric"
              pattern="\d{6}"
              maxLength={6}
              required
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
              autoComplete="one-time-code"
              placeholder="123456"
              className={`${inputClass} mb-3 text-center text-2xl font-black tracking-[0.4em]`}
            />

            {notice && <p className="text-sm font-bold text-navy/70 mb-3">{notice}</p>}
            {error && <p className="text-coral text-sm font-bold mb-3">{error}</p>}

            <div className="flex flex-wrap items-center gap-2 justify-between">
              <button
                type="button"
                disabled={busy || resendWait > 0}
                onClick={resendCode}
                className="text-sm font-bold text-orange hover:underline disabled:opacity-50 disabled:no-underline cursor-pointer disabled:cursor-default"
              >
                {resendWait > 0 ? `Resend code (${resendWait}s)` : "Resend code"}
              </button>
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" type="button" disabled={busy} onClick={cancelChange}>
                  Cancel change
                </Button>
                <Button size="sm" type="submit" disabled={busy || code.length !== 6}>
                  {busy ? "Verifying..." : "Verify"}
                </Button>
              </div>
            </div>
          </form>
        )}

        {step === "done" && (
          <div>
            <h3 className="font-display text-xl font-black text-navy mb-2">Email address changed</h3>
            <p className="text-sm text-navy/70 mb-2">
              Your account email has been updated successfully.
            </p>
            <p className="text-sm text-navy/70 mb-4">
              For your security, you&apos;ve been signed out on all devices. Log in again with your
              new email address and your existing password.
            </p>
            <div className="flex justify-end">
              <Button size="sm" onClick={goToLogin}>
                Go to log in
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
