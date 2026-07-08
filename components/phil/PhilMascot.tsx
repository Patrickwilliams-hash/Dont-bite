"use client";

import { cn } from "@/lib/utils";

export type PhilPose =
  | "wave"
  | "sign"
  | "intro"
  | "magnifier"
  | "surprised"
  | "peek"
  | "point"
  | "thinking"
  | "cool";

const POSE_IMAGES: Record<PhilPose, string> = {
  wave: "/mascot/phil-success.png",
  sign: "/mascot/phil-hero-sign.png",
  intro: "/mascot/phil-intro.png",
  magnifier: "/mascot/phil-magnifier.png",
  surprised: "/mascot/phil-warning.png",
  peek: "/mascot/phil-peek-right.png",
  point: "/mascot/phil-point.png",
  thinking: "/mascot/phil-thinking.png",
  cool: "/mascot/phil-cool.png",
};

interface PhilMascotProps {
  pose?: PhilPose;
  className?: string;
  size?: number;
  /** Let CSS control dimensions instead of inline width */
  responsive?: boolean;
  /** Use on dark/coral sections where the PNG black background blends in */
  onDark?: boolean;
}

export function PhilMascot({
  pose = "wave",
  className,
  size = 200,
  responsive = false,
  onDark = false,
}: PhilMascotProps) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={POSE_IMAGES[pose]}
      alt="Phil the mascot"
      width={responsive ? undefined : size}
      height={responsive ? undefined : size}
      className={cn(
        "h-auto max-w-full",
        onDark
          ? "drop-shadow-[0_18px_24px_rgba(0,0,0,0.35)]"
          : "drop-shadow-[0_22px_30px_rgba(60,40,30,0.22)]",
        className
      )}
      style={responsive ? undefined : { width: size, height: "auto" }}
    />
  );
}

export function PhilTip({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex gap-4 items-start rounded-[var(--radius-card)] bg-blush/60 border border-white p-5 shadow-[var(--shadow-soft)]">
      <PhilMascot pose="point" size={72} className="shrink-0" />
      <div>
        <p className="font-bold text-navy text-sm uppercase tracking-wide mb-1">Phil&apos;s Tip</p>
        <p className="text-muted leading-relaxed">{children}</p>
      </div>
    </div>
  );
}
