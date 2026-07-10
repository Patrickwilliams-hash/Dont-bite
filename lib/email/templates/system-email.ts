import "server-only";

import { getEmailConfig } from "@/lib/email/config";

export interface SystemEmailAction {
  label: string;
  url: string;
}

export interface SystemEmailContent {
  subject: string;
  preheader: string;
  heading: string;
  bodyParagraphs: string[];
  primaryAction?: SystemEmailAction;
  secondaryText?: string;
  footerNote?: string;
}

const BRAND = {
  cream: "#faf6f0",
  navy: "#1a2744",
  navyBrand: "#071f49",
  coral: "#e85d4c",
  coralDark: "#c94a3a",
  coralBrand: "#e95f54",
  card: "#ffffff",
  muted: "#5a6478",
  mutedBrand: "#617078",
  border: "#e8e2d8",
} as const;

function buildMastheadHtml(): string {
  return `<table role="presentation" cellspacing="0" cellpadding="0" style="margin: 0 auto;">
    <tr>
      <td style="text-align: center;">
        <p style="margin: 0 0 4px; font-family: Arial, Helvetica, sans-serif; font-size: 26px; font-weight: 800; line-height: 1; letter-spacing: -0.03em; text-transform: uppercase;">
          <span style="color: ${BRAND.navyBrand};">Don&apos;t</span><span style="color: ${BRAND.coralBrand};">Bite</span>
        </p>
        <p style="margin: 0; font-family: Arial, Helvetica, sans-serif; font-size: 11px; font-weight: 800; line-height: 1.2; color: ${BRAND.mutedBrand}; letter-spacing: 0.02em;">
          Don&apos;t take the bait.
        </p>
      </td>
    </tr>
  </table>`;
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function absolutePhilImageUrl(): string {
  const { appUrl } = getEmailConfig();
  return `${appUrl}/mascot/phil-intro.png`;
}

function buildPlainText(content: SystemEmailContent): string {
  const lines = [
    content.heading,
    "",
    ...content.bodyParagraphs,
  ];

  if (content.primaryAction) {
    lines.push("", `${content.primaryAction.label}: ${content.primaryAction.url}`);
  }

  if (content.secondaryText) {
    lines.push("", content.secondaryText);
  }

  lines.push(
    "",
    "—",
    content.footerNote ??
      "This is a genuine Don't Bite account message. Don't Bite will never ask you to reply with your password or banking details."
  );

  return lines.join("\n");
}

function buildHtml(content: SystemEmailContent): string {
  const preheader = escapeHtml(content.preheader);
  const heading = escapeHtml(content.heading);
  const bodyHtml = content.bodyParagraphs
    .map(
      (paragraph) =>
        `<p style="margin: 0 0 16px; font-size: 16px; line-height: 1.6; color: ${BRAND.navy};">${escapeHtml(paragraph)}</p>`
    )
    .join("");

  const philUrl = absolutePhilImageUrl();
  const actionHtml = content.primaryAction
    ? `<table role="presentation" cellspacing="0" cellpadding="0" style="margin: 24px 0;">
        <tr>
          <td style="border-radius: 999px; background-color: ${BRAND.coral};">
            <a href="${escapeHtml(content.primaryAction.url)}" style="display: inline-block; padding: 14px 28px; font-size: 16px; font-weight: 700; color: #ffffff; text-decoration: none; border-radius: 999px;">
              ${escapeHtml(content.primaryAction.label)}
            </a>
          </td>
        </tr>
      </table>
      <p style="margin: 0 0 16px; font-size: 14px; line-height: 1.6; color: ${BRAND.muted};">
        If the button does not work, copy and paste this link into your browser:<br />
        <a href="${escapeHtml(content.primaryAction.url)}" style="color: ${BRAND.coralDark}; word-break: break-all;">${escapeHtml(content.primaryAction.url)}</a>
      </p>`
    : "";

  const secondaryHtml = content.secondaryText
    ? `<p style="margin: 0 0 16px; font-size: 15px; line-height: 1.6; color: ${BRAND.muted};">${escapeHtml(content.secondaryText)}</p>`
    : "";

  const footer =
    content.footerNote ??
    "This is a genuine Don't Bite account message. Don't Bite will never ask you to reply with your password or banking details.";

  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="color-scheme" content="light" />
    <meta name="supported-color-schemes" content="light" />
    <title>${escapeHtml(content.subject)}</title>
  </head>
  <body style="margin: 0; padding: 0; background-color: ${BRAND.cream}; font-family: Arial, Helvetica, sans-serif;">
    <div style="display: none; max-height: 0; overflow: hidden; opacity: 0; color: transparent; mso-hide: all;">
      ${preheader}
    </div>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: ${BRAND.cream}; padding: 24px 12px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width: 560px;">
            <tr>
              <td style="padding: 8px 0 20px; text-align: center;">
                ${buildMastheadHtml()}
              </td>
            </tr>
            <tr>
              <td style="background-color: ${BRAND.card}; border: 1px solid ${BRAND.border}; border-radius: 20px; padding: 32px 28px; box-shadow: 0 8px 24px rgba(26, 39, 68, 0.06);">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                  <tr>
                    <td align="center" style="padding-bottom: 20px;">
                      <img src="${philUrl}" alt="Phil from Don't Bite" width="72" height="72" style="display: block; width: 72px; height: auto; border: 0;" />
                    </td>
                  </tr>
                  <tr>
                    <td>
                      <h1 style="margin: 0 0 20px; font-size: 28px; line-height: 1.25; color: ${BRAND.navy}; font-weight: 800;">
                        ${heading}
                      </h1>
                      ${bodyHtml}
                      ${actionHtml}
                      ${secondaryHtml}
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding: 20px 8px 0; text-align: center;">
                <p style="margin: 0; font-size: 12px; line-height: 1.6; color: ${BRAND.muted};">
                  ${escapeHtml(footer)}
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

export function buildSystemEmail(content: SystemEmailContent): {
  subject: string;
  text: string;
  html: string;
} {
  return {
    subject: content.subject,
    text: buildPlainText(content),
    html: buildHtml(content),
  };
}
