import "server-only";

import { buildSystemEmail } from "@/lib/email/templates/system-email";

export function buildWelcomeEmail(
  firstName: string,
  dashboardUrl: string
): { subject: string; text: string; html: string } {
  const safeName = firstName.trim() || "there";

  return buildSystemEmail({
    subject: "Welcome to Don't Bite",
    preheader: "You're all set to start practising spotting scams with Phil.",
    heading: `Welcome, ${safeName}!`,
    bodyParagraphs: [
      "Thanks for joining Don't Bite. We help everyday people practise spotting scam emails, traps and misleading online offers — safely, with Phil by your side.",
      "Your training emails will arrive at varied times, just like real scams do, so keep an eye out. Every one you catch makes you sharper.",
      "Remember: Don't Bite never asks for your real banking details or passwords in training. If something asks for those, it isn't us.",
    ],
    primaryAction: {
      label: "Go to your dashboard",
      url: dashboardUrl,
    },
    secondaryText: "You can pause training or change how often drills arrive any time from your settings.",
    footerNote:
      "This is a genuine Don't Bite account message. Don't Bite will never ask you to reply with your password or banking details.",
  });
}
