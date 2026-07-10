import crypto from "node:crypto";
import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";

export const EMAIL_CHANGE_EXPIRY_MS = 15 * 60 * 1000;
export const EMAIL_CHANGE_MAX_ATTEMPTS = 5;
export const EMAIL_CHANGE_RESEND_COOLDOWN_MS = 60 * 1000;

export const EMAIL_CHANGE_INVALID_CODE_MESSAGE =
  "That code is incorrect or no longer valid. Check the latest email or request a new code.";

export function isValidEmailAddress(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function generateEmailChangeCode(): string {
  return crypto.randomInt(0, 1_000_000).toString().padStart(6, "0");
}

export function hashEmailChangeCode(code: string): string {
  return crypto.createHash("sha256").update(code).digest("hex");
}

export function emailChangeCodeMatches(submittedCode: string, storedHash: string): boolean {
  const submittedHash = hashEmailChangeCode(submittedCode);
  const a = Buffer.from(submittedHash, "hex");
  const b = Buffer.from(storedHash, "hex");
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

export async function invalidatePendingEmailChangeRequests(
  userId: string,
  tx: Prisma.TransactionClient = db
): Promise<number> {
  const result = await tx.emailChangeRequest.updateMany({
    where: { userId, usedAt: null, invalidatedAt: null },
    data: { invalidatedAt: new Date() },
  });
  return result.count;
}

export async function createEmailChangeRequest(
  userId: string,
  newEmail: string,
  tx: Prisma.TransactionClient = db
): Promise<{ id: string; code: string; expiresAt: Date }> {
  const code = generateEmailChangeCode();
  const expiresAt = new Date(Date.now() + EMAIL_CHANGE_EXPIRY_MS);

  const record = await tx.emailChangeRequest.create({
    data: {
      userId,
      newEmail,
      codeHash: hashEmailChangeCode(code),
      expiresAt,
    },
    select: { id: true },
  });

  return { id: record.id, code, expiresAt };
}

export async function findActiveEmailChangeRequest(userId: string) {
  return db.emailChangeRequest.findFirst({
    where: {
      userId,
      usedAt: null,
      invalidatedAt: null,
      expiresAt: { gt: new Date() },
    },
    orderBy: { createdAt: "desc" },
  });
}
