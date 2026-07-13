import "server-only";

import type { DrillDeliveryPurpose, DrillDeliveryStatus } from "@prisma/client";
import { db } from "@/lib/db";
import { getEmailConfig } from "@/lib/email/config";
import { EmailSendError, sendEmail } from "@/lib/email/mailer";
import { buildDrillEmail, recipientFirstName } from "@/lib/email/templates/drill-email";
import { createDeliveryTracking } from "@/lib/drill/create-delivery-tracking";
import { parcelPathDrillDefinition, PARCELPATH_DRILL_SLUG } from "@/lib/drill/parcelpath-template";
import {
  DRILL_SEND_ERROR_CODES,
  type DrillSendErrorCode,
} from "@/lib/drill/send-error-codes";
import {
  isDrillSendTestCaptureEnabled,
  writeDrillSendTestCapture,
} from "@/lib/drill/send-drill-test-capture";

export const DRILL_LINK_TTL_MS = 1000 * 60 * 60 * 24 * 14;

/**
 * Future expiry processing (not implemented in Stage 3A):
 * - pending training deliveries past expiresAt → no_interaction
 * - demo deliveries may expire but never affect scoring or progression
 */
export const DRILL_EXPIRY_NOTE =
  "Training deliveries that remain pending until expiresAt will later be marked no_interaction by a scheduled sweep.";

export class DrillSendValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DrillSendValidationError";
  }
}

export class DrillSendDeliveryError extends Error {
  readonly deliveryId: string;
  readonly sendErrorCode: DrillSendErrorCode;

  constructor(deliveryId: string, sendErrorCode: DrillSendErrorCode, message: string) {
    super(message);
    this.name = "DrillSendDeliveryError";
    this.deliveryId = deliveryId;
    this.sendErrorCode = sendErrorCode;
  }
}

export interface DrillSendInput {
  templateId: string;
  userId: string;
  purpose: DrillDeliveryPurpose;
  triggeredByUserId: string | null;
  /** When true, recipient must have trainingActive. Training-purpose sends only. */
  requireTrainingActive?: boolean;
}

export interface DrillSendResult {
  deliveryId: string;
  status: Extract<DrillDeliveryStatus, "sent">;
}

export interface ManualDrillSendInput {
  templateId: string;
  userId: string;
  triggeredByUserId: string;
}

function classifySendError(error: unknown): DrillSendErrorCode {
  if (error instanceof EmailSendError) {
    return DRILL_SEND_ERROR_CODES.SMTP_REJECTED;
  }
  return DRILL_SEND_ERROR_CODES.UNKNOWN;
}

function getEmailContentForTemplate(
  template: {
    slug: string;
    brandName: string;
    emailSubject: string | null;
    emailPreviewText: string | null;
  },
  recipientName: string,
  trackingUrl: string
) {
  if (template.slug === PARCELPATH_DRILL_SLUG) {
    return buildDrillEmail({
      senderDisplayName: parcelPathDrillDefinition.emailSenderDisplayName,
      subject: template.emailSubject ?? parcelPathDrillDefinition.emailSubject,
      previewText: template.emailPreviewText ?? parcelPathDrillDefinition.emailPreviewText,
      recipientFirstName: recipientFirstName(recipientName),
      brandName: template.brandName,
      scenarioMessage: parcelPathDrillDefinition.emailScenarioMessage,
      ctaLabel: parcelPathDrillDefinition.emailCtaLabel,
      trackingUrl,
    });
  }

  throw new DrillSendValidationError("This drill template is not enabled for sending yet.");
}

async function loadRecipient(
  userId: string,
  options: { requireTrainingActive: boolean }
) {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      isActive: true,
      trainingActive: true,
    },
  });

  if (!user) {
    throw new DrillSendValidationError("Recipient not found.");
  }
  if (user.role !== "user") {
    throw new DrillSendValidationError("Drills can only be sent to training user accounts.");
  }
  if (!user.isActive) {
    throw new DrillSendValidationError("This user account is inactive.");
  }
  if (options.requireTrainingActive && !user.trainingActive) {
    throw new DrillSendValidationError("This user has paused training emails.");
  }

  return user;
}

async function loadActiveTemplate(templateId: string) {
  const template = await db.drillTemplate.findUnique({
    where: { id: templateId },
    select: {
      id: true,
      slug: true,
      title: true,
      brandName: true,
      emailSubject: true,
      emailPreviewText: true,
      isActive: true,
    },
  });

  if (!template) {
    throw new DrillSendValidationError("Drill template not found.");
  }
  if (!template.isActive) {
    throw new DrillSendValidationError("This drill template is inactive.");
  }

  return template;
}

export async function finalizeDrillDeliverySend(input: {
  deliveryId: string;
  template: Awaited<ReturnType<typeof loadActiveTemplate>>;
  recipient: { name: string; email: string };
  tracking: ReturnType<typeof createDeliveryTracking>;
}): Promise<DrillSendResult> {
  const { deliveryId, template, recipient, tracking } = input;

  const claimed = await db.drillDelivery.updateMany({
    where: {
      id: deliveryId,
      status: "queued",
    },
    data: {
      status: "sending",
    },
  });

  if (claimed.count !== 1) {
    throw new DrillSendDeliveryError(
      deliveryId,
      DRILL_SEND_ERROR_CODES.UNKNOWN,
      "This drill delivery could not be claimed for sending."
    );
  }

  let emailContent;
  try {
    emailContent = getEmailContentForTemplate(
      template,
      recipient.name,
      tracking.trackingUrl
    );
  } catch (error) {
    await db.drillDelivery.update({
      where: { id: deliveryId },
      data: {
        status: "failed",
        sendErrorCode: DRILL_SEND_ERROR_CODES.RENDER_FAILED,
      },
    });
    throw new DrillSendDeliveryError(
      deliveryId,
      DRILL_SEND_ERROR_CODES.RENDER_FAILED,
      error instanceof Error ? error.message : "Failed to render drill email."
    );
  }

  if (isDrillSendTestCaptureEnabled()) {
    await writeDrillSendTestCapture({
      deliveryId,
      trackingTokenHash: tracking.trackingTokenHash,
      trackingUrl: tracking.trackingUrl,
      emailHtml: emailContent.html,
      emailText: emailContent.text,
      rawTrackingToken: tracking.rawTrackingToken,
    });
  }

  try {
    await sendEmail({
      to: recipient.email,
      subject: emailContent.subject,
      text: emailContent.text,
      html: emailContent.html,
      fromName: emailContent.senderDisplayName,
    });
  } catch (error) {
    const sendErrorCode = classifySendError(error);
    await db.drillDelivery.update({
      where: { id: deliveryId },
      data: {
        status: "failed",
        sendErrorCode,
      },
    });
    throw new DrillSendDeliveryError(
      deliveryId,
      sendErrorCode,
      "The drill email could not be delivered. Please try again shortly."
    );
  }

  const sentAt = new Date();
  await db.drillDelivery.update({
    where: { id: deliveryId },
    data: {
      status: "sent",
      sentAt,
      expiresAt: new Date(sentAt.getTime() + DRILL_LINK_TTL_MS),
    },
  });

  return {
    deliveryId,
    status: "sent",
  };
}

export async function sendDrill(input: DrillSendInput): Promise<DrillSendResult> {
  const requireTrainingActive =
    input.requireTrainingActive ?? input.purpose === "training";

  const [template, recipient] = await Promise.all([
    loadActiveTemplate(input.templateId),
    loadRecipient(input.userId, { requireTrainingActive }),
  ]);

  let appUrl: string;
  try {
    appUrl = getEmailConfig().appUrl;
  } catch {
    throw new DrillSendValidationError("Email delivery is not configured.");
  }

  const tracking = createDeliveryTracking(appUrl);
  const placeholderExpiresAt = new Date(Date.now() + DRILL_LINK_TTL_MS);

  const delivery = await db.drillDelivery.create({
    data: {
      userId: recipient.id,
      templateId: template.id,
      trackingTokenHash: tracking.trackingTokenHash,
      status: "queued",
      purpose: input.purpose,
      outcome: "pending",
      expiresAt: placeholderExpiresAt,
      triggeredByUserId: input.triggeredByUserId,
    },
    select: { id: true },
  });

  return finalizeDrillDeliverySend({
    deliveryId: delivery.id,
    template,
    recipient,
    tracking,
  });
}

/** Admin-initiated manual sends are demo deliveries and do not count toward training results. */
export async function sendDrillManually(
  input: ManualDrillSendInput
): Promise<DrillSendResult> {
  return sendDrill({
    templateId: input.templateId,
    userId: input.userId,
    purpose: "demo",
    triggeredByUserId: input.triggeredByUserId,
    requireTrainingActive: true,
  });
}
