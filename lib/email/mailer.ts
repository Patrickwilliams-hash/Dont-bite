import "server-only";

import nodemailer from "nodemailer";
import type { Transporter } from "nodemailer";
import { EmailConfigError, getEmailConfig } from "@/lib/email/config";

export class EmailSendError extends Error {
  constructor(message = "Failed to send email.") {
    super(message);
    this.name = "EmailSendError";
  }
}

export interface SendEmailInput {
  to: string;
  subject: string;
  text: string;
  html: string;
  fromName?: string;
}

let cachedTransporter: Transporter | null = null;
let cachedConfigKey: string | null = null;

function configKey(config: ReturnType<typeof getEmailConfig>): string {
  return `${config.host}:${config.port}:${config.secure}:${config.user}:${config.from}`;
}

function getTransporter(): Transporter {
  const config = getEmailConfig();
  const key = configKey(config);

  if (!cachedTransporter || cachedConfigKey !== key) {
    cachedTransporter = nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: config.secure,
      auth: {
        user: config.user,
        pass: config.password,
      },
    });
    cachedConfigKey = key;
  }

  return cachedTransporter;
}

function isValidRecipient(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function extractFromAddress(from: string): string {
  const match = from.match(/<([^>]+)>/);
  return match?.[1]?.trim() ?? from.trim();
}

export async function sendEmail(input: SendEmailInput): Promise<void> {
  const to = input.to.trim();
  if (!to || !isValidRecipient(to)) {
    throw new EmailSendError("A valid recipient email address is required.");
  }

  let config;
  try {
    config = getEmailConfig();
  } catch (error) {
    if (error instanceof EmailConfigError) {
      throw new EmailSendError(error.message);
    }
    throw error;
  }

  const fromAddress = extractFromAddress(config.from);
  const from =
    input.fromName?.trim()
      ? { name: input.fromName.trim(), address: fromAddress }
      : config.from;

  try {
    await getTransporter().sendMail({
      from,
      to,
      subject: input.subject,
      text: input.text,
      html: input.html,
    });
  } catch (error) {
    console.error("Email send failed", {
      host: config.host,
      port: config.port,
      to,
      error: error instanceof Error ? error.name : "unknown",
    });
    throw new EmailSendError("Failed to send email. Check SMTP configuration and try again.");
  }
}

export function buildTestEmailContent(): {
  subject: string;
  text: string;
  html: string;
} {
  const subject = "Don't Bite email test";
  const text =
    "This is a test email from the Don't Bite development system.\n\nIf you received this message, outgoing email delivery is working correctly.";
  const html = `
    <div style="font-family: Arial, sans-serif; line-height: 1.5; color: #1a2744; max-width: 560px;">
      <p style="font-size: 12px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; color: #e85d4c; margin: 0 0 12px;">
        Don't Bite
      </p>
      <p style="margin: 0 0 16px;">This is a test email from the Don't Bite development system.</p>
      <p style="margin: 0;">If you received this message, outgoing email delivery is working correctly.</p>
    </div>
  `.trim();

  return { subject, text, html };
}
