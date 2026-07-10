/**
 * Admin email-change notification failure: DB change must not roll back.
 * Run against invalid SMTP server: $env:SMTP_FAIL_BASE_URL="http://localhost:3031"; node scripts/test-admin-change-email-smtp-failure.mjs
 */
import { config } from "dotenv";
import { createRequire } from "node:module";

config({ path: ".env.local" });
config();

const require = createRequire(import.meta.url);
const { hash } = require("bcryptjs");
const { Pool } = require("pg");
const { PrismaPg } = require("@prisma/adapter-pg");
const { PrismaClient } = require("@prisma/client");

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const db = new PrismaClient({ adapter: new PrismaPg(pool) });
const base = process.env.SMTP_FAIL_BASE_URL ?? "http://localhost:3031";
const tag = `adminsmtp-${Date.now()}`;

async function main() {
  const passwordHash = await hash("testpass123", 12);
  const superEmail = `${tag}-super@example.invalid`;
  const userEmail = `${tag}-user@example.invalid`;
  const newEmail = `${tag}-new@example.invalid`;

  await db.user.create({
    data: {
      name: "SMTP Fail Super",
      email: superEmail,
      passwordHash,
      role: "admin",
      adminTier: "super_admin",
      isActive: true,
      mustChangePassword: false,
      trainingActive: false,
      frequency: "monthly",
    },
  });

  const user = await db.user.create({
    data: {
      name: "SMTP Fail User",
      email: userEmail,
      passwordHash,
      role: "user",
      isActive: true,
      mustChangePassword: false,
      trainingActive: true,
      frequency: "weekly",
    },
  });

  const loginRes = await fetch(`${base}/api/auth/admin-login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: superEmail, password: "testpass123" }),
  });
  if (!loginRes.ok) throw new Error("Admin login failed");
  const cookie = loginRes.headers.get("set-cookie")?.split(";")[0] ?? "";

  const res = await fetch(`${base}/api/admin/users/${user.id}/change-email`, {
    method: "POST",
    headers: { "Content-Type": "application/json", cookie },
    body: JSON.stringify({
      newEmail,
      confirmEmail: newEmail,
      reason: "Support recovery test with SMTP unavailable",
    }),
  });
  const body = await res.json();

  const updated = await db.user.findUnique({ where: { id: user.id } });
  if (updated.email !== newEmail) {
    throw new Error("Database email change was rolled back on notification failure");
  }
  console.log("PASS: database email change succeeds despite notification failure");

  if (!body.ok || body.emailChanged !== true) {
    throw new Error(`Expected ok response with emailChanged=true, got ${JSON.stringify(body)}`);
  }
  if (body.notificationsSent !== false) {
    throw new Error("Expected notificationsSent=false");
  }
  if (/gmail|nodemailer|smtp/i.test(JSON.stringify(body))) {
    throw new Error("Provider error leaked");
  }
  console.log("PASS: safe warning returned when notifications fail");

  const audit = await db.adminAuditLog.findFirst({
    where: { action: "ADMIN_USER_EMAIL_CHANGED", targetId: user.id },
  });
  if (!audit) throw new Error("Audit missing despite notification failure");
  console.log("PASS: audit recorded even when notifications fail");

  // Admin password reset SMTP failure
  const failUserEmail = `${tag}-reset@example.invalid`;
  const failUser = await db.user.create({
    data: {
      name: "Reset Fail User",
      email: failUserEmail,
      passwordHash,
      role: "user",
      isActive: true,
      mustChangePassword: false,
      trainingActive: true,
      frequency: "weekly",
    },
  });

  const resetRes = await fetch(`${base}/api/admin/users/${failUser.id}/reset-password`, {
    method: "POST",
    headers: { cookie },
  });
  const resetBody = await resetRes.json();
  if (resetRes.status !== 502) throw new Error(`Expected 502, got ${resetRes.status}`);
  const orphan = await db.passwordResetToken.count({
    where: { userId: failUser.id, usedAt: null },
  });
  if (orphan !== 0) throw new Error("Orphan reset token remains");
  if (/gmail|nodemailer/i.test(JSON.stringify(resetBody))) throw new Error("Provider leaked");
  console.log("PASS: admin password reset SMTP failure leaves no orphan token");

  console.log("\nAll admin SMTP failure tests passed.");
}

main()
  .catch((e) => {
    console.error("FAIL:", e.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    const users = await db.user.findMany({
      where: { email: { contains: tag } },
      select: { id: true },
    });
    const ids = users.map((u) => u.id);
    if (ids.length) {
      await db.adminAuditLog.deleteMany({
        where: { OR: [{ actorUserId: { in: ids } }, { targetId: { in: ids } }] },
      });
      await db.passwordResetToken.deleteMany({ where: { userId: { in: ids } } });
      await db.session.deleteMany({ where: { userId: { in: ids } } });
      await db.user.deleteMany({ where: { id: { in: ids } } });
    }
    await db.$disconnect();
    await pool.end();
  });
