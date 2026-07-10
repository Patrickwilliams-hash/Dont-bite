import "server-only";

import { buildSystemEmail } from "@/lib/email/templates/system-email";

export function buildPasswordResetEmail(resetUrl: string): {
  subject: string;
  text: string;
  html: string;
} {
  return buildSystemEmail({
    subject: "Reset your Don't Bite password",
    preheader: "Use this secure link to choose a new password. It expires in 30 minutes.",
    heading: "Reset your password",
    bodyParagraphs: [
      "We received a request to reset your Don't Bite password.",
      "Use the button below to choose a new password. This link will expire in 30 minutes and can only be used once.",
    ],
    primaryAction: {
      label: "Choose a new password",
      url: resetUrl,
    },
    secondaryText:
      "If you didn't request this, you can safely ignore this email. Your password has not been changed.",
    footerNote:
      "This is a genuine Don't Bite account message. Don't Bite will never ask you to reply with your password or banking details.",
  });
}
