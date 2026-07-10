import "server-only";

import { buildSystemEmail } from "@/lib/email/templates/system-email";

const GENUINE_FOOTER =
  "This is a genuine Don't Bite account message. Don't Bite will never ask you to reply with your password or banking details.";

export interface EmailContent {
  subject: string;
  text: string;
  html: string;
}

/** Sent to the NEW address with the six-digit verification code. */
export function buildEmailChangeVerificationEmail(code: string): EmailContent {
  return buildSystemEmail({
    subject: "Verify your new Don't Bite email address",
    preheader: "Enter this code to confirm your new email address. It expires in 15 minutes.",
    heading: "Verify your new email address",
    bodyParagraphs: [
      "Someone asked to use this email address for a Don't Bite account.",
      "Enter the verification code below in your account settings to confirm the change. The code expires in 15 minutes.",
      "Your account email will not change until this code is entered.",
    ],
    highlightCode: code,
    secondaryText:
      "If you didn't request this, you can safely ignore this email and nothing will change.",
    footerNote: GENUINE_FOOTER,
  });
}

/** Sent to the OLD address after the change completes. */
export function buildEmailChangedNoticeEmail(): EmailContent {
  return buildSystemEmail({
    subject: "Your Don't Bite email address was changed",
    preheader: "The email address on your Don't Bite account was changed.",
    heading: "Your email address was changed",
    bodyParagraphs: [
      "The email address on your Don't Bite account was just changed, and this address is no longer used to log in.",
      "If you made this change, no action is needed.",
      "If you did not make this change, contact the Don't Bite support team immediately so the account can be secured. Your previous email address can no longer be used to sign in.",
    ],
    footerNote: GENUINE_FOOTER,
  });
}

/** Sent to the NEW address after the change completes. */
export function buildEmailChangeConfirmedEmail(loginUrl: string): EmailContent {
  return buildSystemEmail({
    subject: "Your new Don't Bite email address is confirmed",
    preheader: "This is now the login email for your Don't Bite account.",
    heading: "New email address confirmed",
    bodyParagraphs: [
      "This email address is now the login email for your Don't Bite account.",
      "For your security, you've been signed out everywhere. Log in again with this email address and your existing password.",
    ],
    primaryAction: {
      label: "Log in to Don't Bite",
      url: loginUrl,
    },
    footerNote: GENUINE_FOOTER,
  });
}

/** Sent to the OLD address after an administrator-controlled email change. */
export function buildAdminEmailChangedNoticeEmail(): EmailContent {
  return buildSystemEmail({
    subject: "Your Don't Bite email address was changed by the support team",
    preheader: "The Don't Bite support team changed the email address on your account.",
    heading: "Your email address was changed",
    bodyParagraphs: [
      "The Don't Bite support team has changed the email address linked to your account.",
      "If you requested this change, no action is needed.",
      "If you did not request this change, contact the Don't Bite support team immediately so the account can be secured. Your previous email address can no longer be used to sign in.",
    ],
    footerNote: GENUINE_FOOTER,
  });
}

/** Sent to the NEW address after an administrator-controlled email change. */
export function buildAdminEmailChangeConfirmedEmail(
  loginUrl: string,
  forgotPasswordUrl: string
): EmailContent {
  return buildSystemEmail({
    subject: "Your Don't Bite account email has been updated",
    preheader: "The Don't Bite support team updated your account login email.",
    heading: "Your account email has been updated",
    bodyParagraphs: [
      "The Don't Bite support team has updated the email address on your Don't Bite account.",
      "This is now your login email. For your security, you've been signed out everywhere.",
      "Log in again with this email address and your existing password. If you do not know your password, use the Forgot Password function on the login page.",
    ],
    primaryAction: {
      label: "Log in to Don't Bite",
      url: loginUrl,
    },
    secondaryText: `Forgot your password? Visit ${forgotPasswordUrl}`,
    footerNote: GENUINE_FOOTER,
  });
}
