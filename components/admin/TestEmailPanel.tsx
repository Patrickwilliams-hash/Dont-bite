"use client";

import { useState } from "react";
import { Mail } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

interface TestEmailPanelProps {
  defaultRecipient?: string;
  onNotice: (message: string) => void;
  onError: (message: string) => void;
}

export function TestEmailPanel({ defaultRecipient = "", onNotice, onError }: TestEmailPanelProps) {
  const [recipient, setRecipient] = useState(defaultRecipient);
  const [sending, setSending] = useState(false);

  async function sendTestEmail(e: React.FormEvent) {
    e.preventDefault();
    const to = recipient.trim();
    if (!to) {
      onError("Enter a recipient email address.");
      return;
    }

    setSending(true);
    try {
      const res = await fetch("/api/admin/email/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to }),
      });
      const payload = (await res.json()) as { error?: string };
      if (!res.ok) {
        onError(payload.error ?? "Failed to send test email.");
        return;
      }
      onNotice(`Test email sent to ${to}.`);
    } catch {
      onError("Failed to send test email.");
    } finally {
      setSending(false);
    }
  }

  return (
    <Card className="!p-4">
      <h2 className="font-bold text-lg text-navy mb-2 flex items-center gap-2">
        <Mail size={16} /> Test email
      </h2>
      <p className="text-sm text-navy/60 mb-4">
        Send a simple branded test message to verify outgoing SMTP delivery. Super Admin only.
      </p>
      <form onSubmit={sendTestEmail} className="flex flex-col sm:flex-row gap-2 sm:items-end">
        <div className="flex-1">
          <label htmlFor="test-email-recipient" className="block text-xs font-bold text-navy/60 mb-1">
            Recipient email
          </label>
          <input
            id="test-email-recipient"
            type="email"
            value={recipient}
            onChange={(e) => setRecipient(e.target.value)}
            placeholder="you@example.com"
            required
            className="w-full rounded-lg border border-navy/15 px-3 py-2 text-sm text-navy focus:outline-none focus:ring-2 focus:ring-orange/40"
          />
        </div>
        <Button type="submit" size="sm" className="!rounded-lg" disabled={sending}>
          {sending ? "Sending…" : "Send test email"}
        </Button>
      </form>
    </Card>
  );
}
