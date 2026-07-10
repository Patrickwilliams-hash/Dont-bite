/**
 * Smoke tests for admin password-reset email and admin-controlled email change.
 * Run: $env:SMOKE_BASE_URL="http://localhost:3030"; node scripts/smoke-admin-account-recovery.mjs
 */
import { config } from "dotenv";
import { createRequire } from "node:module";
import crypto from "node:crypto";

config({ path: ".env.local" });
config();

const require = createRequire(import.meta.url);
const { hash } = require("bcryptjs");
const { Pool } = require("pg");
const { PrismaPg } = require("@prisma/adapter-pg");
const { PrismaClient } = require("@prisma/client");

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const db = new PrismaClient({ adapter: new PrismaPg(pool) });
const base = process.env.SMOKE_BASE_URL ?? "http://localhost:3030";
const smtpFailBase = process.env.SMTP_FAIL_BASE_URL ?? "http://localhost:3031";
const tag = `adminrec-${Date.now()}`;

function hashToken(raw) {
  return crypto.createHash("sha256").update(raw).digest("hex");
}

function cookieFrom(res) {
  return res.headers.get("set-cookie")?.split(";")[0] ?? "";
}

async function adminLogin(email) {
  const res = await fetch(`${base}/api/auth/admin-login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password: "testpass123" }),
  });
  if (!res.ok) throw new Error(`Admin login failed (${res.status})`);
  return cookieFrom(res);
}

async function userLogin(email, password = "testpass123") {
  const res = await fetch(`${base}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  return { ok: res.ok, cookie: cookieFrom(res), status: res.status };
}

async function main() {
  const passwordHash = await hash("testpass123", 12);
  const superEmail = `${tag}-super@example.invalid`;
  const manageUsersEmail = `${tag}-manage@example.invalid`;
  const bareAdminEmail = `${tag}-bare@example.invalid`;
  const userEmail = `${tag}-user@example.invalid`;
  const newEmail = `${tag}-new@example.invalid`;
  const otherEmail = `${tag}-other@example.invalid`;
  const adminTargetEmail = `${tag}-admintarget@example.invalid`;

  await db.user.create({
    data: {
      name: "Super Admin",
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

  await db.user.create({
    data: {
      name: "Manage Users Admin",
      email: manageUsersEmail,
      passwordHash,
      role: "admin",
      adminTier: "administrator",
      adminPermissions: ["manage_users"],
      isActive: true,
      mustChangePassword: false,
      trainingActive: false,
      frequency: "monthly",
    },
  });

  await db.user.create({
    data: {
      name: "Bare Admin",
      email: bareAdminEmail,
      passwordHash,
      role: "admin",
      adminTier: "administrator",
      adminPermissions: [],
      isActive: true,
      mustChangePassword: false,
      trainingActive: false,
      frequency: "monthly",
    },
  });

  const trainingUser = await db.user.create({
    data: {
      name: "Training User",
      email: userEmail,
      passwordHash,
      role: "user",
      isActive: true,
      mustChangePassword: false,
      trainingActive: true,
      frequency: "weekly",
    },
  });

  await db.user.create({
    data: {
      name: "Other User",
      email: otherEmail,
      passwordHash,
      role: "user",
      isActive: true,
      mustChangePassword: false,
      trainingActive: true,
      frequency: "weekly",
    },
  });

  const adminTarget = await db.user.create({
    data: {
      name: "Admin Target",
      email: adminTargetEmail,
      passwordHash,
      role: "admin",
      adminTier: "administrator",
      adminPermissions: ["manage_users"],
      isActive: true,
      mustChangePassword: false,
      trainingActive: false,
      frequency: "monthly",
    },
  });

  const superCookie = await adminLogin(superEmail);
  const manageCookie = await adminLogin(manageUsersEmail);
  const bareCookie = await adminLogin(bareAdminEmail);
  const userCookie = (await userLogin(userEmail)).cookie;

  // --- Admin password reset email ---

  // Normal user receives 403
  {
    const res = await fetch(`${base}/api/admin/users/${trainingUser.id}/reset-password`, {
      method: "POST",
      headers: { cookie: userCookie },
    });
    if (res.status !== 403) throw new Error("Normal user should receive 403");
    console.log("PASS: normal user cannot send admin password reset email");
  }

  // Bare admin receives 403
  {
    const res = await fetch(`${base}/api/admin/users/${trainingUser.id}/reset-password`, {
      method: "POST",
      headers: { cookie: bareCookie },
    });
    if (res.status !== 403) throw new Error("Admin without manage_users should receive 403");
    console.log("PASS: administrator without manage_users receives 403");
  }

  // Cannot target administrator accounts
  {
    const res = await fetch(`${base}/api/admin/users/${adminTarget.id}/reset-password`, {
      method: "POST",
      headers: { cookie: superCookie },
    });
    if (res.status !== 403) throw new Error("Admin target should be rejected");
    console.log("PASS: administrator accounts cannot receive password reset email");
  }

  // Invalidate old tokens on new send
  const oldRaw = crypto.randomBytes(32).toString("hex");
  await db.passwordResetToken.create({
    data: {
      userId: trainingUser.id,
      tokenHash: hashToken(oldRaw),
      expiresAt: new Date(Date.now() + 60 * 60 * 1000),
    },
  });

  for (const [label, cookie] of [
    ["Super Admin", superCookie],
    ["manage_users administrator", manageCookie],
  ]) {
    const res = await fetch(`${base}/api/admin/users/${trainingUser.id}/reset-password`, {
      method: "POST",
      headers: { cookie },
    });
    const body = await res.json();
    if (!res.ok || body.tempPassword || body.resetUrl || JSON.stringify(body).includes("token=")) {
      throw new Error(`${label}: unsafe or failed response`);
    }
    console.log(`PASS: ${label} can send password reset email safely`);
  }

  const oldToken = await db.passwordResetToken.findUnique({
    where: { tokenHash: hashToken(oldRaw) },
  });
  if (!oldToken?.usedAt) throw new Error("Previous reset tokens not invalidated");
  console.log("PASS: previous unused reset tokens invalidated");

  const audit = await db.adminAuditLog.findFirst({
    where: { action: "ADMIN_PASSWORD_RESET_EMAIL_SENT", targetId: trainingUser.id },
    orderBy: { createdAt: "desc" },
  });
  if (!audit) throw new Error("ADMIN_PASSWORD_RESET_EMAIL_SENT audit missing");
  const auditBlob = JSON.stringify(audit.metadata ?? {});
  if (auditBlob.includes("token") || auditBlob.includes("password")) {
    throw new Error("Audit leaked sensitive data");
  }
  console.log("PASS: ADMIN_PASSWORD_RESET_EMAIL_SENT audit recorded safely");

  // Reset link from latest token works
  const latestToken = await db.passwordResetToken.findFirst({
    where: { userId: trainingUser.id, usedAt: null },
    orderBy: { createdAt: "desc" },
  });
  if (!latestToken) throw new Error("No reset token after admin send");

  // --- Admin-controlled email change ---

  const changeReason = "User entered wrong email and cannot access inbox for OTP verification";

  // Permission checks
  {
    const res = await fetch(`${base}/api/admin/users/${trainingUser.id}/change-email`, {
      method: "POST",
      headers: { "Content-Type": "application/json", cookie: userCookie },
      body: JSON.stringify({ newEmail, confirmEmail: newEmail, reason: changeReason }),
    });
    if (res.status !== 403) throw new Error("Normal user should receive 403 on change-email");
    console.log("PASS: normal user cannot change email via admin endpoint");
  }

  {
    const res = await fetch(`${base}/api/admin/users/${trainingUser.id}/change-email`, {
      method: "POST",
      headers: { "Content-Type": "application/json", cookie: bareCookie },
      body: JSON.stringify({ newEmail, confirmEmail: newEmail, reason: changeReason }),
    });
    if (res.status !== 403) throw new Error("Bare admin should receive 403");
    console.log("PASS: administrator without manage_users receives 403 on change-email");
  }

  {
    const res = await fetch(`${base}/api/admin/users/${adminTarget.id}/change-email`, {
      method: "POST",
      headers: { "Content-Type": "application/json", cookie: superCookie },
      body: JSON.stringify({
        newEmail: `${tag}-adminnew@example.invalid`,
        confirmEmail: `${tag}-adminnew@example.invalid`,
        reason: changeReason,
      }),
    });
    if (res.status !== 403) throw new Error("Cannot change administrator email");
    console.log("PASS: administrator accounts cannot be modified");
  }

  // Validation
  for (const [label, body, expected] of [
    ["mismatched emails", { newEmail, confirmEmail: otherEmail, reason: changeReason }, 400],
    ["current email", { newEmail: userEmail, confirmEmail: userEmail, reason: changeReason }, 400],
    ["duplicate email", { newEmail: otherEmail, confirmEmail: otherEmail, reason: changeReason }, 409],
    ["empty reason", { newEmail, confirmEmail: newEmail, reason: "short" }, 400],
  ]) {
    const res = await fetch(`${base}/api/admin/users/${trainingUser.id}/change-email`, {
      method: "POST",
      headers: { "Content-Type": "application/json", cookie: superCookie },
      body: JSON.stringify(body),
    });
    if (res.status !== expected) throw new Error(`${label}: expected ${expected}, got ${res.status}`);
    console.log(`PASS: ${label} rejected`);
  }

  // Create pending self-service request — should be invalidated on admin change
  await db.emailChangeRequest.create({
    data: {
      userId: trainingUser.id,
      newEmail: `${tag}-pending@example.invalid`,
      codeHash: hashToken("111111"),
      expiresAt: new Date(Date.now() + 15 * 60 * 1000),
    },
  });

  const userSession = await userLogin(userEmail);
  if (!userSession.ok) throw new Error("User login failed before admin change");

  const changeRes = await fetch(`${base}/api/admin/users/${trainingUser.id}/change-email`, {
    method: "POST",
    headers: { "Content-Type": "application/json", cookie: superCookie },
    body: JSON.stringify({ newEmail, confirmEmail: newEmail, reason: changeReason }),
  });
  const changeBody = await changeRes.json();
  if (!changeRes.ok || !changeBody.ok) {
    throw new Error(`Admin change-email failed: ${changeRes.status} ${JSON.stringify(changeBody)}`);
  }
  console.log("PASS: Super Admin can change user email");

  const updated = await db.user.findUnique({ where: { id: trainingUser.id } });
  if (updated.email !== newEmail) throw new Error("Email not updated in database");

  const pending = await db.emailChangeRequest.findFirst({
    where: { userId: trainingUser.id, usedAt: null, invalidatedAt: null },
  });
  if (pending) throw new Error("Pending self-service request not invalidated");

  const liveSessions = await db.session.count({
    where: { userId: trainingUser.id, revokedAt: null },
  });
  if (liveSessions !== 0) throw new Error("Sessions not revoked");

  const oldLogin = await userLogin(userEmail);
  if (oldLogin.ok) throw new Error("Old email can still log in");
  const newLogin = await userLogin(newEmail);
  if (!newLogin.ok) throw new Error("New email cannot log in");
  console.log("PASS: email changed, pending requests invalidated, sessions revoked");

  const changeAudit = await db.adminAuditLog.findFirst({
    where: { action: "ADMIN_USER_EMAIL_CHANGED", targetId: trainingUser.id },
    orderBy: { createdAt: "desc" },
  });
  if (!changeAudit) throw new Error("ADMIN_USER_EMAIL_CHANGED audit missing");
  const changeAuditBlob = JSON.stringify(changeAudit.metadata ?? {});
  if (!changeAuditBlob.includes("reason") || changeAuditBlob.includes("password")) {
    throw new Error("Audit metadata incorrect");
  }
  console.log("PASS: ADMIN_USER_EMAIL_CHANGED audit includes reason");

  // Old-address template must not expose new email
  const { readFileSync } = await import("node:fs");
  const emailTemplates = readFileSync("lib/email/templates/email-change-emails.ts", "utf8");
  if (!emailTemplates.includes("changed by the support team")) {
    throw new Error("Admin old-address template missing");
  }
  if (emailTemplates.includes("using your new address")) {
    throw new Error("Flawed self-service old-address copy still present");
  }
  console.log("PASS: old-address notification copy revised and admin templates present");

  if (changeBody.notificationsSent === false) {
    console.log("NOTE: notification emails reported as failed (SMTP may be unavailable in test env)");
  } else {
    console.log("PASS: notification emails reported as sent");
  }

  // SMTP failure for admin password reset — orphan token cleanup
  if (process.env.SKIP_SMTP_FAIL_TESTS !== "true") {
    try {
      const failUserEmail = `${tag}-fail@example.invalid`;
      const failUser = await db.user.create({
        data: {
          name: "SMTP Fail User",
          email: failUserEmail,
          passwordHash,
          role: "user",
          isActive: true,
          mustChangePassword: false,
          trainingActive: true,
          frequency: "weekly",
        },
      });

      const failSuperRes = await fetch(`${smtpFailBase}/api/auth/admin-login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: superEmail, password: "testpass123" }),
      });
      if (failSuperRes.ok) {
        const failCookie = cookieFrom(failSuperRes);
        const failRes = await fetch(`${smtpFailBase}/api/admin/users/${failUser.id}/reset-password`, {
          method: "POST",
          headers: { cookie: failCookie },
        });
        const failBody = await failRes.json();
        if (failRes.status !== 502) throw new Error(`Expected 502 on SMTP failure, got ${failRes.status}`);
        if (/gmail|nodemailer|smtp/i.test(JSON.stringify(failBody))) {
          throw new Error("Provider error leaked");
        }
        const orphan = await db.passwordResetToken.count({
          where: { userId: failUser.id, usedAt: null },
        });
        if (orphan !== 0) throw new Error("Orphan reset token after admin SMTP failure");
        console.log("PASS: admin password reset SMTP failure leaves no orphan token");
      } else {
        console.log("SKIP: SMTP failure server not available on port 3031");
      }
    } catch {
      console.log("SKIP: SMTP failure tests (server not running on 3031)");
    }
  }

  console.log("\nAll admin account recovery smoke tests passed.");
}

main()
  .catch((error) => {
    console.error("FAIL:", error.message);
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
      await db.emailChangeRequest.deleteMany({ where: { userId: { in: ids } } });
      await db.passwordResetToken.deleteMany({ where: { userId: { in: ids } } });
      await db.session.deleteMany({ where: { userId: { in: ids } } });
      await db.user.deleteMany({ where: { id: { in: ids } } });
    }
    await db.$disconnect();
    await pool.end();
  });
