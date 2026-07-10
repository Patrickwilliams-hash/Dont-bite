import "server-only";

import crypto from "node:crypto";

const TRACKING_TOKEN_BYTE_LENGTH = 32;
const TRACKING_TOKEN_HEX_LENGTH = TRACKING_TOKEN_BYTE_LENGTH * 2;

export function generateTrackingToken(): string {
  return crypto.randomBytes(TRACKING_TOKEN_BYTE_LENGTH).toString("hex");
}

export function hashTrackingToken(rawToken: string): string {
  return crypto.createHash("sha256").update(rawToken).digest("hex");
}

export function isValidTrackingTokenFormat(rawToken: string): boolean {
  return (
    rawToken.length === TRACKING_TOKEN_HEX_LENGTH &&
    /^[0-9a-f]+$/.test(rawToken)
  );
}
