"use client";

import { useEffect, useState } from "react";
import { Card, Badge } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

interface DrillTemplateOption {
  id: string;
  title: string;
  scamType: string;
  subject: string;
  previewText: string;
  senderName: string;
  senderEmail: string;
  brandName: string;
  fakeDomain: string;
  learnSlug: string;
}

interface TrainingUserOption {
  id: string;
  name: string;
  email: string;
  trainingActive: boolean;
  frequency: string;
}

interface DrillStats {
  drillsSent: number;
  bites: number;
  spotted: number;
  pending: number;
  spotRate: number | null;
  recent: Array<{
    id: string;
    title: string;
    status: string;
    sentAt: string;
    userName: string;
    userEmail: string;
  }>;
}

interface SentDrillPreview {
  id: string;
  templateId: string;
  title: string;
  status: string;
  isTest: boolean;
  sentAt: string;
  expiresAt: string | null;
  trackPath: string;
  lessonPath: string;
  preview: {
    subject: string;
    senderName: string;
    senderEmail: string;
    previewText: string;
  };
}

interface DrillsPanelProps {
  onNotice: (message: string) => void;
  onError: (message: string) => void;
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

function statusLabel(status: string) {
  switch (status) {
    case "caught":
      return "Bit";
    case "spotted":
      return "Spotted";
    case "expired":
      return "Expired";
    default:
      return "Pending";
  }
}

export function DrillsPanel({ onNotice, onError }: DrillsPanelProps) {
  const [templates, setTemplates] = useState<DrillTemplateOption[]>([]);
  const [stats, setStats] = useState<DrillStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedTemplateId, setSelectedTemplateId] = useState("");
  const [userQuery, setUserQuery] = useState("");
  const [userResults, setUserResults] = useState<TrainingUserOption[]>([]);
  const [selectedUser, setSelectedUser] = useState<TrainingUserOption | null>(null);
  const [searching, setSearching] = useState(false);
  const [sending, setSending] = useState(false);
  const [lastSend, setLastSend] = useState<SentDrillPreview | null>(null);
  const [copied, setCopied] = useState(false);
  const [origin, setOrigin] = useState("");

  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

  async function loadPanel() {
    setLoading(true);
    onError("");
    try {
      const [templatesRes, statsRes] = await Promise.all([
        fetch("/api/admin/drills/templates"),
        fetch("/api/admin/drills/stats"),
      ]);
      const templatesPayload = (await templatesRes.json()) as {
        error?: string;
        templates?: DrillTemplateOption[];
      };
      const statsPayload = (await statsRes.json()) as {
        error?: string;
        stats?: DrillStats;
      };

      if (!templatesRes.ok || !templatesPayload.templates) {
        onError(templatesPayload.error ?? "Could not load drill templates.");
        return;
      }
      if (!statsRes.ok || !statsPayload.stats) {
        onError(statsPayload.error ?? "Could not load drill stats.");
        return;
      }

      setTemplates(templatesPayload.templates);
      setStats(statsPayload.stats);
      if (!selectedTemplateId && templatesPayload.templates[0]) {
        setSelectedTemplateId(templatesPayload.templates[0].id);
      }
    } catch {
      onError("Could not load drills panel.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadPanel();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const query = userQuery.trim();
    if (query.length < 2) {
      setUserResults([]);
      return;
    }

    const handle = window.setTimeout(async () => {
      setSearching(true);
      try {
        const res = await fetch(`/api/admin/drills/users/search?q=${encodeURIComponent(query)}`);
        const payload = (await res.json()) as {
          error?: string;
          users?: TrainingUserOption[];
        };
        if (!res.ok) {
          onError(payload.error ?? "Could not search users.");
          return;
        }
        setUserResults(payload.users ?? []);
      } catch {
        onError("Could not search users.");
      } finally {
        setSearching(false);
      }
    }, 250);

    return () => window.clearTimeout(handle);
  }, [userQuery, onError]);

  const selectedTemplate = templates.find((template) => template.id === selectedTemplateId) ?? null;

  async function sendTestDrill() {
    if (!selectedUser || !selectedTemplateId) {
      onError("Choose a template and a training user first.");
      return;
    }

    setSending(true);
    onError("");
    try {
      const res = await fetch("/api/admin/drills/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: selectedUser.id,
          templateId: selectedTemplateId,
          isTest: true,
        }),
      });
      const payload = (await res.json()) as {
        error?: string;
        send?: SentDrillPreview;
        user?: { email: string };
      };
      if (!res.ok || !payload.send) {
        onError(payload.error ?? "Failed to send test drill.");
        return;
      }

      setLastSend(payload.send);
      onNotice(`Test drill queued for ${payload.user?.email ?? selectedUser.email}.`);
      await loadPanel();
    } catch {
      onError("Failed to send test drill.");
    } finally {
      setSending(false);
    }
  }

  async function copyTrackLink() {
    if (!lastSend) return;
    const absolute = `${window.location.origin}${lastSend.trackPath}`;
    await navigator.clipboard.writeText(absolute);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  }

  if (loading) {
    return (
      <Card className="!p-4">
        <p className="text-sm text-navy/60">Loading drills…</p>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
          <div className="rounded-xl border border-navy/10 bg-white/90 px-3 py-2.5">
            <p className="text-[0.68rem] font-extrabold uppercase tracking-wide text-coral-dark/90">
              Drills sent
            </p>
            <p className="text-xl font-black text-navy mt-0.5">{stats.drillsSent}</p>
          </div>
          <div className="rounded-xl border border-navy/10 bg-white/90 px-3 py-2.5">
            <p className="text-[0.68rem] font-extrabold uppercase tracking-wide text-coral-dark/90">
              Bites / clicks
            </p>
            <p className="text-xl font-black text-navy mt-0.5">{stats.bites}</p>
          </div>
          <div className="rounded-xl border border-navy/10 bg-white/90 px-3 py-2.5">
            <p className="text-[0.68rem] font-extrabold uppercase tracking-wide text-coral-dark/90">
              Spotted
            </p>
            <p className="text-xl font-black text-navy mt-0.5">{stats.spotted}</p>
          </div>
          <div className="rounded-xl border border-navy/10 bg-white/90 px-3 py-2.5">
            <p className="text-[0.68rem] font-extrabold uppercase tracking-wide text-coral-dark/90">
              Pending
            </p>
            <p className="text-xl font-black text-navy mt-0.5">{stats.pending}</p>
          </div>
          <div className="rounded-xl border border-navy/10 bg-white/90 px-3 py-2.5">
            <p className="text-[0.68rem] font-extrabold uppercase tracking-wide text-coral-dark/90">
              Spot rate
            </p>
            <p className="text-xl font-black text-navy mt-0.5">
              {stats.spotRate === null ? "—" : `${stats.spotRate}%`}
            </p>
          </div>
        </div>
      )}

      <div className="grid lg:grid-cols-2 gap-4">
        <Card className="!p-4">
          <h2 className="font-bold text-navy mb-1">Send a test drill</h2>
          <p className="text-sm text-navy/60 mb-4">
            Creates a tracked drill for a training user. Copy the track link to simulate the email
            click until real inbox delivery is connected.
          </p>

          <label className="block text-xs font-extrabold uppercase tracking-wide text-navy/50 mb-1.5">
            Template
          </label>
          <select
            value={selectedTemplateId}
            onChange={(e) => setSelectedTemplateId(e.target.value)}
            className="w-full rounded-lg border border-navy/15 bg-white px-3 py-2 text-sm text-navy mb-4 focus:outline-none focus:ring-2 focus:ring-orange/40"
          >
            {templates.map((template) => (
              <option key={template.id} value={template.id}>
                {template.title} ({template.scamType})
              </option>
            ))}
          </select>

          {selectedTemplate && (
            <div className="rounded-xl bg-blush/40 border border-navy/10 p-3 mb-4 text-sm">
              <p className="font-bold text-navy">{selectedTemplate.subject}</p>
              <p className="text-navy/65 mt-1">
                From {selectedTemplate.senderName} &lt;{selectedTemplate.senderEmail}&gt;
              </p>
              <p className="text-navy/55 mt-1">{selectedTemplate.previewText}</p>
            </div>
          )}

          <label className="block text-xs font-extrabold uppercase tracking-wide text-navy/50 mb-1.5">
            Training user
          </label>
          <input
            type="search"
            value={userQuery}
            onChange={(e) => {
              setUserQuery(e.target.value);
              setSelectedUser(null);
            }}
            placeholder="Search name or email"
            className="w-full rounded-lg border border-navy/15 px-3 py-2 text-sm text-navy mb-2 focus:outline-none focus:ring-2 focus:ring-orange/40"
          />
          {searching && <p className="text-xs text-navy/50 mb-2">Searching…</p>}
          {selectedUser ? (
            <div className="rounded-lg border border-mint/40 bg-mint/20 px-3 py-2 mb-4 text-sm">
              <p className="font-bold text-navy">{selectedUser.name}</p>
              <p className="text-navy/65">{selectedUser.email}</p>
            </div>
          ) : (
            userResults.length > 0 && (
              <ul className="mb-4 rounded-lg border border-navy/10 overflow-hidden">
                {userResults.map((user) => (
                  <li key={user.id}>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedUser(user);
                        setUserQuery(user.email);
                        setUserResults([]);
                      }}
                      className="w-full text-left px-3 py-2 text-sm hover:bg-blush/40 border-b border-navy/5 last:border-0"
                    >
                      <span className="font-bold text-navy">{user.name}</span>
                      <span className="block text-navy/60">{user.email}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )
          )}

          <Button
            size="sm"
            className="!rounded-lg"
            disabled={sending || !selectedUser || !selectedTemplateId}
            onClick={() => void sendTestDrill()}
          >
            {sending ? "Sending…" : "Send test drill"}
          </Button>
        </Card>

        <Card className="!p-4">
          <h2 className="font-bold text-navy mb-3">Latest test send</h2>
          {lastSend ? (
            <div className="space-y-3 text-sm">
              <div>
                <p className="font-bold text-navy">{lastSend.title}</p>
                <p className="text-navy/60 mt-0.5">{lastSend.preview.subject}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Badge>{statusLabel(lastSend.status)}</Badge>
                {lastSend.isTest && <Badge>Test</Badge>}
              </div>
              <p className="text-navy/60">Sent {formatDateTime(lastSend.sentAt)}</p>
              <div className="rounded-xl bg-navy/5 border border-navy/10 p-3 break-all font-mono text-xs text-navy/70">
                {origin ? `${origin}${lastSend.trackPath}` : lastSend.trackPath}
              </div>
              <div className="flex flex-wrap gap-2">
                <Button size="sm" variant="ghost" className="!rounded-lg" onClick={() => void copyTrackLink()}>
                  {copied ? "Copied" : "Copy track link"}
                </Button>
                <Button size="sm" variant="ghost" href={lastSend.lessonPath} className="!rounded-lg">
                  Open lesson page
                </Button>
              </div>
            </div>
          ) : (
            <p className="text-sm text-navy/60">
              Send a test drill to generate a tracked click link for that user.
            </p>
          )}
        </Card>
      </div>

      <Card className="!p-4">
        <h2 className="font-bold text-navy mb-3">Recent platform drills</h2>
        {stats && stats.recent.length > 0 ? (
          <ul className="space-y-2.5">
            {stats.recent.map((item) => (
              <li
                key={item.id}
                className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 text-sm border-b border-navy/5 pb-2 last:border-0"
              >
                <div>
                  <p className="font-bold text-navy">{item.title}</p>
                  <p className="text-navy/60">
                    {item.userName} · {item.userEmail}
                  </p>
                </div>
                <div className="text-left sm:text-right">
                  <Badge>{statusLabel(item.status)}</Badge>
                  <p className="text-xs text-navy/45 mt-1">{formatDateTime(item.sentAt)}</p>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-navy/60">
            No production drills yet. Test sends are excluded from these totals until you mark them
            as live campaigns.
          </p>
        )}
      </Card>
    </div>
  );
}
