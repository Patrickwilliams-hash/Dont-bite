"use client";

import { Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useMockStore } from "@/lib/use-mock-store";
import { markEmailRead } from "@/lib/mock-store";
import { InboxList, EmailDetail } from "@/components/dashboard/InboxList";
import { Card } from "@/components/ui/Card";
import { ArrowLeft, Mail, Info } from "lucide-react";

function InboxContent() {
  const store = useMockStore();
  const router = useRouter();
  const searchParams = useSearchParams();
  const emailId = searchParams.get("email");
  const selected = store.emails.find((e) => e.id === emailId);

  useEffect(() => {
    if (!store.user) router.push("/signup");
    if (emailId && selected) markEmailRead(emailId);
  }, [store.user, router, emailId, selected]);

  if (!store.user) return null;

  const unread = store.emails.filter((e) => !e.read).length;
  const pending = store.emails.filter((e) => e.outcome === "pending").length;

  return (
    <div className="max-w-5xl mx-auto px-5 md:px-10 py-12">
      <Link
        href="/dashboard"
        className="inline-flex items-center gap-2 text-sm font-bold text-navy/60 hover:text-orange mb-6"
      >
        <ArrowLeft size={16} /> Back to dashboard
      </Link>

      <div className="flex items-center gap-3 mb-4">
        <Mail className="w-6 h-6 text-orange" />
        <h1 className="font-display text-2xl font-black text-navy">Your inbox</h1>
      </div>

      <div className="flex items-start gap-3 rounded-2xl bg-navy/5 border border-navy/10 p-4 mb-6">
        <Info className="w-5 h-5 text-navy/50 shrink-0 mt-0.5" />
        <p className="text-sm text-navy/70 leading-relaxed">
          In the live product these drills land in your actual email, mixed with normal mail.
          Some messages here are <strong>genuine</strong>, some
          are <strong>simulated scams</strong>. Read each one and decide: report it, or trust
          it. Click a scam link and Phil will step in with a lesson.
          {pending > 0 && (
            <span className="block mt-1 font-bold text-navy">
              {pending} message{pending > 1 ? "s" : ""} still need your call.
            </span>
          )}
        </p>
      </div>

      <div className="grid md:grid-cols-5 gap-6">
        <Card className="md:col-span-2 !p-0 overflow-hidden">
          <div className="p-4 border-b border-navy/10">
            <p className="text-sm font-bold text-navy">
              {store.emails.length} emails · {unread} unread
            </p>
          </div>
          <InboxList emails={store.emails} activeId={selected?.id} />
        </Card>

        <Card className="md:col-span-3 min-h-[420px]">
          {selected ? (
            <EmailDetail email={selected} />
          ) : (
            <div className="h-full flex items-center justify-center text-navy/40 text-sm">
              Select an email to read
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}

export default function InboxPage() {
  return (
    <Suspense fallback={<div className="p-10 text-center text-navy/50">Loading inbox...</div>}>
      <InboxContent />
    </Suspense>
  );
}
