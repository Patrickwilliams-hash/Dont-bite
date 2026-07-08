import Link from "next/link";
import { cn } from "@/lib/utils";
import { ButtonHTMLAttributes, forwardRef } from "react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "coral" | "secondary" | "ghost" | "navy";
  size?: "sm" | "md" | "lg";
  href?: string;
}

const variants = {
  primary: "bg-navy text-white hover:bg-navy-light shadow-lg shadow-navy/15",
  coral: "bg-coral text-white hover:bg-coral-dark shadow-lg shadow-coral/20",
  secondary: "bg-gold text-navy hover:bg-gold/90 shadow-lg shadow-gold/20",
  ghost: "bg-white text-navy hover:bg-white/90 border-2 border-navy/10",
  navy: "bg-navy text-white hover:bg-navy-light",
};

const sizes = {
  sm: "px-4 py-2 text-sm",
  md: "px-6 py-3 text-base",
  lg: "px-8 py-4 text-lg",
};

function buttonClasses(
  variant: ButtonProps["variant"],
  size: ButtonProps["size"],
  className?: string
) {
  return cn(
    "inline-flex items-center justify-center gap-2 rounded-full font-extrabold transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed",
    variants[variant ?? "primary"],
    sizes[size ?? "md"],
    className
  );
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", href, children, ...props }, ref) => {
    const classes = buttonClasses(variant, size, className);

    if (href) {
      return (
        <Link href={href} className={classes}>
          {children}
        </Link>
      );
    }

    return (
      <button ref={ref} className={classes} {...props}>
        {children}
      </button>
    );
  }
);
Button.displayName = "Button";
