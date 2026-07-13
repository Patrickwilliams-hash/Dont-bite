import { generateTrackingToken, hashTrackingToken } from "@/lib/drill/tracking-token";
import {
  buildDrillTrackingUrl,
  extractRawTrackingTokenFromUrl,
} from "@/lib/drill/tracking-url";

export interface DrillDeliveryTracking {
  rawTrackingToken: string;
  trackingTokenHash: string;
  trackingUrl: string;
}

export function createDeliveryTracking(
  appUrl: string,
  rawTrackingToken?: string
): DrillDeliveryTracking {
  const token = rawTrackingToken ?? generateTrackingToken();
  const trackingTokenHash = hashTrackingToken(token);
  const trackingUrl = buildDrillTrackingUrl(appUrl, token);

  assertTrackingCredentialsMatch({
    rawTrackingToken: token,
    trackingTokenHash,
    trackingUrl,
  });

  return {
    rawTrackingToken: token,
    trackingTokenHash,
    trackingUrl,
  };
}

export function assertTrackingCredentialsMatch(tracking: DrillDeliveryTracking): void {
  const urlToken = extractRawTrackingTokenFromUrl(tracking.trackingUrl);
  if (!urlToken) {
    throw new Error("Drill tracking URL does not contain a valid token.");
  }
  if (urlToken !== tracking.rawTrackingToken) {
    throw new Error("Drill tracking URL token does not match the generated raw token.");
  }
  if (hashTrackingToken(urlToken) !== tracking.trackingTokenHash) {
    throw new Error("Drill tracking token hash does not match the generated raw token.");
  }
}
