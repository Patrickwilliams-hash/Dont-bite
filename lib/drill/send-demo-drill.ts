import "server-only";

import { db } from "@/lib/db";
import { getEmailConfig } from "@/lib/email/config";
import { createDeliveryTracking } from "@/lib/drill/create-delivery-tracking";
import {
  DEMO_COOLDOWN_CODE,
  DEMO_COOLDOWN_MESSAGE,
  DEMO_DRILL_COOLDOWN_MS,
  acquireDemoSendUserLock,
} from "@/lib/drill/demo-cooldown";
import { ensureParcelPathTemplate } from "@/lib/drill/ensure-parcelpath-template";
import {
  DrillSendValidationError,
  DRILL_LINK_TTL_MS,
  finalizeDrillDeliverySend,
} from "@/lib/drill/send-drill";

export class DemoDrillCooldownError extends Error {
  readonly code = DEMO_COOLDOWN_CODE;

  constructor(message = DEMO_COOLDOWN_MESSAGE) {
    super(message);
    this.name = "DemoDrillCooldownError";
  }
}

export class DemoDrillInProgressError extends Error {
  constructor(message = "A demo drill is already being sent. Please wait a moment.") {
    super(message);
    this.name = "DemoDrillInProgressError";
  }
}

/**
 * User self-service ParcelPath demo drill.
 * Actor is the logged-in user; recipient is always loaded from the session user row.
 * No AdminAuditLog entry — DrillDelivery (purpose=demo) is the authoritative record.
 */
export async function sendSelfServiceDemoDrillAtomic(userId: string) {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { id: true, name: true, email: true, role: true, isActive: true },
  });

  if (!user) {
    throw new DrillSendValidationError("Account not found.");
  }
  if (user.role !== "user") {
    throw new DrillSendValidationError("Demo drills are only available for training user accounts.");
  }
  if (!user.isActive) {
    throw new DrillSendValidationError("Your account is inactive.");
  }

  const template = await ensureParcelPathTemplate();

  let appUrl: string;
  try {
    appUrl = getEmailConfig().appUrl;
  } catch {
    throw new DrillSendValidationError("Email delivery is not configured.");
  }

  const tracking = createDeliveryTracking(appUrl);
  const placeholderExpiresAt = new Date(Date.now() + DRILL_LINK_TTL_MS);

  const claim = await db.$transaction(async (tx) => {
    await acquireDemoSendUserLock(tx, userId);

    const since = new Date(Date.now() - DEMO_DRILL_COOLDOWN_MS);
    const recentSent = await tx.drillDelivery.findFirst({
      where: {
        userId,
        purpose: "demo",
        status: "sent",
        sentAt: { gte: since },
      },
      select: { id: true },
    });
    if (recentSent) {
      return { type: "cooldown" as const };
    }

    const inFlight = await tx.drillDelivery.findFirst({
      where: {
        userId,
        purpose: "demo",
        status: { in: ["queued", "sending"] },
      },
      select: { id: true },
    });
    if (inFlight) {
      return { type: "in_progress" as const };
    }

    const delivery = await tx.drillDelivery.create({
      data: {
        userId,
        templateId: template.id,
        trackingTokenHash: tracking.trackingTokenHash,
        status: "queued",
        purpose: "demo",
        outcome: "pending",
        expiresAt: placeholderExpiresAt,
        triggeredByUserId: null,
      },
      select: { id: true },
    });

    return { type: "ok" as const, deliveryId: delivery.id };
  });

  if (claim.type === "cooldown") {
    throw new DemoDrillCooldownError();
  }
  if (claim.type === "in_progress") {
    throw new DemoDrillInProgressError();
  }

  return finalizeDrillDeliverySend({
    deliveryId: claim.deliveryId,
    template,
    recipient: { name: user.name, email: user.email },
    tracking,
  });
}
