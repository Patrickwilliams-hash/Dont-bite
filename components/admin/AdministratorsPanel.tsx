"use client";

import { useEffect, useState } from "react";
import { Badge, Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

export interface AdministratorRecord {
  id: string;
  name: string;
  email: string;
  role: "admin";
  isActive: boolean;
  joinedAt: string;
  createdAt: string;
  lastLoginAt: string | null;
}

interface TrainingUserOption {
  id: string;
  name: string;
  email: string;
}

interface AdministratorsPanelProps {
  trainingUsers: TrainingUserOption[];
  onNotice: (message: string) => void;
  onError: (message: string) => void;
  onChanged?: () => void;
}

function formatDateTime(value: string | null) {
  if (!value) return "Never";
  return new Date(value).toLocaleString("en-NZ", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("en-NZ", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function AdministratorsPanel({
  trainingUsers,
  onNotice,
  onError,
  onChanged,
}: AdministratorsPanelProps) {
  const [administrators, setAdministrators] = useState<AdministratorRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [promoteUserId, setPromoteUserId] = useState("");
  const [promoting, setPromoting] = useState(false);
  const [confirmAction, setConfirmAction] = useState<{
    admin: AdministratorRecord;
    action: "demote" | "disable" | "reactivate";
  } | null>(null);
  const [confirmPromoteUser, setConfirmPromoteUser] = useState<TrainingUserOption | null>(null);
  const [acting, setActing] = useState(false);

  async function loadAdministrators() {
    setLoading(true);
    onError("");
    try {
      const res = await fetch("/api/admin/administrators");
      const payload = (await res.json()) as {
        error?: string;
        administrators?: AdministratorRecord[];
      };
      if (!res.ok || !payload.administrators) {
        onError(payload.error ?? "Could not load administrators.");
        return;
      }
      setAdministrators(payload.administrators);
    } catch {
      onError("Could not load administrators.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadAdministrators();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function createAdministrator(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    onError("");
    onNotice("");
    try {
      const res = await fetch("/api/admin/administrators", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email }),
      });
      const payload = (await res.json()) as {
        error?: string;
        administrator?: AdministratorRecord;
        tempPassword?: string;
      };
      if (!res.ok || !payload.administrator || !payload.tempPassword) {
        onError(payload.error ?? "Failed to create administrator.");
        return;
      }
      setName("");
      setEmail("");
      onNotice(
        `Administrator ${payload.administrator.email} created. Temporary password (shown once): ${payload.tempPassword}`
      );
      await loadAdministrators();
      onChanged?.();
    } catch {
      onError("Failed to create administrator.");
    } finally {
      setCreating(false);
    }
  }

  async function promoteUser(user: TrainingUserOption) {
    setPromoting(true);
    onError("");
    onNotice("");
    try {
      const res = await fetch("/api/admin/administrators/promote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.id }),
      });
      const payload = (await res.json()) as { error?: string };
      if (!res.ok) {
        onError(payload.error ?? "Failed to promote user.");
        return;
      }
      onNotice(`${user.email} is now an administrator and will no longer be treated as a training user.`);
      setPromoteUserId("");
      setConfirmPromoteUser(null);
      await loadAdministrators();
      onChanged?.();
    } catch {
      onError("Failed to promote user.");
    } finally {
      setPromoting(false);
    }
  }

  async function applyAdminAction() {
    if (!confirmAction) return;
    setActing(true);
    onError("");
    onNotice("");
    const { admin, action } = confirmAction;
    const body =
      action === "demote"
        ? { role: "user" as const }
        : { isActive: action === "reactivate" };

    try {
      const res = await fetch(`/api/admin/administrators/${admin.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const payload = (await res.json()) as { error?: string };
      if (!res.ok) {
        onError(payload.error ?? "Failed to update administrator.");
        return;
      }
      if (action === "demote") {
        onNotice(
          `${admin.email} is now a normal user account. Training remains off until they enable it in settings.`
        );
      } else if (action === "disable") {
        onNotice(`${admin.email} has been disabled.`);
      } else {
        onNotice(`${admin.email} has been reactivated.`);
      }
      setConfirmAction(null);
      await loadAdministrators();
      onChanged?.();
    } catch {
      onError("Failed to update administrator.");
    } finally {
      setActing(false);
    }
  }

  const selectedPromoteUser = trainingUsers.find((user) => user.id === promoteUserId) ?? null;

  return (
    <div className="space-y-4">
      <Card className="!p-4">
        <h2 className="font-bold text-lg text-navy mb-3">Create administrator</h2>
        <form onSubmit={createAdministrator} className="grid md:grid-cols-3 gap-3 items-end">
          <div>
            <label htmlFor="admin-name" className="block text-xs font-bold text-navy/60 mb-1">
              Name
            </label>
            <input
              id="admin-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full rounded-lg border border-navy/15 px-3 py-2 text-sm text-navy focus:outline-none focus:ring-2 focus:ring-orange/40"
            />
          </div>
          <div>
            <label htmlFor="admin-email" className="block text-xs font-bold text-navy/60 mb-1">
              Email
            </label>
            <input
              id="admin-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full rounded-lg border border-navy/15 px-3 py-2 text-sm text-navy focus:outline-none focus:ring-2 focus:ring-orange/40"
            />
          </div>
          <Button type="submit" size="sm" className="!rounded-lg" disabled={creating}>
            {creating ? "Creating…" : "Create administrator"}
          </Button>
        </form>
        <p className="text-xs text-navy/55 mt-2">
          A temporary password is generated once and must be changed on first login.
        </p>
      </Card>

      <Card className="!p-4">
        <h2 className="font-bold text-lg text-navy mb-3">Promote training user</h2>
        <div className="flex flex-col sm:flex-row gap-2 sm:items-end">
          <div className="flex-1">
            <label htmlFor="promote-user" className="block text-xs font-bold text-navy/60 mb-1">
              Select user
            </label>
            <select
              id="promote-user"
              value={promoteUserId}
              onChange={(e) => setPromoteUserId(e.target.value)}
              className="w-full rounded-lg border border-navy/15 px-3 py-2 text-sm text-navy focus:outline-none focus:ring-2 focus:ring-orange/40"
            >
              <option value="">Choose a training user…</option>
              {trainingUsers.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.name} ({user.email})
                </option>
              ))}
            </select>
          </div>
          <Button
            size="sm"
            className="!rounded-lg"
            disabled={!selectedPromoteUser || promoting}
            onClick={() => selectedPromoteUser && setConfirmPromoteUser(selectedPromoteUser)}
          >
            Promote to administrator
          </Button>
        </div>
      </Card>

      <Card className="!p-4 overflow-hidden">
        <h2 className="font-bold text-lg text-navy mb-4">Administrators</h2>
        {loading ? (
          <p className="text-sm text-navy/60">Loading administrators…</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-sm">
              <thead>
                <tr className="border-b border-navy/10 text-left text-navy/60">
                  <th className="py-2 pr-3 font-bold">Name</th>
                  <th className="py-2 pr-3 font-bold">Email</th>
                  <th className="py-2 pr-3 font-bold">Status</th>
                  <th className="py-2 pr-3 font-bold">Joined</th>
                  <th className="py-2 pr-3 font-bold">Last login</th>
                  <th className="py-2 pr-3 font-bold">Role</th>
                  <th className="py-2 pr-0 font-bold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {administrators.map((admin) => (
                  <tr key={admin.id} className="border-b border-navy/5 hover:bg-blush/20">
                    <td className="py-2.5 pr-3 font-bold text-navy">{admin.name}</td>
                    <td className="py-2.5 pr-3 text-navy/80">{admin.email}</td>
                    <td className="py-2.5 pr-3">
                      <Badge variant={admin.isActive ? "success" : "warning"}>
                        {admin.isActive ? "Active" : "Disabled"}
                      </Badge>
                    </td>
                    <td className="py-2.5 pr-3 text-navy/70 whitespace-nowrap">
                      {formatDate(admin.joinedAt)}
                    </td>
                    <td className="py-2.5 pr-3 text-navy/70 whitespace-nowrap">
                      {formatDateTime(admin.lastLoginAt)}
                    </td>
                    <td className="py-2.5 pr-3 text-navy/75 capitalize">{admin.role}</td>
                    <td className="py-2.5 pr-0">
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          className="text-xs font-bold text-navy hover:text-coral-dark"
                          onClick={() => setConfirmAction({ admin, action: "demote" })}
                        >
                          Remove admin rights
                        </button>
                        {admin.isActive ? (
                          <button
                            type="button"
                            className="text-xs font-bold text-coral hover:text-coral-dark"
                            onClick={() => setConfirmAction({ admin, action: "disable" })}
                          >
                            Disable
                          </button>
                        ) : (
                          <button
                            type="button"
                            className="text-xs font-bold text-navy hover:text-coral-dark"
                            onClick={() => setConfirmAction({ admin, action: "reactivate" })}
                          >
                            Reactivate
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {administrators.length === 0 && (
              <p className="text-center text-navy/50 py-8 text-sm">No administrators found.</p>
            )}
          </div>
        )}
      </Card>

      {confirmPromoteUser && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <button
            type="button"
            className="absolute inset-0 bg-navy/40"
            aria-label="Cancel promote"
            onClick={() => !promoting && setConfirmPromoteUser(null)}
          />
          <div className="relative w-full max-w-md rounded-2xl bg-white border border-navy/10 shadow-2xl p-5">
            <h3 className="font-display text-xl font-black text-navy mb-2">
              Promote to administrator?
            </h3>
            <p className="text-sm text-navy/70 mb-4">
              <strong className="text-navy">{confirmPromoteUser.email}</strong> will gain admin
              access and will stop behaving as a normal training account (no drills, excluded from
              training user metrics).
            </p>
            <div className="flex gap-2 justify-end">
              <Button
                size="sm"
                variant="ghost"
                className="!rounded-lg"
                disabled={promoting}
                onClick={() => setConfirmPromoteUser(null)}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                className="!rounded-lg"
                disabled={promoting}
                onClick={() => promoteUser(confirmPromoteUser)}
              >
                {promoting ? "Promoting…" : "Confirm promotion"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {confirmAction && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <button
            type="button"
            className="absolute inset-0 bg-navy/40"
            aria-label="Cancel action"
            onClick={() => !acting && setConfirmAction(null)}
          />
          <div className="relative w-full max-w-md rounded-2xl bg-white border border-navy/10 shadow-2xl p-5">
            <h3 className="font-display text-xl font-black text-navy mb-2">
              {confirmAction.action === "demote" && "Remove administrator rights?"}
              {confirmAction.action === "disable" && "Disable administrator?"}
              {confirmAction.action === "reactivate" && "Reactivate administrator?"}
            </h3>
            <p className="text-sm text-navy/70 mb-4">
              {confirmAction.action === "demote" &&
                `${confirmAction.admin.email} will return to a normal user account. Training will stay off until they enable it deliberately in settings.`}
              {confirmAction.action === "disable" &&
                `${confirmAction.admin.email} will be unable to sign in and existing sessions will be revoked.`}
              {confirmAction.action === "reactivate" &&
                `${confirmAction.admin.email} will be able to sign in again.`}
            </p>
            <div className="flex gap-2 justify-end">
              <Button
                size="sm"
                variant="ghost"
                className="!rounded-lg"
                disabled={acting}
                onClick={() => setConfirmAction(null)}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                variant={confirmAction.action === "disable" ? "coral" : "primary"}
                className="!rounded-lg"
                disabled={acting}
                onClick={applyAdminAction}
              >
                {acting ? "Saving…" : "Confirm"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
