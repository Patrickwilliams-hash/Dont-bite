import "server-only";

import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
/** One successful ParcelPath demo per user every 24 hours. */
export const DEMO_DRILL_COOLDOWN_MS = 24 * 60 * 60 * 1000;

export const DEMO_COOLDOWN_CODE = "DEMO_COOLDOWN" as const;

export const DEMO_COOLDOWN_MESSAGE =
  "You've already requested a demo recently. Try again later.";

export interface DemoCooldownStatus {
  canRequest: boolean;
  code?: typeof DEMO_COOLDOWN_CODE;
  message?: string;
}

/** Namespace for demo-send advisory locks (class id). */
const DEMO_DRILL_LOCK_CLASS = 73421;

export async function getDemoCooldownStatus(userId: string): Promise<DemoCooldownStatus> {
  const since = new Date(Date.now() - DEMO_DRILL_COOLDOWN_MS);

  const recentSent = await db.drillDelivery.findFirst({
    where: {
      userId,
      purpose: "demo",
      status: "sent",
      sentAt: { gte: since },
    },
    orderBy: { sentAt: "desc" },
    select: { id: true },
  });

  if (recentSent) {
    return {
      canRequest: false,
      code: DEMO_COOLDOWN_CODE,
      message: DEMO_COOLDOWN_MESSAGE,
    };
  }

  return { canRequest: true };
}

export async function hasInFlightDemoDelivery(userId: string): Promise<boolean> {
  const inFlight = await db.drillDelivery.findFirst({
    where: {
      userId,
      purpose: "demo",
      status: { in: ["queued", "sending"] },
    },
    select: { id: true },
  });
  return Boolean(inFlight);
}

/** Per-user transaction lock for demo send claims (not global). */
export async function acquireDemoSendUserLock(
  tx: Prisma.TransactionClient,
  userId: string
): Promise<void> {
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(${DEMO_DRILL_LOCK_CLASS}, hashtext(${userId}))`;
}
