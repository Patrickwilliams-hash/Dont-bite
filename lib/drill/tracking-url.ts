export function buildDrillTrackingUrl(appUrl: string, rawTrackingToken: string): string {
  const base = appUrl.replace(/\/$/, "");
  return `${base}/drill/${rawTrackingToken}`;
}

export function extractRawTrackingTokenFromUrl(trackingUrl: string): string | null {
  const match = trackingUrl.match(/\/drill\/([0-9a-f]{64})(?:[/?#]|$)/);
  return match?.[1] ?? null;
}
