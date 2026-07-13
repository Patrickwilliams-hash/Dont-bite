import "server-only";

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export interface DrillEmailInput {
  senderDisplayName: string;
  subject: string;
  previewText?: string;
  recipientFirstName: string;
  brandName: string;
  scenarioMessage: string;
  ctaLabel: string;
  trackingUrl: string;
}

export interface DrillEmailContent {
  subject: string;
  text: string;
  html: string;
  senderDisplayName: string;
}

export function buildDrillEmail(input: DrillEmailInput): DrillEmailContent {
  const greeting = `Hi ${input.recipientFirstName},`;
  const subject = input.subject.trim();
  const previewText = input.previewText?.trim();
  const scenarioMessage = input.scenarioMessage.trim();
  const ctaLabel = input.ctaLabel.trim();
  const trackingUrl = input.trackingUrl.trim();
  const brandName = input.brandName.trim();

  const text = [
    greeting,
    "",
    scenarioMessage,
    "",
    `${ctaLabel}: ${trackingUrl}`,
    "",
    `This message was sent by ${brandName} Updates.`,
    "",
    "If you did not expect a parcel delivery message, do not click the link.",
  ].join("\n");

  const previewBlock = previewText
    ? `<span style="display:none;max-height:0;overflow:hidden;mso-hide:all;">${escapeHtml(previewText)}</span>`
    : "";

  const html = `
    ${previewBlock}
    <div style="font-family: Arial, Helvetica, sans-serif; line-height: 1.55; color: #1f2937; max-width: 560px; margin: 0 auto;">
      <p style="margin: 0 0 16px; font-size: 15px;">${escapeHtml(greeting)}</p>
      <p style="margin: 0 0 20px; font-size: 15px;">${escapeHtml(scenarioMessage)}</p>
      <p style="margin: 0 0 24px;">
        <a href="${escapeHtml(trackingUrl)}" style="display: inline-block; background-color: #2563eb; color: #ffffff; text-decoration: none; font-weight: 700; font-size: 15px; padding: 12px 20px; border-radius: 6px;">
          ${escapeHtml(ctaLabel)}
        </a>
      </p>
      <p style="margin: 0 0 8px; font-size: 13px; color: #6b7280;">
        ${escapeHtml(brandName)} parcel notification
      </p>
      <p style="margin: 0; font-size: 12px; color: #9ca3af;">
        Please do not reply to this automated message.
      </p>
    </div>
  `.trim();

  return {
    subject,
    text,
    html,
    senderDisplayName: input.senderDisplayName.trim(),
  };
}

export function recipientFirstName(fullName: string): string {
  const trimmed = fullName.trim();
  if (!trimmed) return "there";
  return trimmed.split(/\s+/)[0] ?? "there";
}
