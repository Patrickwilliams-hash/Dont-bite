"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, Search, Target } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

interface DrillTemplateOption {
  id: string;
  slug: string;
  title: string;
  brandName: string;
  scamType: string;
  emailSubject: string | null;
  emailPreviewText: string | null;
  isActive: boolean;
}

interface EligibleUser {
  id: string;
  name: string;
  email: string;
  frequency: "weekly" | "fortnightly" | "monthly";
  trainingActive: boolean;
}

interface SendDrillPanelProps {
  onNotice: (message: string) => void;
  onError: (message: string) => void;
}

function firstName(name: string): string {
  return name.trim().split(/\s+/)[0] || "there";
}

export function SendDrillPanel({ onNotice, onError }: SendDrillPanelProps) {
  const [templates, setTemplates] = useState<DrillTemplateOption[]>([]);
  const [templatesLoading, setTemplatesLoading] = useState(true);
  const [templatesError, setTemplatesError] = useState("");

  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<EligibleUser[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState("");
  const [selectedUser, setSelectedUser] = useState<EligibleUser | null>(null);

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [sending, setSending] = useState(false);

  const template = templates[0] ?? null;

  useEffect(() => {
    let mounted = true;

    async function loadTemplates() {
      setTemplatesLoading(true);
      setTemplatesError("");
      try {
        const res = await fetch("/api/admin/drills/templates");
        const payload = (await res.json()) as {
          error?: string;
          templates?: DrillTemplateOption[];
        };
        if (!mounted) return;
        if (!res.ok) {
          setTemplatesError(payload.error ?? "Failed to load drill templates.");
          return;
        }
        setTemplates(payload.templates ?? []);
      } catch {
        if (mounted) setTemplatesError("Failed to load drill templates.");
      } finally {
        if (mounted) setTemplatesLoading(false);
      }
    }

    void loadTemplates();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    const query = searchQuery.trim();
    if (query.length < 2) {
      setSearchResults([]);
      setSearchError("");
      setSearchLoading(false);
      return;
    }

    setSearchLoading(true);
    setSearchError("");

    const timer = window.setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/admin/drills/eligible-users/search?q=${encodeURIComponent(query)}`
        );
        const payload = (await res.json()) as {
          error?: string;
          users?: EligibleUser[];
        };
        if (!res.ok) {
          setSearchResults([]);
          setSearchError(payload.error ?? "Failed to search users.");
          return;
        }
        setSearchResults(payload.users ?? []);
        setSearchError("");
      } catch {
        setSearchResults([]);
        setSearchError("Failed to search users.");
      } finally {
        setSearchLoading(false);
      }
    }, 300);

    return () => window.clearTimeout(timer);
  }, [searchQuery]);

  const previewSample = useMemo(() => {
    if (!template) return null;
    const sampleName = selectedUser ? firstName(selectedUser.name) : "Alex";
    return {
      subject: template.emailSubject ?? "Your parcel needs a new delivery time",
      greeting: `Hi ${sampleName},`,
      previewText:
        template.emailPreviewText ??
        "A delivery attempt could not be completed — action requested",
      cta: "Choose delivery time",
    };
  }, [selectedUser, template]);

  async function handleSend() {
    if (!template || !selectedUser) return;

    setSending(true);
    onError("");
    try {
      const res = await fetch("/api/admin/drills/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          templateId: template.id,
          userId: selectedUser.id,
        }),
      });
      const payload = (await res.json()) as {
        error?: string;
        ok?: boolean;
        deliveryId?: string;
        status?: string;
        trackingUrl?: string;
        token?: string;
      };

      if (
        payload.trackingUrl ||
        payload.token ||
        JSON.stringify(payload).includes("/drill/")
      ) {
        onError("Unexpected response from drill send API.");
        return;
      }

      if (!res.ok || !payload.ok) {
        onError(payload.error ?? "Failed to send drill.");
        return;
      }

      onNotice(
        `Demo drill sent to ${selectedUser.name}. They should receive the email in their inbox shortly.`
      );
      setConfirmOpen(false);
      setSelectedUser(null);
      setSearchQuery("");
      setSearchResults([]);
    } catch {
      onError("Failed to send drill.");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="space-y-4">
      <Card className="!p-5">
        <h2 className="font-bold text-lg text-navy mb-2">Training drills</h2>
        <p className="text-sm text-navy/60">
          Genuine training drill campaigns and templates will be managed here in a future release.
          Use the demo section below for ParcelPath testing.
        </p>
      </Card>

      <Card className="!p-5">
        <h2 className="font-bold text-lg text-navy mb-2 flex items-center gap-2">
          <Target size={16} /> Demo drill — ParcelPath
        </h2>
        <p className="text-sm text-navy/60 mb-4">
          Send one realistic simulated scam email to a consenting training user for testing or
          support. Demo deliveries do not count toward training results, scores, or progression.
        </p>

        {templatesLoading ? (
          <p className="text-sm text-navy/60">Loading demo template…</p>
        ) : templatesError ? (
          <p className="text-sm font-bold text-coral">{templatesError}</p>
        ) : !template ? (
          <p className="text-sm text-navy/60">No active demo templates are available.</p>
        ) : (
          <div className="rounded-xl border border-navy/10 bg-white/80 p-4 mb-5">
            <p className="text-xs font-black uppercase tracking-wide text-coral-dark/90 mb-1">
              Demo drill
            </p>
            <p className="font-bold text-navy">{template.title}</p>
            <p className="text-sm text-navy/60 mt-1">
              Fictional brand: {template.brandName} · {template.scamType}
            </p>
            <p className="text-xs text-navy/50 mt-2">
              Deliveries are recorded with purpose <strong>demo</strong> and excluded from future
              training statistics.
            </p>
          </div>
        )}

        <div className="mb-5">
          <label htmlFor="drill-user-search" className="block text-xs font-bold text-navy/60 mb-1">
            Search eligible training user
          </label>
          <div className="relative">
            <Search
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-navy/35"
            />
            <input
              id="drill-user-search"
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by name or email (min. 2 characters)"
              className="w-full rounded-lg border border-navy/15 pl-9 pr-3 py-2 text-sm text-navy focus:outline-none focus:ring-2 focus:ring-orange/40"
            />
          </div>
          <p className="text-xs text-navy/50 mt-1">
            Only active training users with training enabled are shown.
          </p>

          {searchLoading && (
            <p className="text-sm text-navy/60 mt-3">Searching users…</p>
          )}
          {searchError && (
            <p className="text-sm font-bold text-coral mt-3">{searchError}</p>
          )}
          {!searchLoading && searchQuery.trim().length >= 2 && !searchError && searchResults.length === 0 && (
            <p className="text-sm text-navy/60 mt-3">No eligible users found.</p>
          )}

          {searchResults.length > 0 && (
            <ul className="mt-3 space-y-2">
              {searchResults.map((user) => (
                <li key={user.id}>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedUser(user);
                      setSearchQuery(user.email);
                      setSearchResults([]);
                    }}
                    className={`w-full text-left rounded-lg border px-3 py-2 text-sm transition-colors ${
                      selectedUser?.id === user.id
                        ? "border-coral/40 bg-coral/10"
                        : "border-navy/10 bg-white hover:bg-blush/30"
                    }`}
                  >
                    <span className="font-bold text-navy">{user.name}</span>
                    <span className="block text-navy/60">{user.email}</span>
                    <span className="block text-xs text-navy/45 mt-0.5">
                      Training active · {user.frequency}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {selectedUser && (
          <div className="rounded-xl border border-mint/40 bg-mint/10 p-4 mb-5">
            <p className="text-xs font-black uppercase tracking-wide text-navy/50 mb-1">
              Selected recipient
            </p>
            <p className="font-bold text-navy">{selectedUser.name}</p>
            <p className="text-sm text-navy/65">{selectedUser.email}</p>
            <p className="text-xs text-navy/55 mt-1">
              Consent status: training active ({selectedUser.frequency})
            </p>
          </div>
        )}

        {previewSample && (
          <div className="rounded-xl border border-navy/10 bg-navy/[0.03] p-4 mb-5">
            <p className="text-xs font-black uppercase tracking-wide text-navy/50 mb-2">
              Email preview (sample)
            </p>
            <p className="text-sm">
              <span className="font-bold text-navy">Subject:</span> {previewSample.subject}
            </p>
            <p className="text-sm mt-2 text-navy/70">{previewSample.greeting}</p>
            <p className="text-sm mt-2 text-navy/70">{previewSample.previewText}</p>
            <p className="text-sm mt-3">
              <span className="inline-block rounded-md bg-blue-600 text-white text-xs font-bold px-3 py-2">
                {previewSample.cta}
              </span>
            </p>
          </div>
        )}

        <Button
          size="sm"
          className="!rounded-lg"
          disabled={!template || !selectedUser || sending}
          onClick={() => setConfirmOpen(true)}
        >
          Send demo drill
        </Button>
      </Card>

      <Card className="!p-4 border-amber-200/80 bg-amber-50/70">
        <div className="flex gap-3">
          <AlertTriangle className="text-amber-700 shrink-0 mt-0.5" size={18} />
          <div className="text-sm text-navy/75">
            <p className="font-bold text-navy mb-1">Known limitation: email security scanners</p>
            <p>
              Some email security systems may prefetch links before a person opens the message. That
              can record a <strong>link followed</strong> outcome even when the recipient did not
              click. The route and debrief wording stay neutral for this reason.
            </p>
          </div>
        </div>
      </Card>

      {confirmOpen && template && selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <button
            type="button"
            className="absolute inset-0 bg-navy/30"
            aria-label="Close confirmation"
            onClick={() => !sending && setConfirmOpen(false)}
          />
          <div className="relative w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl">
            <h3 className="font-display text-xl font-black text-navy mb-2">
              Send this demo drill now?
            </h3>
            <p className="text-sm text-navy/70 mb-4">
              The selected user will receive a realistic simulated scam email in their real inbox.
              This is a demo delivery and will not count toward their training results.
            </p>
            <p className="text-sm text-navy mb-1">
              <strong>Template:</strong> {template.title}
            </p>
            <p className="text-sm text-navy mb-4">
              <strong>Recipient:</strong> {selectedUser.name} ({selectedUser.email})
            </p>
            <div className="flex gap-2 justify-end">
              <Button
                variant="ghost"
                size="sm"
                className="!rounded-lg"
                disabled={sending}
                onClick={() => setConfirmOpen(false)}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                className="!rounded-lg"
                disabled={sending}
                onClick={() => void handleSend()}
              >
                {sending ? "Sending…" : "Send demo drill"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
