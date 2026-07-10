"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, LogOut } from "lucide-react";
import { logout } from "@/lib/mock-store";

interface AdminProfile {
  name: string;
  email: string;
  adminTier: "super_admin" | "administrator";
  adminTierLabel: string;
  permissionsSummary: string;
}

export function AdminAccountMenu() {
  const router = useRouter();
  const menuRef = useRef<HTMLDivElement>(null);
  const [profile, setProfile] = useState<AdminProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;

    async function loadProfile() {
      try {
        const res = await fetch("/api/admin/me");
        if (!mounted) return;
        if (!res.ok) {
          setError("Could not load administrator profile.");
          return;
        }
        const payload = (await res.json()) as { administrator?: AdminProfile };
        if (payload.administrator) {
          setProfile(payload.administrator);
        }
      } catch {
        if (mounted) setError("Could not load administrator profile.");
      } finally {
        if (mounted) setLoading(false);
      }
    }

    loadProfile();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (!menuRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    logout();
    router.replace("/admin/login");
  }

  if (loading) {
    return (
      <div className="rounded-lg border border-navy/10 bg-white/90 px-3 py-2 text-sm text-navy/50">
        Loading account…
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="rounded-lg border border-coral/20 bg-coral/10 px-3 py-2 text-sm text-coral font-bold">
        {error || "Administrator profile unavailable."}
      </div>
    );
  }

  return (
    <div className="relative" ref={menuRef}>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="inline-flex items-center gap-2 rounded-lg border border-navy/10 bg-white/90 px-3 py-2 text-sm font-bold text-navy hover:bg-blush/40 transition-colors"
        aria-expanded={open}
        aria-haspopup="menu"
      >
        <span className="text-left">
          <span className="block">{profile.name}</span>
          <span className="block text-[0.68rem] font-extrabold uppercase tracking-wide text-coral-dark/90">
            {profile.adminTierLabel}
          </span>
        </span>
        <ChevronDown size={16} className="text-navy/50" />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 mt-2 w-72 rounded-xl border border-navy/10 bg-white shadow-xl p-3 z-20"
        >
          <p className="text-sm font-bold text-navy">{profile.name}</p>
          <p className="text-xs text-navy/60 mb-2">{profile.email}</p>
          <p className="text-xs font-extrabold uppercase tracking-wide text-navy/45 mb-1">
            Administrator type
          </p>
          <p className="text-sm text-navy mb-3">{profile.adminTierLabel}</p>
          <p className="text-xs font-extrabold uppercase tracking-wide text-navy/45 mb-1">
            Permissions
          </p>
          <p className="text-sm text-navy/70 mb-4 leading-snug">{profile.permissionsSummary}</p>
          <button
            type="button"
            role="menuitem"
            onClick={handleLogout}
            className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-navy/10 px-3 py-2 text-sm font-bold text-navy hover:bg-blush/40"
          >
            <LogOut size={15} />
            Log out
          </button>
        </div>
      )}
    </div>
  );
}
