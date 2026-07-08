import { cn } from "@/lib/utils";
import { ReactNode } from "react";

export function Card({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-[var(--radius-card)] bg-white/85 border border-white shadow-[var(--shadow-soft)] p-6",
        className
      )}
    >
      {children}
    </div>
  );
}

export function StatCard({
  label,
  value,
  sub,
  className,
}: {
  label: string;
  value: string | number;
  sub?: string;
  className?: string;
}) {
  return (
    <Card className={cn("text-center", className)}>
      <p className="text-sm font-extrabold text-coral-dark uppercase tracking-wide">{label}</p>
      <p className="text-4xl font-black text-navy mt-2">{value}</p>
      {sub && <p className="text-sm text-muted mt-1">{sub}</p>}
    </Card>
  );
}

export function Badge({
  children,
  variant = "default",
}: {
  children: React.ReactNode;
  variant?: "default" | "warning" | "success";
}) {
  const variants = {
    default: "bg-navy/10 text-navy",
    warning: "bg-coral/15 text-coral-dark",
    success: "bg-mint/50 text-navy",
  };
  return (
    <span
      className={cn(
        "inline-block rounded-full px-3 py-1 text-xs font-extrabold uppercase tracking-wide",
        variants[variant]
      )}
    >
      {children}
    </span>
  );
}

export function IconCircle({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "w-16 h-16 rounded-full bg-blush flex items-center justify-center text-navy shadow-inner",
        className
      )}
    >
      {children}
    </div>
  );
}
