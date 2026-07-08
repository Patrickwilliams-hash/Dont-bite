"use client";

import { useEffect, useState } from "react";
import { PhilMascot } from "./PhilMascot";

const tips = [
  "Hover over links before you click — the real URL shows in the corner!",
  "Free trials aren't free if they need your card number.",
  "Banks won't ask you to verify via email links. Ever.",
  "When in doubt, close the email and log in directly.",
  "If it feels urgent, it's probably a scam. Take a breath.",
];

export function PhilPeekWidget() {
  const [tipIndex, setTipIndex] = useState(0);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const interval = setInterval(() => {
      setTipIndex((i) => (i + 1) % tips.length);
    }, 6000);
    return () => clearInterval(interval);
  }, []);

  if (!visible) return null;

  return (
    <div className="fixed bottom-0 right-4 z-40 max-w-xs hidden md:block">
      <div className="relative bg-white rounded-t-2xl shadow-2xl border border-navy/10 p-4 pb-2">
        <button
          type="button"
          onClick={() => setVisible(false)}
          className="absolute top-2 right-2 text-navy/40 hover:text-navy text-xs cursor-pointer"
          aria-label="Dismiss Phil"
        >
          ✕
        </button>
        <div className="flex gap-3 items-end">
          <div className="shrink-0 -mb-2">
            <PhilMascot pose="peek" size={72} />
          </div>
          <div className="pb-2">
            <p className="text-xs font-bold text-orange uppercase tracking-wide">Phil says</p>
            <p className="text-sm text-navy/80 leading-snug mt-1">{tips[tipIndex]}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
