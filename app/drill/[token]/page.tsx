import { headers } from "next/headers";
import { PhilDebrief } from "@/components/drill/PhilDebrief";
import { resolveDrillVisit } from "@/lib/drill/record-click";
import { getDrillVisitContext } from "@/lib/drill/visit-context";

export default async function DrillTokenPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const requestHeaders = await headers();
  const result = await resolveDrillVisit(token, getDrillVisitContext(requestHeaders));

  if (result.type === "not_found") {
    return (
      <div className="max-w-xl mx-auto px-5 py-20 text-center">
        <h1 className="font-display text-2xl font-black text-navy mb-2">Lesson not found</h1>
        <p className="text-navy/60 text-sm">
          This training link is not valid. If you expected a drill debrief, check the link in your
          email or contact support.
        </p>
      </div>
    );
  }

  if (result.type === "expired") {
    return (
      <div className="max-w-xl mx-auto px-5 py-20 text-center">
        <h1 className="font-display text-2xl font-black text-navy mb-2">This link has expired</h1>
        <p className="text-navy/60 text-sm">
          Training drill links are only available for a limited time. Your next drill debrief will
          appear when a new training email is sent.
        </p>
      </div>
    );
  }

  return (
    <PhilDebrief
      content={result.content}
      purpose={result.purpose}
      outcome={result.outcome}
    />
  );
}
