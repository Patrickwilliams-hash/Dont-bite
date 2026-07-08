"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface AccordionItem {
  question: string;
  answer: string;
}

export function Accordion({ items }: { items: AccordionItem[] }) {
  const [open, setOpen] = useState<number | null>(0);

  return (
    <div className="space-y-3">
      {items.map((item, i) => (
        <div
          key={item.question}
          className="rounded-2xl bg-white/80 border border-white overflow-hidden"
        >
          <button
            type="button"
            className="w-full flex items-center justify-between gap-4 p-5 text-left font-bold text-navy cursor-pointer"
            onClick={() => setOpen(open === i ? null : i)}
            aria-expanded={open === i}
          >
            {item.question}
            <ChevronDown
              className={cn(
                "w-5 h-5 shrink-0 transition-transform text-orange",
                open === i && "rotate-180"
              )}
            />
          </button>
          {open === i && (
            <div className="px-5 pb-5 text-navy/70 leading-relaxed">{item.answer}</div>
          )}
        </div>
      ))}
    </div>
  );
}
