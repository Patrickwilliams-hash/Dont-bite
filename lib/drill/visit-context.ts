import "server-only";

import crypto from "node:crypto";

export interface DrillVisitContext {
  ipHash?: string;
  userAgent?: string;
}

export function getDrillVisitContext(headers: Headers): DrillVisitContext {
  const forwarded = headers.get("x-forwarded-for");
  const ip = forwarded?.split(",")[0]?.trim() || headers.get("x-real-ip") || "";
  const userAgent = headers.get("user-agent")?.slice(0, 200) ?? undefined;

  return {
    userAgent,
    ipHash: ip
      ? crypto.createHash("sha256").update(ip).digest("hex").slice(0, 16)
      : undefined,
  };
}
