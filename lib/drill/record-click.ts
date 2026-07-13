import "server-only";

import type { DrillDeliveryPurpose, DrillDeliveryStatus, DrillOutcome } from "@prisma/client";
import { db } from "@/lib/db";
import { hashTrackingToken, isValidTrackingTokenFormat } from "@/lib/drill/tracking-token";
import { parseDebriefTemplateContent, type DebriefTemplateContent } from "@/lib/drill/template-content";
import type { DrillVisitContext } from "@/lib/drill/visit-context";

export const DRILL_LINK_EVENT_TYPE = "link_clicked" as const;

export type DrillVisitResult =
  | { type: "not_found" }
  | { type: "expired" }
  | {
      type: "debrief";
      content: DebriefTemplateContent;
      purpose: DrillDeliveryPurpose;
      outcome: DrillOutcome;
    };

interface ResolvedDelivery {
  id: string;
  status: DrillDeliveryStatus;
  purpose: DrillDeliveryPurpose;
  outcome: DrillOutcome;
  expiresAt: Date;
  template: Parameters<typeof parseDebriefTemplateContent>[0];
}

async function findSentDeliveryByTokenHash(
  trackingTokenHash: string
): Promise<ResolvedDelivery | null> {
  const delivery = await db.drillDelivery.findUnique({
    where: { trackingTokenHash },
    select: {
      id: true,
      status: true,
      purpose: true,
      outcome: true,
      expiresAt: true,
      template: {
        select: {
          title: true,
          scamType: true,
          brandName: true,
          fakeDomain: true,
          realDomainHint: true,
          redFlags: true,
          whyDangerous: true,
          howToSpot: true,
          learnSlug: true,
        },
      },
    },
  });

  if (!delivery || delivery.status !== "sent") {
    return null;
  }

  return delivery;
}

async function recordFirstClickIfPending(
  deliveryId: string,
  context: DrillVisitContext
): Promise<boolean> {
  let recorded = false;

  await db.$transaction(async (tx) => {
    const updated = await tx.drillDelivery.updateMany({
      where: {
        id: deliveryId,
        outcome: "pending",
      },
      data: {
        outcome: "link_followed",
        caughtAt: new Date(),
      },
    });

    if (updated.count !== 1) {
      return;
    }

    recorded = true;

    await tx.drillEvent.create({
      data: {
        deliveryId,
        eventType: DRILL_LINK_EVENT_TYPE,
        ipHash: context.ipHash,
        userAgent: context.userAgent,
      },
    });
  });

  return recorded;
}

export async function resolveDrillVisit(
  rawToken: string,
  context: DrillVisitContext
): Promise<DrillVisitResult> {
  if (!isValidTrackingTokenFormat(rawToken)) {
    return { type: "not_found" };
  }

  const trackingTokenHash = hashTrackingToken(rawToken);
  const delivery = await findSentDeliveryByTokenHash(trackingTokenHash);

  if (!delivery) {
    return { type: "not_found" };
  }

  if (delivery.expiresAt.getTime() <= Date.now()) {
    return { type: "expired" };
  }

  const justRecorded = await recordFirstClickIfPending(delivery.id, context);
  const displayOutcome: DrillOutcome = justRecorded ? "link_followed" : delivery.outcome;

  return {
    type: "debrief",
    content: parseDebriefTemplateContent(delivery.template),
    purpose: delivery.purpose,
    outcome: displayOutcome,
  };
}
