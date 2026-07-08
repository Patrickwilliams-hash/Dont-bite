"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { Menu, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useMockStore } from "@/lib/use-mock-store";
import { BrandName } from "@/components/brand/BrandName";
import { logout } from "@/lib/mock-store";

const navLinks = [
  { href: "/", label: "Home" },
  { href: "/how-it-works", label: "How It Works" },
  { href: "/learn", label: "Common Scams" },
  { href: "/about", label: "About" },
];

export function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const { user } = useMockStore();

  function handleLogout() {
    logout();
    setOpen(false);
    router.push("/login");
  }

  return (
    <header className="site-header sticky top-0 z-50">
      <div className="site-header-inner">
        {/* Logo */}
        <Link href="/" className="site-brand" aria-label="Don't Bite home">
          <span className="site-brand-text">
            <BrandName />
            <span className="site-brand-tagline">Don&apos;t take the bait.</span>
          </span>
        </Link>

        {/* Desktop nav — centred */}
        <nav className="site-nav hidden lg:flex" aria-label="Main navigation">
          {navLinks.map((link) => {
            const active = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={cn("site-nav-link", active && "site-nav-link--active")}
                aria-current={active ? "page" : undefined}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        {/* Auth buttons */}
        <div className="site-header-actions hidden lg:flex">
          {user ? (
            <>
              <Link href="/dashboard" className="site-btn site-btn--primary">
                Dashboard
              </Link>
              <button type="button" className="site-btn site-btn--ghost" onClick={handleLogout}>
                Log Out
              </button>
            </>
          ) : (
            <>
              <Link href="/login" className="site-btn site-btn--ghost">
                Log In
              </Link>
              <Link href="/signup" className="site-btn site-btn--primary">
                Sign Up Free
              </Link>
            </>
          )}
        </div>

        {/* Mobile menu toggle */}
        <button
          type="button"
          className="site-menu-btn lg:hidden"
          onClick={() => setOpen(!open)}
          aria-label="Toggle menu"
          aria-expanded={open}
        >
          {open ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>

      {/* Mobile drawer */}
      {open && (
        <div className="site-mobile-nav lg:hidden">
          <nav className="flex flex-col gap-1">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "site-mobile-link",
                  pathname === link.href && "site-mobile-link--active"
                )}
                onClick={() => setOpen(false)}
              >
                {link.label}
              </Link>
            ))}
          </nav>
          <div className="flex flex-col gap-2 mt-4 pt-4 border-t border-navy/10">
            {user ? (
              <>
                <Link
                  href="/dashboard"
                  className="site-btn site-btn--primary text-center"
                  onClick={() => setOpen(false)}
                >
                  Dashboard
                </Link>
                <button
                  type="button"
                  className="site-btn site-btn--ghost text-center"
                  onClick={handleLogout}
                >
                  Log Out
                </button>
              </>
            ) : (
              <>
                <Link
                  href="/login"
                  className="site-btn site-btn--ghost text-center"
                  onClick={() => setOpen(false)}
                >
                  Log In
                </Link>
                <Link
                  href="/signup"
                  className="site-btn site-btn--primary text-center"
                  onClick={() => setOpen(false)}
                >
                  Sign Up Free
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
