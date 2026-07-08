"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { markEmailRead, reportEmail, clickEmailLink } from "@/lib/mock-store";
import type { DrillEmail, EmailOutcome } from "@/lib/mock-store";
import { Badge } from "@/components/ui/Card";
import { cn } from "@/lib/utils";
import { ShieldAlert, Link2, CheckCircle2, AlertTriangle } from "lucide-react";

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-NZ", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function outcomeBadge(outcome: EmailOutcome) {
  switch (outcome) {
    case "spotted":
      return <Badge variant="success">Spotted</Badge>;
    case "caught":
      return <Badge variant="warning">Caught</Badge>;
    case "trusted":
      return <Badge variant="success">Trusted</Badge>;
    case "false-alarm":
      return <Badge variant="warning">False alarm</Badge>;
    default:
      return null;
  }
}

export function InboxList({
  emails,
  activeId,
}: {
  emails: DrillEmail[];
  activeId?: string;
}) {
  return (
    <div className="divide-y divide-navy/5">
      {emails.map((email) => (
        <Link
          key={email.id}
          href={`/dashboard/inbox?email=${email.id}`}
          className={cn(
            "block p-4 hover:bg-orange/5 transition-colors",
            !email.read && "bg-gold/5",
            activeId === email.id && "bg-orange/10"
          )}
          onClick={() => markEmailRead(email.id)}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className={cn("text-navy truncate", !email.read && "font-bold")}>
                {email.from}
              </p>
              <p className="text-navy/80 truncate text-sm mt-0.5">{email.subject}</p>
              <p className="text-navy/50 text-xs mt-1 truncate">{email.preview}</p>
            </div>
            <div className="shrink-0 text-right space-y-1">
              <p className="text-xs text-navy/40">{formatDate(email.receivedAt)}</p>
              {email.outcome !== "pending"
                ? outcomeBadge(email.outcome)
                : !email.read && <Badge>New</Badge>}
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
}

function OutcomeBanner({ email }: { email: DrillEmail }) {
  if (email.outcome === "spotted") {
    return (
      <div className="flex items-start gap-3 rounded-xl bg-mint/30 border border-mint p-4">
        <CheckCircle2 className="w-5 h-5 text-navy shrink-0 mt-0.5" />
        <p className="text-sm text-navy">
          <strong>Nice catch!</strong> This was a simulated scam and you reported it. That&apos;s
          exactly the right move.
        </p>
      </div>
    );
  }
  if (email.outcome === "trusted") {
    return (
      <div className="flex items-start gap-3 rounded-xl bg-mint/30 border border-mint p-4">
        <CheckCircle2 className="w-5 h-5 text-navy shrink-0 mt-0.5" />
        <p className="text-sm text-navy">
          <strong>Correct.</strong> This was a genuine email — safe to open. Good judgement not
          reporting it.
        </p>
      </div>
    );
  }
  if (email.outcome === "false-alarm") {
    return (
      <div className="flex items-start gap-3 rounded-xl bg-gold/20 border border-gold/40 p-4">
        <AlertTriangle className="w-5 h-5 text-navy shrink-0 mt-0.5" />
        <p className="text-sm text-navy">
          <strong>False alarm.</strong> This one was actually genuine. No harm done — but
          reporting real mail too often means missing things that matter. Check the sender and
          tone before deciding.
        </p>
      </div>
    );
  }
  if (email.outcome === "caught") {
    return (
      <div className="flex items-start gap-3 rounded-xl bg-coral/10 border border-coral/25 p-4">
        <ShieldAlert className="w-5 h-5 text-coral-dark shrink-0 mt-0.5" />
        <div className="text-sm text-navy">
          <p>
            <strong>You clicked this one.</strong> Phil has a quick lesson on what to watch for.
          </p>
          <Link
            href={`/caught/${email.drillId}?emailId=${email.id}`}
            className="inline-block mt-2 font-bold text-coral-dark hover:underline"
          >
            Review the lesson →
          </Link>
        </div>
      </div>
    );
  }
  return null;
}

export function EmailDetail({ email }: { email: DrillEmail }) {
  const router = useRouter();

  function handleReport() {
    reportEmail(email.id);
  }

  function handleOpenLink() {
    if (email.kind === "drill") {
      router.push(`/caught/${email.drillId}?emailId=${email.id}`);
    } else {
      clickEmailLink(email.id);
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-bold text-navy">{email.subject}</h2>
        <p className="text-sm text-navy/60 mt-1">
          From: {email.from} &lt;{email.fromEmail}&gt;
        </p>
        <p className="text-xs text-navy/40">{formatDate(email.receivedAt)}</p>
      </div>

      <div className="whitespace-pre-wrap text-navy/80 leading-relaxed text-sm border-t border-navy/10 pt-4">
        {email.body}
      </div>

      <div className="border-t border-navy/10 pt-4">
        {email.outcome === "pending" ? (
          <>
            <p className="text-sm font-bold text-navy mb-3">
              Is this a scam? Make your call:
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                type="button"
                onClick={handleReport}
                className="inline-flex items-center justify-center gap-2 bg-navy text-white font-bold px-5 py-3 rounded-full hover:bg-navy-light transition-colors cursor-pointer"
              >
                <ShieldAlert size={18} /> Report as phishing
              </button>
              <button
                type="button"
                onClick={handleOpenLink}
                className="inline-flex items-center justify-center gap-2 bg-white text-navy font-bold px-5 py-3 rounded-full border-2 border-navy/15 hover:border-navy/30 transition-colors cursor-pointer"
              >
                <Link2 size={18} /> Looks safe — open link
              </button>
            </div>
            <p className="text-xs text-navy/40 mt-3">
              Everything here is simulated and safe. Clicking a scam link just triggers a
              lesson — no real risk.
            </p>
          </>
        ) : (
          <OutcomeBanner email={email} />
        )}
      </div>
    </div>
  );
}
