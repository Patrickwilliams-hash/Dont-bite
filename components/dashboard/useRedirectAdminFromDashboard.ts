"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useMockStore } from "@/lib/use-mock-store";

export function useRedirectAdminFromDashboard(): boolean {
  const store = useMockStore();
  const router = useRouter();
  const [redirecting, setRedirecting] = useState(store.user?.role === "admin");

  useEffect(() => {
    if (!store.user) {
      setRedirecting(false);
      return;
    }

    if (store.user.role === "admin") {
      router.replace("/admin");
      setRedirecting(true);
      return;
    }

    let mounted = true;

    async function verifyRole() {
      try {
        const res = await fetch("/api/auth/session");
        if (!mounted || !res.ok) return;
        const payload = (await res.json()) as { user?: { role?: string } };
        if (payload.user?.role === "admin") {
          setRedirecting(true);
          router.replace("/admin");
        }
      } catch {
        // Keep dashboard available if session check fails unexpectedly.
      }
    }

    verifyRole();
    return () => {
      mounted = false;
    };
  }, [store.user, router]);

  return redirecting;
}
