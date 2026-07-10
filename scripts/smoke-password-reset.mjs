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
const base = process.env.SMOKE_BASE_URL ?? "http://localhost:3000";
const tag = `pwreset-${Date.now()}`;
const genericMessage =
  "If an account exists for that email address, we've sent password reset instructions.";

function hashToken(raw) {
  return crypto.createHash("sha256").update(raw).digest("hex");
}

async function expectSameMessage(res) {
  const body = await res.json();
  if (!res.ok || body.message !== genericMessage) {
    throw new Error(`Expected generic success message, got ${res.status} ${JSON.stringify(body)}`);
  }
}

async function main() {
  const passwordHash = await hash("oldpass123", 12);
  const userEmail = `${tag}-user@example.invalid`;
  const unknownEmail = `${tag}-missing@example.invalid`;

  const user = await db.user.create({
    data: {
      name: "Password Reset Test User",
      email: userEmail,
      passwordHash,
      role: "user",
      isActive: true,
      mustChangePassword: false,
      trainingActive: true,
      frequency: "weekly",
    },
  });

  const oldTokenRaw = crypto.randomBytes(32).toString("hex");
  await db.passwordResetToken.create({
    data: {
      userId: user.id,
      tokenHash: hashToken(oldTokenRaw),
      expiresAt: new Date(Date.now() + 60 * 60 * 1000),
    },
  });

  const forgotKnown = await fetch(`${base}/api/auth/forgot-password`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: userEmail }),
  });
  await expectSameMessage(forgotKnown);
  console.log("PASS: existing account receives generic forgot-password response");

  const oldTokenRecord = await db.passwordResetToken.findUnique({
    where: { tokenHash: hashToken(oldTokenRaw) },
  });
  if (!oldTokenRecord?.usedAt) {
    throw new Error("Previous unused reset token was not invalidated");
  }
  console.log("PASS: previous unused reset tokens invalidated");

  const latestToken = await db.passwordResetToken.findFirst({
    where: { userId: user.id, usedAt: null },
    orderBy: { createdAt: "desc" },
  });
  if (!latestToken) throw new Error("No new reset token created");

  const auditEmailEntry = await db.adminAuditLog.findFirst({
    where: { action: "PASSWORD_RESET_EMAIL_SENT", targetId: user.id },
    orderBy: { createdAt: "desc" },
  });
  if (!auditEmailEntry) throw new Error("PASSWORD_RESET_EMAIL_SENT audit entry missing");
  if (JSON.stringify(auditEmailEntry.metadata ?? {}).includes("token")) {
    throw new Error("Audit metadata leaked token data");
  }
  console.log("PASS: PASSWORD_RESET_EMAIL_SENT audit recorded without token data");

  const forgotUnknown = await fetch(`${base}/api/auth/forgot-password`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: unknownEmail }),
  });
  await expectSameMessage(forgotUnknown);
  console.log("PASS: unknown email receives same generic response");

  const loginRes = await fetch(`${base}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: userEmail, password: "oldpass123" }),
  });
  if (!loginRes.ok) {
    const loginBody = await loginRes.text();
    throw new Error(`Pre-reset login failed: ${loginRes.status} ${loginBody.slice(0, 200)}`);
  }
  const sessionCookie = loginRes.headers.get("set-cookie")?.split(";")[0] ?? "";

  const rawToken = crypto.randomBytes(32).toString("hex");
  const tokenHash = hashToken(rawToken);
  await db.passwordResetToken.create({
    data: {
      userId: user.id,
      tokenHash,
      expiresAt: new Date(Date.now() + 30 * 60 * 1000),
    },
  });

  const resetRes = await fetch(`${base}/api/auth/reset-password`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token: rawToken, newPassword: "newpass123" }),
  });
  const resetBody = await resetRes.json();
  if (!resetRes.ok || !resetBody.ok) {
    throw new Error(`Reset failed: ${resetRes.status} ${JSON.stringify(resetBody)}`);
  }
  console.log("PASS: valid reset link updates password");

  const usedToken = await db.passwordResetToken.findUnique({ where: { tokenHash } });
  if (!usedToken?.usedAt) throw new Error("Token not marked used");

  const reuseRes = await fetch(`${base}/api/auth/reset-password`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token: rawToken, newPassword: "anotherpass1" }),
  });
  if (reuseRes.status !== 400) throw new Error("Reused token should be rejected");
  console.log("PASS: reused token rejected");

  const oldLogin = await fetch(`${base}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: userEmail, password: "oldpass123" }),
  });
  if (oldLogin.ok) throw new Error("Old password still works");

  const newLogin = await fetch(`${base}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: userEmail, password: "newpass123" }),
  });
  if (!newLogin.ok) throw new Error("New password login failed");
  console.log("PASS: old password rejected and new password works");

  const sessionAfter = await fetch(`${base}/api/auth/session`, {
    headers: { cookie: sessionCookie },
  });
  if (sessionAfter.ok) {
    const sessionBody = await sessionAfter.json();
    if (sessionBody.user) throw new Error("Pre-reset session still active after password reset");
  }
  console.log("PASS: existing sessions revoked after password reset");

  const expiredRaw = crypto.randomBytes(32).toString("hex");
  const expiredHash = hashToken(expiredRaw);
  await db.passwordResetToken.create({
    data: {
      userId: user.id,
      tokenHash: expiredHash,
      expiresAt: new Date(Date.now() - 60 * 1000),
    },
  });
  const expiredRes = await fetch(`${base}/api/auth/reset-password`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token: expiredRaw, newPassword: "expiredpass1" }),
  });
  if (expiredRes.status !== 400) throw new Error("Expired token should be rejected");
  console.log("PASS: expired token rejected");

  const completionAudit = await db.adminAuditLog.findFirst({
    where: { action: "PASSWORD_RESET_COMPLETED", targetId: user.id },
    orderBy: { createdAt: "desc" },
  });
  if (!completionAudit) throw new Error("PASSWORD_RESET_COMPLETED audit entry missing");
  console.log("PASS: PASSWORD_RESET_COMPLETED audit recorded");

  console.log("\nAll password reset smoke tests passed.");
}

main()
  .catch((error) => {
    console.error("FAIL:", error.message);
    process.exit(1);
  })
  .finally(async () => {
    const users = await db.user.findMany({
      where: { email: { contains: tag } },
      select: { id: true },
    });
    const userIds = users.map((u) => u.id);
    if (userIds.length > 0) {
      await db.adminAuditLog.deleteMany({
        where: {
          OR: [{ actorUserId: { in: userIds } }, { targetId: { in: userIds } }],
        },
      });
      await db.passwordResetToken.deleteMany({ where: { userId: { in: userIds } } });
      await db.session.deleteMany({ where: { userId: { in: userIds } } });
      await db.user.deleteMany({ where: { id: { in: userIds } } });
    }
    await db.$disconnect();
    await pool.end();
  });
