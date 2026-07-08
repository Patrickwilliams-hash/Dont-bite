import { Lock } from "lucide-react";

export function FakeUrlBar({
  fakeDomain,
  realDomainHint,
}: {
  fakeDomain: string;
  realDomainHint: string;
}) {
  return (
    <div className="bg-navy/5 border border-navy/10 rounded-xl p-3 mb-6">
      <div className="flex items-center gap-2 bg-white rounded-lg px-3 py-2 border border-navy/15">
        <Lock className="w-4 h-4 text-green-600 shrink-0" />
        <span className="text-sm font-mono text-red-600 line-through decoration-2">
          https://{fakeDomain}
        </span>
      </div>
      <p className="text-xs text-navy/50 mt-2">
        ⚠️ Training URL — real site would be{" "}
        <span className="font-mono text-green-700">{realDomainHint}</span>
      </p>
    </div>
  );
}
