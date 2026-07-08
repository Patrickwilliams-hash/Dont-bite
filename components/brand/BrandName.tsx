import { cn } from "@/lib/utils";

interface BrandNameProps {
  className?: string;
  size?: "sm" | "md" | "lg";
}

const sizeClasses = {
  sm: "brand-name--sm",
  md: "brand-name--md",
  lg: "brand-name--lg",
};

export function BrandName({ className, size = "md" }: BrandNameProps) {
  return (
    <span className={cn("brand-name", sizeClasses[size], className)}>
      <span className="brand-name-dont">Don&apos;t</span>
      <span className="brand-name-bite">Bite</span>
    </span>
  );
}
