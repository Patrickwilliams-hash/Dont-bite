"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { logout, setLocalUserSession, type DrillFrequency } from "@/lib/mock-store";

export function SiteChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isDrill = pathname.startsWith("/drill");

  useEffect(() => {
    let mounted = true;

    async function syncSession() {
      try {
        const res = await fetch("/api/auth/session", { method: "GET" });
        if (!mounted) return;
        if (!res.ok) {
          if (res.status === 401) logout();
          return;
        }
        const payload = (await res.json()) as {
          user?: {
            name: string;
            email: string;
            frequency: DrillFrequency;
            joinedAt: string;
            trainingActive: boolean;
          };
        };
        if (payload.user) {
          setLocalUserSession(payload.user);
        }
      } catch {
        // Keep current client state if session check fails unexpectedly.
      }
    }

    syncSession();
    return () => {
      mounted = false;
    };
  }, []);

  if (isDrill) {
    return <>{children}</>;
  }

  return (
    <>
      <Header />
      <main>{children}</main>
      <Footer />
    </>
  );
}
