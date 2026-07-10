"use client";

import { useEffect, useState } from "react";
import type { Stats } from "@/lib/mock-store";
import { defaultStats } from "@/lib/mock-store";

export function useTrainingStats() {
  const [stats, setStats] = useState<Stats>(defaultStats());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;

    async function load() {
      setLoading(true);
      setError("");
      try {
        const res = await fetch("/api/drills/stats");
        const payload = (await res.json()) as { error?: string; stats?: Stats };
        if (!mounted) return;
        if (!res.ok || !payload.stats) {
          setError(payload.error ?? "Could not load training stats.");
          return;
        }
        setStats(payload.stats);
      } catch {
        if (mounted) setError("Could not load training stats.");
      } finally {
        if (mounted) setLoading(false);
      }
    }

    void load();
    return () => {
      mounted = false;
    };
  }, []);

  return { stats, loading, error };
}
