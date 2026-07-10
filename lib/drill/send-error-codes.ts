export const DRILL_SEND_ERROR_CODES = {
  SMTP_REJECTED: "smtp_rejected",
  RENDER_FAILED: "render_failed",
  PROVIDER_TIMEOUT: "provider_timeout",
  UNKNOWN: "unknown",
} as const;

export type DrillSendErrorCode =
  (typeof DRILL_SEND_ERROR_CODES)[keyof typeof DRILL_SEND_ERROR_CODES];
