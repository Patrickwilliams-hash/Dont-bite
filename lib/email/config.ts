export interface EmailConfig {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  password: string;
  from: string;
  appUrl: string;
}

export class EmailConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "EmailConfigError";
  }
}

const REQUIRED_VARS = [
  "EMAIL_HOST",
  "EMAIL_PORT",
  "EMAIL_SECURE",
  "EMAIL_USER",
  "EMAIL_APP_PASSWORD",
  "EMAIL_FROM",
  "APP_URL",
] as const;

function missingVars(): string[] {
  return REQUIRED_VARS.filter((key) => {
    const value = process.env[key];
    return value === undefined || value.trim() === "";
  });
}

export function getEmailConfig(): EmailConfig {
  const missing = missingVars();
  if (missing.length > 0) {
    throw new EmailConfigError(
      `Email is not configured. Missing environment variable(s): ${missing.join(", ")}.`
    );
  }

  const port = Number.parseInt(process.env.EMAIL_PORT ?? "", 10);
  if (!Number.isFinite(port) || port <= 0) {
    throw new EmailConfigError("EMAIL_PORT must be a valid positive number.");
  }

  const secureRaw = process.env.EMAIL_SECURE?.trim().toLowerCase() ?? "";
  if (secureRaw !== "true" && secureRaw !== "false") {
    throw new EmailConfigError('EMAIL_SECURE must be "true" or "false".');
  }

  return {
    host: process.env.EMAIL_HOST!.trim(),
    port,
    secure: secureRaw === "true",
    user: process.env.EMAIL_USER!.trim(),
    password: process.env.EMAIL_APP_PASSWORD!.trim(),
    from: process.env.EMAIL_FROM!.trim(),
    appUrl: process.env.APP_URL!.trim().replace(/\/$/, ""),
  };
}
