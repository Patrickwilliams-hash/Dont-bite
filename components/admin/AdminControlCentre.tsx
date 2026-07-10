"use client";

import { useEffect, useMemo, useState } from "react";
import {
  BarChart3,
  BookOpen,
  ClipboardList,
  LayoutDashboard,
  Mail,
  Search,
  Shield,
  ShieldCheck,
  Target,
  Users,
  X,
} from "lucide-react";
import { Card, Badge } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { AdministratorsPanel } from "@/components/admin/AdministratorsPanel";
import { AdminAccountMenu } from "@/components/admin/AdminAccountMenu";
import { ActivityLogPanel } from "@/components/admin/ActivityLogPanel";

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

interface AdminAccess {
  isSuperAdmin: boolean;
  canManageUsers: boolean;
  canManageAdmins: boolean;
  canViewAuditLog: boolean;
}

type AdminTab = "overview" | "users" | "administrators" | "activity" | "drills" | "templates" | "content";
type StatusFilter = "all" | "active" | "disabled";
type FrequencyFilter = "all" | "weekly" | "fortnightly" | "monthly";
type SortKey = "joined-desc" | "joined-asc" | "login-desc" | "login-asc" | "name-asc";

interface ActivityItem {
  id: string;
  label: string;
  detail: string;
  at: string;
}

const ADMIN_TABS: { id: AdminTab; label: string; icon: typeof LayoutDashboard; enabled: boolean }[] = [
  { id: "overview", label: "Overview", icon: LayoutDashboard, enabled: true },
  { id: "users", label: "Users", icon: Users, enabled: true },
  { id: "administrators", label: "Administrators", icon: ShieldCheck, enabled: true },
  { id: "activity", label: "Activity Log", icon: ClipboardList, enabled: true },
  { id: "drills", label: "Drills", icon: Target, enabled: false },
  { id: "templates", label: "Templates", icon: Mail, enabled: false },
  { id: "content", label: "Content", icon: BookOpen, enabled: false },
];

const COMING_SOON_FEATURES = [
  "Create scam drills",
  "Manage email templates",
  "Send test campaigns",
  "View drill results",
  "Manage educational content",
];

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

function isWithinDays(value: string, days: number) {
  const date = new Date(value);
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  return date >= cutoff;
}

function AdminKpiCard({
  label,
  value,
  sub,
  muted = false,
}: {
  label: string;
  value: string | number;
  sub?: string;
  muted?: boolean;
}) {
  return (
    <div
      className={`rounded-xl border px-3 py-2.5 ${
        muted
          ? "border-navy/10 bg-navy/[0.03] text-navy/45"
          : "border-navy/10 bg-white/90 text-navy"
      }`}
    >
      <p className="text-[0.68rem] font-extrabold uppercase tracking-wide text-coral-dark/90">
        {label}
      </p>
      <p className={`text-xl font-black mt-0.5 ${muted ? "text-navy/40" : "text-navy"}`}>{value}</p>
      {sub && <p className="text-[0.7rem] text-navy/55 mt-0.5 leading-snug">{sub}</p>}
    </div>
  );
}

function isTabAccessible(tab: AdminTab, access: AdminAccess): boolean {
  switch (tab) {
    case "overview":
    case "drills":
    case "templates":
    case "content":
      return true;
    case "users":
      return access.canManageUsers;
    case "administrators":
      return access.canManageAdmins;
    case "activity":
      return access.canViewAuditLog;
    default:
      return false;
  }
}

function firstAccessibleTab(access: AdminAccess): AdminTab {
  for (const tab of ADMIN_TABS) {
    if (tab.enabled && isTabAccessible(tab.id, access)) return tab.id;
  }
  return "overview";
}

export function AdminControlCentre() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [userDataLoading, setUserDataLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [activeTab, setActiveTab] = useState<AdminTab>("overview");
  const [access, setAccess] = useState<AdminAccess | null>(null);
  const [accessLoaded, setAccessLoaded] = useState(false);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [frequencyFilter, setFrequencyFilter] = useState<FrequencyFilter>("all");
  const [sortKey, setSortKey] = useState<SortKey>("joined-desc");

  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
  const [userToDelete, setUserToDelete] = useState<AdminUser | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function loadAdminAccess() {
      try {
        const res = await fetch("/api/admin/me");
        if (!mounted) return;
        if (!res.ok) {
          setAccessLoaded(true);
          return;
        }
        const payload = (await res.json()) as { access?: AdminAccess };
        if (payload.access) {
          setAccess(payload.access);
          setActiveTab(firstAccessibleTab(payload.access));
        }
      } catch {
        // Tabs stay hidden if profile cannot be loaded.
      } finally {
        if (mounted) setAccessLoaded(true);
      }
    }

    loadAdminAccess();
    return () => {
      mounted = false;
    };
  }, []);

  async function loadOverview(isRefresh = false) {
    if (!access?.canManageUsers) return;

    if (isRefresh) setRefreshing(true);
    else setUserDataLoading(true);
    setError("");
    try {
      const res = await fetch("/api/admin/overview");
      const payload = (await res.json()) as {
        error?: string;
        canViewUserData?: boolean;
        users?: AdminUser[];
        stats?: AdminStats;
      };
      if (!res.ok) {
        setError(payload.error ?? "Could not load user data.");
        return;
      }
      if (!payload.canViewUserData || !payload.users || !payload.stats) {
        setUsers([]);
        setStats(null);
        return;
      }
      setUsers(payload.users);
      setStats(payload.stats);
    } catch {
      setError("Could not load user data.");
    } finally {
      setUserDataLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    if (access?.canManageUsers) {
      void loadOverview();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [access?.canManageUsers]);

  const newThisWeek = useMemo(
    () => users.filter((user) => isWithinDays(user.joinedAt, 7)).length,
    [users]
  );

  const latestSignup = useMemo(() => {
    if (users.length === 0) return null;
    return [...users].sort(
      (a, b) => new Date(b.joinedAt).getTime() - new Date(a.joinedAt).getTime()
    )[0];
  }, [users]);

  const frequencyMix = useMemo(() => {
    if (!stats) return "—";
    return `W ${stats.weeklyUsers} · F ${stats.fortnightlyUsers} · M ${stats.monthlyUsers}`;
  }, [stats]);

  const recentActivity = useMemo(() => {
    const events: ActivityItem[] = [];
    for (const user of users) {
      events.push({
        id: `join-${user.id}`,
        label: "New user registered",
        detail: `${user.name} (${user.email})`,
        at: user.joinedAt,
      });
      if (user.lastLoginAt) {
        events.push({
          id: `login-${user.id}`,
          label: "User logged in",
          detail: user.email,
          at: user.lastLoginAt,
        });
      }
    }
    return events
      .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())
      .slice(0, 8);
  }, [users]);

  const filteredUsers = useMemo(() => {
    const query = search.trim().toLowerCase();
    let result = users.filter((user) => {
      const matchesSearch =
        !query ||
        user.name.toLowerCase().includes(query) ||
        user.email.toLowerCase().includes(query);
      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "active" && user.isActive) ||
        (statusFilter === "disabled" && !user.isActive);
      const matchesFrequency =
        frequencyFilter === "all" || user.frequency === frequencyFilter;
      return matchesSearch && matchesStatus && matchesFrequency;
    });

    result = [...result].sort((a, b) => {
      switch (sortKey) {
        case "joined-asc":
          return new Date(a.joinedAt).getTime() - new Date(b.joinedAt).getTime();
        case "login-desc": {
          const aLogin = a.lastLoginAt ? new Date(a.lastLoginAt).getTime() : 0;
          const bLogin = b.lastLoginAt ? new Date(b.lastLoginAt).getTime() : 0;
          return bLogin - aLogin;
        }
        case "login-asc": {
          const aLogin = a.lastLoginAt ? new Date(a.lastLoginAt).getTime() : 0;
          const bLogin = b.lastLoginAt ? new Date(b.lastLoginAt).getTime() : 0;
          return aLogin - bLogin;
        }
        case "name-asc":
          return a.name.localeCompare(b.name);
        case "joined-desc":
        default:
          return new Date(b.joinedAt).getTime() - new Date(a.joinedAt).getTime();
      }
    });

    return result;
  }, [users, search, statusFilter, frequencyFilter, sortKey]);

  async function deleteUser(user: AdminUser) {
    setDeleting(true);
    setError("");
    try {
      const res = await fetch(`/api/admin/users/${user.id}`, { method: "DELETE" });
      const payload = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(payload.error ?? "Failed to delete user.");
        return;
      }
      setNotice(`Deleted ${user.email}.`);
      setUserToDelete(null);
      if (selectedUser?.id === user.id) setSelectedUser(null);
      loadOverview(true);
    } catch {
      setError("Failed to delete user.");
    } finally {
      setDeleting(false);
    }
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

  const selectClass =
    "rounded-lg border border-navy/15 bg-white px-3 py-2 text-sm text-navy focus:outline-none focus:ring-2 focus:ring-orange/40";

  const canManageUsers = access?.canManageUsers ?? false;
  const canManageAdmins = access?.canManageAdmins ?? false;
  const canViewAuditLog = access?.canViewAuditLog ?? false;
  const isSuperAdmin = access?.isSuperAdmin ?? false;

  return (
    <div className="max-w-6xl mx-auto px-4 md:px-8 py-6 md:py-8">

      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-3 mb-5">
        <div>
          <p className="text-xs font-black uppercase tracking-widest text-coral mb-1">Admin</p>
          <h1 className="font-display text-2xl md:text-3xl font-black text-navy">
            Don&apos;t Bite control centre
          </h1>
          <p className="text-sm text-navy/60 mt-1">
            Early operations dashboard for accounts and platform readiness.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 sm:items-center self-start md:self-auto">
          {canManageUsers && (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => loadOverview(true)}
              disabled={refreshing}
              className="!rounded-lg"
            >
              {refreshing ? "Refreshing…" : "Refresh data"}
            </Button>
          )}
          <AdminAccountMenu />
        </div>
      </div>

      <nav className="flex flex-wrap gap-2 mb-5" aria-label="Admin sections">
        {ADMIN_TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          const tabAccessible = accessLoaded && access && isTabAccessible(tab.id, access);
          const tabEnabled = tab.enabled && tabAccessible;
          return (
            <button
              key={tab.id}
              type="button"
              disabled={!tabEnabled}
              onClick={() => tabEnabled && setActiveTab(tab.id)}
              className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-bold transition-colors ${
                isActive
                  ? "bg-navy text-white"
                  : tabEnabled
                    ? "bg-white/80 border border-navy/10 text-navy hover:bg-blush/40"
                    : "bg-navy/5 border border-navy/5 text-navy/35 cursor-not-allowed"
              }`}
            >
              <Icon size={15} />
              {tab.label}
              {!tabEnabled && tab.enabled && accessLoaded && (
                <span className="text-[0.65rem] uppercase tracking-wide opacity-70">
                  No access
                </span>
              )}
              {!tab.enabled && (
                <span className="text-[0.65rem] uppercase tracking-wide opacity-70">Soon</span>
              )}
            </button>
          );
        })}
      </nav>

      {notice && (
        <p className="mb-3 text-sm font-bold text-navy bg-mint/30 border border-mint/50 rounded-lg px-3 py-2">
          {notice}
        </p>
      )}
      {error && (
        <p className="mb-3 text-sm font-bold text-coral bg-coral/10 border border-coral/20 rounded-lg px-3 py-2">
          {error}
        </p>
      )}

      {!accessLoaded ? (
        <Card className="!p-4">
          <p className="text-sm text-navy/60">Loading admin access…</p>
        </Card>
      ) : (
        <>
          {canManageUsers && (activeTab === "overview" || activeTab === "users") && stats && (
            <section className="mb-5">
              <h2 className="text-sm font-extrabold text-navy mb-2">Key metrics</h2>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2 mb-2">
                <AdminKpiCard label="Total users" value={stats.totalUsers} sub="Training users only" />
                <AdminKpiCard label="Active users" value={stats.activeUsers} sub="Training users only" />
                <AdminKpiCard label="New this week" value={newThisWeek} />
                <AdminKpiCard label="Logged in users" value={stats.usersLoggedIn} />
                <AdminKpiCard label="Drill frequency mix" value={frequencyMix} sub="Weekly · Fortnightly · Monthly" />
                <AdminKpiCard
                  label="Latest signup"
                  value={latestSignup ? latestSignup.name.split(" ")[0] : "—"}
                  sub={latestSignup ? formatDate(latestSignup.joinedAt) : "No signups yet"}
                />
              </div>
              <div className="grid grid-cols-3 gap-2">
                <AdminKpiCard label="Drills sent" value="—" sub="Coming soon" muted />
                <AdminKpiCard label="Bites / clicks" value="—" sub="Coming soon" muted />
                <AdminKpiCard label="Spot rate" value="—" sub="Coming soon" muted />
              </div>
            </section>
          )}

          {activeTab === "overview" && (
            <div className="grid lg:grid-cols-2 gap-4">
              {canManageUsers && (
                <Card className="!p-4">
                  <h2 className="font-bold text-navy mb-3 flex items-center gap-2">
                    <BarChart3 size={16} /> Recent activity
                  </h2>
                  {userDataLoading ? (
                    <p className="text-sm text-navy/60">Loading user activity…</p>
                  ) : recentActivity.length > 0 ? (
                    <ul className="space-y-2.5">
                      {recentActivity.map((item) => (
                        <li key={item.id} className="text-sm border-b border-navy/5 pb-2 last:border-0">
                          <p className="font-bold text-navy">{item.label}</p>
                          <p className="text-navy/65">{item.detail}</p>
                          <p className="text-xs text-navy/45 mt-0.5">{formatDateTime(item.at)}</p>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-navy/60 leading-relaxed">
                      Recent activity will appear here once drill and account events are recorded.
                    </p>
                  )}
                </Card>
              )}

              <Card className={`!p-4 ${canManageUsers ? "" : "lg:col-span-2"}`}>
                <h2 className="font-bold text-navy mb-3 flex items-center gap-2">
                  <Shield size={16} /> Next admin features
                </h2>
                <ul className="space-y-2">
                  {COMING_SOON_FEATURES.map((feature) => (
                    <li
                      key={feature}
                      className="flex items-center justify-between text-sm text-navy/75 border-b border-navy/5 pb-2 last:border-0"
                    >
                      <span>{feature}</span>
                      <span className="text-[0.65rem] font-extrabold uppercase tracking-wide text-navy/40">
                        Coming soon
                      </span>
                    </li>
                  ))}
                </ul>
              </Card>
            </div>
          )}

          {activeTab === "users" && canManageUsers && (
            <Card className="!p-4 overflow-hidden">
              {userDataLoading ? (
                <p className="text-sm text-navy/60">Loading users…</p>
              ) : (
                <>
                  <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 mb-4">
                    <h2 className="font-bold text-lg text-navy">Registered users</h2>
                    <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
                      <div className="relative">
                        <Search
                          size={15}
                          className="absolute left-3 top-1/2 -translate-y-1/2 text-navy/40"
                        />
                        <input
                          type="search"
                          value={search}
                          onChange={(e) => setSearch(e.target.value)}
                          placeholder="Search name or email"
                          className="w-full sm:w-56 rounded-lg border border-navy/15 pl-9 pr-3 py-2 text-sm text-navy focus:outline-none focus:ring-2 focus:ring-orange/40"
                        />
                      </div>
                      <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
                        className={selectClass}
                        aria-label="Filter by status"
                      >
                        <option value="all">All statuses</option>
                        <option value="active">Active</option>
                        <option value="disabled">Disabled</option>
                      </select>
                      <select
                        value={frequencyFilter}
                        onChange={(e) => setFrequencyFilter(e.target.value as FrequencyFilter)}
                        className={selectClass}
                        aria-label="Filter by drill frequency"
                      >
                        <option value="all">All frequencies</option>
                        <option value="weekly">Weekly</option>
                        <option value="fortnightly">Fortnightly</option>
                        <option value="monthly">Monthly</option>
                      </select>
                      <select
                        value={sortKey}
                        onChange={(e) => setSortKey(e.target.value as SortKey)}
                        className={selectClass}
                        aria-label="Sort users"
                      >
                        <option value="joined-desc">Joined (newest)</option>
                        <option value="joined-asc">Joined (oldest)</option>
                        <option value="login-desc">Last login (recent)</option>
                        <option value="login-asc">Last login (oldest)</option>
                        <option value="name-asc">Name (A–Z)</option>
                      </select>
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[760px] text-sm">
                      <thead>
                        <tr className="border-b border-navy/10 text-left text-navy/60">
                          <th className="py-2 pr-3 font-bold">Name</th>
                          <th className="py-2 pr-3 font-bold">Email</th>
                          <th className="py-2 pr-3 font-bold">Frequency</th>
                          <th className="py-2 pr-3 font-bold">Status</th>
                          <th className="py-2 pr-3 font-bold">Last login</th>
                          <th className="py-2 pr-3 font-bold">Joined</th>
                          <th className="py-2 pr-0 font-bold">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredUsers.map((user) => (
                          <tr key={user.id} className="border-b border-navy/5 hover:bg-blush/20">
                            <td className="py-2.5 pr-3 font-bold text-navy">{user.name}</td>
                            <td className="py-2.5 pr-3 text-navy/80">{user.email}</td>
                            <td className="py-2.5 pr-3 text-navy/75 capitalize">{user.frequency}</td>
                            <td className="py-2.5 pr-3">
                              <Badge variant={user.isActive ? "success" : "warning"}>
                                {user.isActive ? "Active" : "Disabled"}
                              </Badge>
                            </td>
                            <td className="py-2.5 pr-3 text-navy/70 whitespace-nowrap">
                              {formatDateTime(user.lastLoginAt)}
                            </td>
                            <td className="py-2.5 pr-3 text-navy/70 whitespace-nowrap">
                              {formatDate(user.joinedAt)}
                            </td>
                            <td className="py-2.5 pr-0">
                              <div className="flex flex-wrap gap-2">
                                <button
                                  type="button"
                                  className="text-xs font-bold text-navy hover:text-coral-dark"
                                  onClick={() => setSelectedUser(user)}
                                >
                                  View
                                </button>
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
                                  onClick={() => setUserToDelete(user)}
                                >
                                  Delete
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {filteredUsers.length === 0 && (
                    <p className="text-center text-navy/50 py-8 text-sm">
                      {users.length === 0
                        ? "No registrations yet."
                        : "No users match your current filters."}
                    </p>
                  )}
                </>
              )}
            </Card>
          )}

          {activeTab === "administrators" && canManageAdmins && (
            <AdministratorsPanel
              isSuperAdmin={isSuperAdmin}
              onNotice={setNotice}
              onError={setError}
              onChanged={() => loadOverview(true)}
            />
          )}

          {activeTab === "activity" && canViewAuditLog && (
            <ActivityLogPanel onError={setError} />
          )}

          {(activeTab === "drills" || activeTab === "templates" || activeTab === "content") && (
            <Card className="!p-5 text-center">
              <p className="font-bold text-navy mb-1 capitalize">{activeTab} section</p>
              <p className="text-sm text-navy/60">
                This area is planned for a future admin release. Use Overview and Users for now.
              </p>
            </Card>
          )}
        </>
      )}

      {selectedUser && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <button
            type="button"
            className="absolute inset-0 bg-navy/30"
            aria-label="Close user details"
            onClick={() => setSelectedUser(null)}
          />
          <aside className="relative w-full max-w-md bg-white h-full shadow-2xl overflow-y-auto p-5">
            <div className="flex items-start justify-between gap-3 mb-4">
              <div>
                <p className="text-xs font-black uppercase tracking-widest text-coral mb-1">
                  User details
                </p>
                <h2 className="font-display text-2xl font-black text-navy">{selectedUser.name}</h2>
                <p className="text-sm text-navy/65">{selectedUser.email}</p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedUser(null)}
                className="rounded-lg p-1.5 hover:bg-navy/5 text-navy/60"
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>

            <dl className="space-y-3 text-sm mb-5">
              <div>
                <dt className="font-bold text-navy/55">User ID</dt>
                <dd className="font-mono text-xs text-navy/70 break-all">{selectedUser.id}</dd>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <dt className="font-bold text-navy/55">Status</dt>
                  <dd className="text-navy">{selectedUser.isActive ? "Active" : "Disabled"}</dd>
                </div>
                <div>
                  <dt className="font-bold text-navy/55">Frequency</dt>
                  <dd className="text-navy capitalize">{selectedUser.frequency}</dd>
                </div>
                <div>
                  <dt className="font-bold text-navy/55">Joined</dt>
                  <dd className="text-navy">{formatDateTime(selectedUser.joinedAt)}</dd>
                </div>
                <div>
                  <dt className="font-bold text-navy/55">Last login</dt>
                  <dd className="text-navy">{formatDateTime(selectedUser.lastLoginAt)}</dd>
                </div>
              </div>
            </dl>

            <div className="rounded-xl bg-blush/40 border border-navy/10 p-3 mb-4">
              <p className="text-xs font-extrabold uppercase tracking-wide text-navy/50 mb-2">
                Training stats
              </p>
              <p className="text-sm text-navy/65">
                Drill performance metrics will appear here once training events are stored in the
                database. <span className="font-bold">Coming soon.</span>
              </p>
            </div>

            <div className="rounded-xl bg-navy/5 border border-navy/10 p-3 mb-5">
              <p className="text-xs font-extrabold uppercase tracking-wide text-navy/50 mb-2">
                Admin notes
              </p>
              <p className="text-sm text-navy/65">
                Notes and support context will be added in a future release.{" "}
                <span className="font-bold">Coming soon.</span>
              </p>
            </div>

            <div className="space-y-2">
              <p className="text-xs font-extrabold uppercase tracking-wide text-navy/50">
                Account actions
              </p>
              <Button
                size="sm"
                variant="ghost"
                className="w-full !rounded-lg"
                onClick={() => resetPassword(selectedUser.id)}
              >
                Reset password
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="w-full !rounded-lg opacity-50 cursor-not-allowed"
                disabled
              >
                Deactivate (coming soon)
              </Button>
              <Button
                size="sm"
                variant="coral"
                className="w-full !rounded-lg"
                onClick={() => setUserToDelete(selectedUser)}
              >
                Delete account
              </Button>
            </div>
          </aside>
        </div>
      )}

      {userToDelete && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <button
            type="button"
            className="absolute inset-0 bg-navy/40"
            aria-label="Cancel delete"
            onClick={() => !deleting && setUserToDelete(null)}
          />
          <div className="relative w-full max-w-md rounded-2xl bg-white border border-navy/10 shadow-2xl p-5">
            <h3 className="font-display text-xl font-black text-navy mb-2">Delete this account?</h3>
            <p className="text-sm text-navy/70 mb-4">
              This permanently removes the account for{" "}
              <strong className="text-navy">{userToDelete.email}</strong>. This action cannot be
              undone.
            </p>
            <div className="flex gap-2 justify-end">
              <Button
                size="sm"
                variant="ghost"
                className="!rounded-lg"
                disabled={deleting}
                onClick={() => setUserToDelete(null)}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                variant="coral"
                className="!rounded-lg"
                disabled={deleting}
                onClick={() => deleteUser(userToDelete)}
              >
                {deleting ? "Deleting…" : "Delete account"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
