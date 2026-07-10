"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useMockStore } from "@/lib/use-mock-store";
import { logout, updateLocalUser, type DrillFrequency } from "@/lib/mock-store";
import { ProtectedDashboardGate } from "@/components/dashboard/ProtectedDashboardGate";
import { useRedirectAdminFromDashboard } from "@/components/dashboard/useRedirectAdminFromDashboard";
import { ChangeEmailModal } from "@/components/dashboard/ChangeEmailModal";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { AlertTriangle, ArrowLeft, KeyRound, Mail, Settings, User } from "lucide-react";

const FREQUENCY_OPTIONS: { value: DrillFrequency; label: string }[] = [
  { value: "weekly", label: "Weekly" },
  { value: "fortnightly", label: "Fortnightly" },
  { value: "monthly", label: "Monthly" },
];

function formatJoined(value: string) {
  return new Date(value).toLocaleDateString("en-NZ", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export default function SettingsPage() {
  const store = useMockStore();
  const router = useRouter();
  const redirectingAdmin = useRedirectAdminFromDashboard();

  const [savingStatus, setSavingStatus] = useState(false);
  const [savingFrequency, setSavingFrequency] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  const [showEmailModal, setShowEmailModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [deletePassword, setDeletePassword] = useState("");
  const [deleteError, setDeleteError] = useState("");
  const [deleting, setDeleting] = useState(false);

  if (!store.user) return <ProtectedDashboardGate />;
  if (redirectingAdmin) {
    return (
      <div className="max-w-3xl mx-auto px-5 py-16 text-center text-navy/60">
        Redirecting to admin…
      </div>
    );
  }

  const user = store.user;

  async function saveSettings(patch: { trainingActive?: boolean; frequency?: DrillFrequency }) {
    setError("");
    setNotice("");
    try {
      const res = await fetch("/api/account/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      const payload = (await res.json()) as {
        error?: string;
        user?: { frequency: DrillFrequency; trainingActive: boolean };
      };
      if (!res.ok || !payload.user) {
        setError(payload.error ?? "Could not save your settings.");
        return false;
      }
      updateLocalUser({
        frequency: payload.user.frequency,
        trainingActive: payload.user.trainingActive,
      });
      return true;
    } catch {
      setError("Could not save your settings.");
      return false;
    }
  }

  async function toggleTraining() {
    setSavingStatus(true);
    const ok = await saveSettings({ trainingActive: !user.trainingActive });
    if (ok) {
      setNotice(user.trainingActive ? "Training paused." : "Training resumed.");
    }
    setSavingStatus(false);
  }

  async function changeFrequency(frequency: DrillFrequency) {
    if (frequency === user.frequency) return;
    setSavingFrequency(true);
    const ok = await saveSettings({ frequency });
    if (ok) setNotice("Training frequency updated.");
    setSavingFrequency(false);
  }

  function closeDeleteModal() {
    if (deleting) return;
    setShowDeleteModal(false);
    setDeleteConfirmText("");
    setDeletePassword("");
    setDeleteError("");
  }

  async function deleteAccount() {
    setDeleting(true);
    setDeleteError("");
    try {
      const res = await fetch("/api/account/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: deletePassword }),
      });
      const payload = (await res.json()) as { error?: string; ok?: boolean };
      if (!res.ok || !payload.ok) {
        setDeleteError(payload.error ?? "Could not delete your account.");
        return;
      }
      logout();
      router.push("/");
    } catch {
      setDeleteError("Could not delete your account.");
    } finally {
      setDeleting(false);
    }
  }

  const deleteEnabled = deleteConfirmText.trim() === "DELETE" && deletePassword.length > 0;

  return (
    <div className="max-w-3xl mx-auto px-5 md:px-10 py-12">
      <Link
        href="/dashboard"
        className="inline-flex items-center gap-2 text-sm font-bold text-navy/60 hover:text-orange mb-6"
      >
        <ArrowLeft size={16} /> Back to dashboard
      </Link>

      <div className="flex items-center gap-3 mb-2">
        <Settings className="w-6 h-6 text-orange" />
        <h1 className="font-display text-3xl font-black text-navy">
          Account &amp; Training Settings
        </h1>
      </div>
      <p className="text-navy/60 mb-8">
        Manage your account and control how Don&apos;t Bite trains you.
      </p>

      {notice && (
        <p className="mb-4 rounded-xl bg-mint/30 border border-mint/60 px-4 py-2.5 text-sm font-bold text-navy">
          {notice}
        </p>
      )}
      {error && (
        <p className="mb-4 rounded-xl bg-coral/10 border border-coral/30 px-4 py-2.5 text-sm font-bold text-coral-dark">
          {error}
        </p>
      )}

      {/* Training settings */}
      <Card className="mb-6">
        <h2 className="font-bold text-xl text-navy mb-5">Training settings</h2>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-5 border-b border-navy/10">
          <div>
            <p className="font-bold text-navy">Training status</p>
            <p className="text-sm text-navy/60 mt-0.5 max-w-md">
              Pausing training stops new drills from being sent. Your account and training
              history will remain available.
            </p>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <span
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-extrabold uppercase tracking-wide ${
                user.trainingActive ? "bg-mint/50 text-navy" : "bg-gold/30 text-navy"
              }`}
            >
              {user.trainingActive ? "Active" : "Paused"}
            </span>
            <Button variant="ghost" size="sm" onClick={toggleTraining} disabled={savingStatus}>
              {savingStatus
                ? "Saving..."
                : user.trainingActive
                  ? "Pause Training"
                  : "Resume Training"}
            </Button>
          </div>
        </div>

        <div className="py-5 border-b border-navy/10">
          <p className="font-bold text-navy mb-1">Training frequency</p>
          <p className="text-sm text-navy/60 mb-3 max-w-md">
            This controls how often Don&apos;t Bite sends you training drills. Delivery times
            will vary so you won&apos;t know exactly when a drill is coming.
          </p>
          <div className="flex flex-wrap gap-2">
            {FREQUENCY_OPTIONS.map((option) => {
              const selected = user.frequency === option.value;
              return (
                <button
                  key={option.value}
                  type="button"
                  disabled={savingFrequency}
                  onClick={() => changeFrequency(option.value)}
                  className={`rounded-full px-5 py-2 text-sm font-extrabold transition-all cursor-pointer disabled:opacity-50 ${
                    selected
                      ? "bg-navy text-white shadow-lg shadow-navy/15"
                      : "bg-white text-navy border-2 border-navy/10 hover:border-navy/25"
                  }`}
                >
                  {option.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="pt-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <p className="font-bold text-navy">Send me a test drill</p>
            <p className="text-sm text-navy/60 mt-0.5 max-w-md">
              Trigger a one-off practice drill to see how training works. Available once the
              drill delivery system launches.
            </p>
          </div>
          <Button variant="ghost" size="sm" disabled className="shrink-0">
            Coming soon
          </Button>
        </div>
      </Card>

      {/* Account settings */}
      <Card className="mb-6">
        <h2 className="font-bold text-xl text-navy mb-5">Account settings</h2>

        <dl className="space-y-4 pb-5 border-b border-navy/10">
          <div className="flex items-center gap-3">
            <User className="w-4 h-4 text-navy/40 shrink-0" />
            <div>
              <dt className="text-xs font-extrabold uppercase tracking-wide text-navy/50">Name</dt>
              <dd className="text-navy font-bold">{user.name}</dd>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <Mail className="w-4 h-4 text-navy/40 shrink-0" />
              <div>
                <dt className="text-xs font-extrabold uppercase tracking-wide text-navy/50">
                  Email address
                </dt>
                <dd className="text-navy font-bold">{user.email}</dd>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="shrink-0"
              onClick={() => setShowEmailModal(true)}
            >
              Change Email
            </Button>
          </div>
          <div className="flex items-center gap-3">
            <KeyRound className="w-4 h-4 text-navy/40 shrink-0" />
            <div>
              <dt className="text-xs font-extrabold uppercase tracking-wide text-navy/50">
                Member since
              </dt>
              <dd className="text-navy font-bold">{formatJoined(user.joinedAt)}</dd>
            </div>
          </div>
        </dl>

        <div className="pt-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <p className="font-bold text-navy">Password</p>
            <p className="text-sm text-navy/60 mt-0.5">
              Change the password you use to log in to Don&apos;t Bite.
            </p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            href={`/change-password?email=${encodeURIComponent(user.email)}`}
            className="shrink-0"
          >
            Change Password
          </Button>
        </div>
      </Card>

      {/* Danger zone */}
      <Card className="border-coral/30 bg-coral/[0.04]">
        <div className="flex items-center gap-2 mb-3">
          <AlertTriangle className="w-5 h-5 text-coral" />
          <h2 className="font-bold text-xl text-navy">Danger zone</h2>
        </div>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <p className="font-bold text-navy">Delete account</p>
            <p className="text-sm text-navy/60 mt-0.5 max-w-md">
              Permanently delete your Don&apos;t Bite account and associated training data.
            </p>
          </div>
          <Button
            variant="coral"
            size="sm"
            className="shrink-0"
            onClick={() => setShowDeleteModal(true)}
          >
            Delete Account
          </Button>
        </div>
      </Card>

      {/* Change email modal */}
      {showEmailModal && <ChangeEmailModal onClose={() => setShowEmailModal(false)} />}

      {/* Delete confirmation modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <button
            type="button"
            className="absolute inset-0 bg-navy/40"
            aria-label="Cancel account deletion"
            onClick={closeDeleteModal}
          />
          <div className="relative w-full max-w-md rounded-2xl bg-white border border-navy/10 shadow-2xl p-6">
            <h3 className="font-display text-xl font-black text-navy mb-2">
              Delete your account?
            </h3>
            <p className="text-sm text-navy/70 mb-4">
              This permanently deletes the account for{" "}
              <strong className="text-navy">{user.email}</strong> and its associated training
              data. This cannot be undone.
            </p>

            <label htmlFor="delete-confirm" className="block text-sm font-bold text-navy mb-1">
              Type <span className="font-mono text-coral">DELETE</span> to confirm
            </label>
            <input
              id="delete-confirm"
              type="text"
              value={deleteConfirmText}
              onChange={(e) => setDeleteConfirmText(e.target.value)}
              autoComplete="off"
              className="w-full rounded-xl border border-navy/15 px-4 py-2.5 text-navy mb-3 focus:outline-none focus:ring-2 focus:ring-coral/40"
            />

            <label htmlFor="delete-password" className="block text-sm font-bold text-navy mb-1">
              Your password
            </label>
            <input
              id="delete-password"
              type="password"
              value={deletePassword}
              onChange={(e) => setDeletePassword(e.target.value)}
              className="w-full rounded-xl border border-navy/15 px-4 py-2.5 text-navy mb-3 focus:outline-none focus:ring-2 focus:ring-coral/40"
            />

            {deleteError && (
              <p className="text-coral text-sm font-bold mb-3">{deleteError}</p>
            )}

            <div className="flex gap-2 justify-end">
              <Button variant="ghost" size="sm" disabled={deleting} onClick={closeDeleteModal}>
                Cancel
              </Button>
              <Button
                variant="coral"
                size="sm"
                disabled={!deleteEnabled || deleting}
                onClick={deleteAccount}
              >
                {deleting ? "Deleting..." : "Permanently Delete"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
