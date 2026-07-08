"use client";

import { useEffect, useState } from "react";
import { Card, StatCard, Badge } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

interface AdminUser {
  id: string;
  name: string;
  email: string;
  frequency: "weekly" | "fortnightly" | "monthly";
  role: "user" | "admin";
  isActive: boolean;
  joinedAt: string;
  createdAt: string;
  lastLoginAt: string | null;
}

interface AdminStats {
  totalUsers: number;
  activeUsers: number;
  weeklyUsers: number;
  fortnightlyUsers: number;
  monthlyUsers: number;
  usersLoggedIn: number;
}

export default function AdminPage() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  async function loadOverview() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/admin/overview");
      const payload = (await res.json()) as {
        error?: string;
        users?: AdminUser[];
        stats?: AdminStats;
      };
      if (!res.ok || !payload.users || !payload.stats) {
        setError(payload.error ?? "Could not load admin data.");
        return;
      }
      setUsers(payload.users);
      setStats(payload.stats);
    } catch {
      setError("Could not load admin data.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadOverview();
  }, []);

  async function deleteUser(id: string) {
    if (!window.confirm("Delete this user? This cannot be undone.")) return;
    const res = await fetch(`/api/admin/users/${id}`, { method: "DELETE" });
    const payload = (await res.json()) as { error?: string };
    if (!res.ok) {
      setError(payload.error ?? "Failed to delete user.");
      return;
    }
    setNotice("User deleted.");
    loadOverview();
  }

  async function resetPassword(id: string) {
    const res = await fetch(`/api/admin/users/${id}/reset-password`, { method: "POST" });
    const payload = (await res.json()) as { error?: string; tempPassword?: string };
    if (!res.ok || !payload.tempPassword) {
      setError(payload.error ?? "Failed to reset password.");
      return;
    }
    setNotice(`Temporary password: ${payload.tempPassword}`);
  }

  return (
    <div className="max-w-6xl mx-auto px-5 md:px-10 py-12">
      <p className="text-sm font-black uppercase tracking-widest text-coral mb-2">Admin</p>
      <h1 className="font-display text-4xl md:text-5xl font-black text-navy mb-3">
        Platform administration
      </h1>
      <p className="text-navy/65 mb-8">
        Manage registrations, reset passwords, and monitor adoption.
      </p>

      {notice && <p className="mb-4 text-sm font-bold text-navy">{notice}</p>}
      {error && <p className="mb-4 text-sm font-bold text-coral">{error}</p>}

      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-6 gap-3 mb-8">
          <StatCard label="Users" value={stats.totalUsers} />
          <StatCard label="Active" value={stats.activeUsers} />
          <StatCard label="Logged In" value={stats.usersLoggedIn} />
          <StatCard label="Weekly" value={stats.weeklyUsers} />
          <StatCard label="Fortnightly" value={stats.fortnightlyUsers} />
          <StatCard label="Monthly" value={stats.monthlyUsers} />
        </div>
      )}

      <Card className="overflow-x-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="font-bold text-xl text-navy">Registered users</h2>
          <Button size="sm" variant="ghost" onClick={loadOverview} disabled={loading}>
            {loading ? "Refreshing..." : "Refresh"}
          </Button>
        </div>
        <table className="w-full min-w-[980px] text-sm">
          <thead>
            <tr className="border-b border-navy/10 text-left text-navy/65">
              <th className="py-3 pr-4 font-bold">Name</th>
              <th className="py-3 pr-4 font-bold">Email</th>
              <th className="py-3 pr-4 font-bold">Frequency</th>
              <th className="py-3 pr-4 font-bold">Status</th>
              <th className="py-3 pr-4 font-bold">Last login</th>
              <th className="py-3 pr-4 font-bold">Joined</th>
              <th className="py-3 pr-4 font-bold">Actions</th>
              <th className="py-3 pr-0 font-bold">User ID</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id} className="border-b border-navy/5">
                <td className="py-3 pr-4 font-bold text-navy">{user.name}</td>
                <td className="py-3 pr-4 text-navy/80">{user.email}</td>
                <td className="py-3 pr-4 text-navy/80 capitalize">{user.frequency}</td>
                <td className="py-3 pr-4">
                  <Badge variant={user.isActive ? "success" : "warning"}>
                    {user.isActive ? "Active" : "Disabled"}
                  </Badge>
                </td>
                <td className="py-3 pr-4 text-navy/70">
                  {user.lastLoginAt
                    ? new Date(user.lastLoginAt).toLocaleString("en-NZ")
                    : "Never"}
                </td>
                <td className="py-3 pr-4 text-navy/70">
                  {new Date(user.joinedAt).toLocaleString("en-NZ")}
                </td>
                <td className="py-3 pr-4">
                  <div className="flex gap-2">
                    <button
                      type="button"
                      className="text-xs font-bold text-navy hover:text-coral-dark"
                      onClick={() => resetPassword(user.id)}
                    >
                      Reset password
                    </button>
                    <button
                      type="button"
                      className="text-xs font-bold text-coral hover:text-coral-dark"
                      onClick={() => deleteUser(user.id)}
                    >
                      Delete
                    </button>
                  </div>
                </td>
                <td className="py-3 pr-0 text-navy/50 font-mono text-xs">{user.id}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {users.length === 0 && !loading && (
          <p className="text-center text-navy/50 py-8">No registrations yet.</p>
        )}
      </Card>
    </div>
  );
}
