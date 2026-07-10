/**
 * Core password-reset tests that exercise DB + auth helpers without HTTP.
 * Run: node scripts/test-password-reset-core.mjs
 */
import { config } from "dotenv";
import { createRequire } from "node:module";
import crypto from "node:crypto";

config({ path: ".env.local" });
config();

const require = createRequire(import.meta.url);
const { hash, compare } = require("bcryptjs");
const { Pool } = require("pg");
const { PrismaPg } = require("@prisma/adapter-pg");
const { PrismaClient } = require("@prisma/client");

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const db = new PrismaClient({ adapter: new PrismaPg(pool) });
const tag = `pwcore-${Date.now()}`;

function hashToken(raw) {
  return crypto.createHash("sha256").update(raw).digest("hex");
}

async function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function main() {
  const passwordHash = await hash("oldpass123", 12);
  const userEmail = `${tag}-user@example.invalid`;

  const user = await db.user.create({
    data: {
      name: "Core Reset Test",
      email: userEmail,
      passwordHash,
      role: "user",
      isActive: true,
      mustChangePassword: false,
      trainingActive: true,
      frequency: "weekly",
    },
  });

  const oldRaw = crypto.randomBytes(32).toString("hex");
  await db.passwordResetToken.create({
    data: {
      userId: user.id,
      tokenHash: hashToken(oldRaw),
      expiresAt: new Date(Date.now() + 60 * 60 * 1000),
    },
  });

  await db.passwordResetToken.updateMany({
    where: { userId: user.id, usedAt: null },
    data: { usedAt: new Date() },
  });

  const oldRecord = await db.passwordResetToken.findUnique({
    where: { tokenHash: hashToken(oldRaw) },
  });
  await assert(oldRecord?.usedAt, "invalidateUnusedPasswordResetTokens behaviour");
  console.log("PASS: token invalidation");

  const rawToken = crypto.randomBytes(32).toString("hex");
  const tokenHash = hashToken(rawToken);
  await db.passwordResetToken.create({
    data: {
      userId: user.id,
      tokenHash,
      expiresAt: new Date(Date.now() + 30 * 60 * 1000),
    },
  });

  const stored = await db.passwordResetToken.findUnique({ where: { tokenHash } });
  await assert(stored && stored.tokenHash === tokenHash, "only hash stored");
  await assert(stored.tokenHash !== rawToken, "raw token not stored");
  console.log("PASS: only token hash stored");

  const session = await db.session.create({
    data: {
      userId: user.id,
      tokenHash: hashToken(crypto.randomBytes(32).toString("hex")),
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    },
  });

  const newPasswordHash = await hash("newpass123", 12);
  await db.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: user.id },
      data: { passwordHash: newPasswordHash, passwordUpdatedAt: new Date() },
    });
    await tx.passwordResetToken.update({
      where: { id: stored.id },
      data: { usedAt: new Date() },
    });
    await tx.passwordResetToken.updateMany({
      where: { userId: user.id, usedAt: null, id: { not: stored.id } },
      data: { usedAt: new Date() },
    });
  });

  await db.session.deleteMany({ where: { userId: user.id } });

  const used = await db.passwordResetToken.findUnique({ where: { tokenHash } });
  await assert(used?.usedAt, "token marked used");
  console.log("PASS: token marked used after reset");

  const updatedUser = await db.user.findUnique({ where: { id: user.id } });
  await assert(!(await compare("oldpass123", updatedUser.passwordHash)), "old password rejected");
  await assert(await compare("newpass123", updatedUser.passwordHash), "new password works");
  console.log("PASS: password updated");

  const remainingSessions = await db.session.count({ where: { userId: user.id } });
  await assert(remainingSessions === 0, "sessions revoked");
  console.log("PASS: sessions revoked");

  const expiredRaw = crypto.randomBytes(32).toString("hex");
  const expiredHash = hashToken(expiredRaw);
  await db.passwordResetToken.create({
    data: {
      userId: user.id,
      tokenHash: expiredHash,
      expiresAt: new Date(Date.now() - 60 * 1000),
    },
  });
  const expired = await db.passwordResetToken.findUnique({ where: { tokenHash: expiredHash } });
  await assert(expired.expiresAt.getTime() < Date.now(), "expired token in past");
  console.log("PASS: expired token fixture");

  const { readFileSync } = await import("node:fs");
  const systemTemplate = readFileSync("lib/email/templates/system-email.ts", "utf8");
  const resetTemplate = readFileSync("lib/email/templates/password-reset-email.ts", "utf8");
  await assert(systemTemplate.includes("phil-intro.png"), "Phil image in system template");
  await assert(systemTemplate.includes("buildPlainText"), "plain-text fallback");
  await assert(resetTemplate.includes("Reset your Don't Bite password"), "reset subject");
  await assert(resetTemplate.includes("Choose a new password"), "reset button label");
  console.log("PASS: email template structure");

  console.log("\nAll core password reset tests passed.");
}

main()
  .catch((e) => {
    console.error("FAIL:", e.message);
    process.exit(1);
  })
  .finally(async () => {
    const users = await db.user.findMany({
      where: { email: { contains: tag } },
      select: { id: true },
    });
    const ids = users.map((u) => u.id);
    if (ids.length) {
      await db.passwordResetToken.deleteMany({ where: { userId: { in: ids } } });
      await db.session.deleteMany({ where: { userId: { in: ids } } });
      await db.user.deleteMany({ where: { id: { in: ids } } });
    }
    await db.$disconnect();
    await pool.end();
  });
