import crypto from "node:crypto";
import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";

export const PASSWORD_RESET_EXPIRY_MS = 30 * 60 * 1000;

export const PASSWORD_RESET_GENERIC_MESSAGE =
  "If an account exists for that email address, we've sent password reset instructions.";

export function generatePasswordResetToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

export function hashPasswordResetToken(rawToken: string): string {
  return crypto.createHash("sha256").update(rawToken).digest("hex");
}

export function buildPasswordResetUrl(rawToken: string, appUrl: string): string {
  const base = appUrl.replace(/\/$/, "");
  return `${base}/reset-password?token=${encodeURIComponent(rawToken)}`;
}

export async function invalidateUnusedPasswordResetTokens(
  userId: string,
  tx: Prisma.TransactionClient = db
): Promise<void> {
  await tx.passwordResetToken.updateMany({
    where: { userId, usedAt: null },
    data: { usedAt: new Date() },
  });
}

export async function createPasswordResetToken(
  userId: string,
  tx: Prisma.TransactionClient = db
): Promise<{ id: string; rawToken: string; tokenHash: string; expiresAt: Date }> {
  const rawToken = generatePasswordResetToken();
  const tokenHash = hashPasswordResetToken(rawToken);
  const expiresAt = new Date(Date.now() + PASSWORD_RESET_EXPIRY_MS);

  const record = await tx.passwordResetToken.create({
    data: {
      userId,
      tokenHash,
      expiresAt,
    },
    select: { id: true },
  });

  return { id: record.id, rawToken, tokenHash, expiresAt };
}
