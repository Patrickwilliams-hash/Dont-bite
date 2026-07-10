/**
 * Smoke tests for the secure email-change flow and welcome email.
 * Run with a production server: $env:SMOKE_BASE_URL="http://localhost:3010"; node scripts/smoke-email-change.mjs
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
const base = process.env.SMOKE_BASE_URL ?? "http://localhost:3000";
const tag = `emailchange-${Date.now()}`;

function hashCode(code) {
  return crypto.createHash("sha256").update(code).digest("hex");
}

function cookieFrom(res) {
  return res.headers.get("set-cookie")?.split(";")[0] ?? "";
}

async function api(path, options = {}, cookie = "") {
  const res = await fetch(`${base}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(cookie ? { cookie } : {}),
      ...(options.headers ?? {}),
    },
  });
  const body = await res.json().catch(() => ({}));
  return { res, body };
}

async function login(email, password) {
  const res = await fetch(`${base}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) throw new Error(`Login failed for test user (${res.status})`);
  return cookieFrom(res);
}

async function main() {
  const passwordHash = await hash("testpass123", 12);
  const userEmail = `${tag}-user@example.invalid`;
  const newEmail = `${tag}-new@example.invalid`;
  const otherEmail = `${tag}-other@example.invalid`;

  const user = await db.user.create({
    data: {
      name: "Email Change Test",
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
      name: "Email Change Other",
      email: otherEmail,
      passwordHash,
      role: "user",
      isActive: true,
      mustChangePassword: false,
      trainingActive: true,
      frequency: "weekly",
    },
  });

  const cookie = await login(userEmail, "testpass123");

  // Unauthenticated request rejected
  {
    const { res } = await api("/api/account/email-change", {
      method: "POST",
      body: JSON.stringify({ currentPassword: "x", newEmail, confirmEmail: newEmail }),
    });
    if (res.status !== 401) throw new Error("Unauthenticated start should be 401");
    console.log("PASS: unauthenticated request rejected");
  }

  // Wrong password rejected
  {
    const { res } = await api(
      "/api/account/email-change",
      { method: "POST", body: JSON.stringify({ currentPassword: "wrongpass1", newEmail, confirmEmail: newEmail }) },
      cookie
    );
    if (res.status !== 401) throw new Error("Wrong password should be 401");
    console.log("PASS: wrong current password rejected");
  }

  // Mismatched emails rejected
  {
    const { res } = await api(
      "/api/account/email-change",
      { method: "POST", body: JSON.stringify({ currentPassword: "testpass123", newEmail, confirmEmail: otherEmail }) },
      cookie
    );
    if (res.status !== 400) throw new Error("Mismatched emails should be 400");
    console.log("PASS: mismatched new-email fields rejected");
  }

  // Same-as-current rejected
  {
    const { res } = await api(
      "/api/account/email-change",
      { method: "POST", body: JSON.stringify({ currentPassword: "testpass123", newEmail: userEmail, confirmEmail: userEmail }) },
      cookie
    );
    if (res.status !== 400) throw new Error("Current email should be rejected");
    console.log("PASS: current email rejected as new email");
  }

  // Duplicate email rejected
  {
    const { res } = await api(
      "/api/account/email-change",
      { method: "POST", body: JSON.stringify({ currentPassword: "testpass123", newEmail: otherEmail, confirmEmail: otherEmail }) },
      cookie
    );
    if (res.status !== 409) throw new Error("Duplicate email should be 409");
    console.log("PASS: email belonging to another account rejected");
  }

  // Valid start creates a hashed-code request and sends the email
  {
    const { res, body } = await api(
      "/api/account/email-change",
      { method: "POST", body: JSON.stringify({ currentPassword: "testpass123", newEmail, confirmEmail: newEmail }) },
      cookie
    );
    if (!res.ok || !body.pending) throw new Error(`Start failed: ${res.status} ${JSON.stringify(body)}`);
    if (JSON.stringify(body).match(/"code"|codeHash/)) throw new Error("API response leaked code data");
    console.log("PASS: valid start request accepted (no code in response)");

    const request = await db.emailChangeRequest.findFirst({
      where: { userId: user.id, usedAt: null, invalidatedAt: null },
      orderBy: { createdAt: "desc" },
    });
    if (!request) throw new Error("No pending request created");
    if (!/^[0-9a-f]{64}$/.test(request.codeHash)) throw new Error("codeHash is not a sha256 hex digest");
    if (/^\d{6}$/.test(request.codeHash)) throw new Error("Raw OTP stored");
    const minutes = (request.expiresAt.getTime() - Date.now()) / 60000;
    if (minutes < 13 || minutes > 16) throw new Error(`Expiry not ~15 minutes (${minutes.toFixed(1)}m)`);
    console.log("PASS: only OTP hash stored with ~15 minute expiry");
  }

  // Audit for request recorded without secrets
  {
    const entry = await db.adminAuditLog.findFirst({
      where: { action: "EMAIL_CHANGE_REQUESTED", targetId: user.id },
      orderBy: { createdAt: "desc" },
    });
    if (!entry) throw new Error("EMAIL_CHANGE_REQUESTED audit entry missing");
    const blob = JSON.stringify(entry.metadata ?? {});
    if (blob.includes("code") || blob.includes("password")) throw new Error("Audit metadata leaked secrets");
    console.log("PASS: EMAIL_CHANGE_REQUESTED audit recorded safely");
  }

  // New start invalidates the previous pending request
  {
    await api(
      "/api/account/email-change",
      { method: "POST", body: JSON.stringify({ currentPassword: "testpass123", newEmail, confirmEmail: newEmail }) },
      cookie
    );
    const pendingCount = await db.emailChangeRequest.count({
      where: { userId: user.id, usedAt: null, invalidatedAt: null },
    });
    if (pendingCount !== 1) throw new Error(`Expected 1 pending request, found ${pendingCount}`);
    console.log("PASS: starting again leaves exactly one active request");
  }

  // GET status reports the pending request
  {
    const { res, body } = await api("/api/account/email-change", {}, cookie);
    if (!res.ok || body.pending?.newEmail !== newEmail) throw new Error("Status GET did not report pending request");
    console.log("PASS: status endpoint reports pending request");
  }

  // Wrong OTP increments attempts
  {
    const { res } = await api(
      "/api/account/email-change/verify",
      { method: "POST", body: JSON.stringify({ code: "000000" }) },
      cookie
    );
    // A random collision with 000000 is possible but vanishingly unlikely; treat 200 as failure.
    if (res.status !== 400) throw new Error("Wrong code should be 400");
    const request = await db.emailChangeRequest.findFirst({
      where: { userId: user.id, usedAt: null, invalidatedAt: null },
    });
    if (!request || request.failedAttempts !== 1) throw new Error("failedAttempts not incremented");
    console.log("PASS: wrong OTP rejected and attempts incremented");
  }

  // Too many attempts invalidates the request
  {
    for (let i = 0; i < 4; i++) {
      await api(
        "/api/account/email-change/verify",
        { method: "POST", body: JSON.stringify({ code: "000001" }) },
        cookie
      );
    }
    const active = await db.emailChangeRequest.findFirst({
      where: { userId: user.id, usedAt: null, invalidatedAt: null, expiresAt: { gt: new Date() } },
    });
    if (active) throw new Error("Request should be invalidated after 5 failed attempts");
    console.log("PASS: request invalidated after too many failed attempts");
  }

  // Resend cooldown enforced, then resend works and invalidates old code
  {
    // Recreate a pending request through the API (fresh code, fresh createdAt).
    await api(
      "/api/account/email-change",
      { method: "POST", body: JSON.stringify({ currentPassword: "testpass123", newEmail, confirmEmail: newEmail }) },
      cookie
    );
    const { res: coolRes } = await api("/api/account/email-change/resend", { method: "POST" }, cookie);
    if (coolRes.status !== 429) throw new Error("Resend inside cooldown should be 429");
    console.log("PASS: resend cooldown enforced");

    const before = await db.emailChangeRequest.findFirst({
      where: { userId: user.id, usedAt: null, invalidatedAt: null },
    });
    // Backdate the request so the cooldown has elapsed.
    await db.emailChangeRequest.update({
      where: { id: before.id },
      data: { createdAt: new Date(Date.now() - 61_000) },
    });
    const { res: resendRes } = await api("/api/account/email-change/resend", { method: "POST" }, cookie);
    if (!resendRes.ok) throw new Error(`Resend failed (${resendRes.status})`);
    const oldRecord = await db.emailChangeRequest.findUnique({ where: { id: before.id } });
    if (!oldRecord?.invalidatedAt) throw new Error("Resend did not invalidate the previous code");
    console.log("PASS: resend issues new code and invalidates the old one");
  }

  // Cancel works
  {
    const { res } = await api("/api/account/email-change/cancel", { method: "POST" }, cookie);
    if (!res.ok) throw new Error("Cancel failed");
    const active = await db.emailChangeRequest.findFirst({
      where: { userId: user.id, usedAt: null, invalidatedAt: null },
    });
    if (active) throw new Error("Cancel left an active request");
    const audit = await db.adminAuditLog.findFirst({
      where: { action: "EMAIL_CHANGE_CANCELLED", targetId: user.id },
    });
    if (!audit) throw new Error("EMAIL_CHANGE_CANCELLED audit entry missing");
    console.log("PASS: cancel invalidates pending request and audits");
  }

  // Expired OTP rejected (inserted directly with a known code)
  {
    const knownCode = "424242";
    await db.emailChangeRequest.create({
      data: {
        userId: user.id,
        newEmail,
        codeHash: hashCode(knownCode),
        expiresAt: new Date(Date.now() - 60_000),
      },
    });
    const { res } = await api(
      "/api/account/email-change/verify",
      { method: "POST", body: JSON.stringify({ code: knownCode }) },
      cookie
    );
    if (res.status !== 400) throw new Error("Expired code should be 400");
    console.log("PASS: expired OTP rejected");
  }

  // Correct OTP completes the change, revokes sessions, and blocks reuse
  {
    const knownCode = "313131";
    await db.emailChangeRequest.updateMany({
      where: { userId: user.id, usedAt: null, invalidatedAt: null },
      data: { invalidatedAt: new Date() },
    });
    await db.emailChangeRequest.create({
      data: {
        userId: user.id,
        newEmail,
        codeHash: hashCode(knownCode),
        expiresAt: new Date(Date.now() + 15 * 60_000),
      },
    });

    const secondCookie = await login(userEmail, "testpass123");

    const { res, body } = await api(
      "/api/account/email-change/verify",
      { method: "POST", body: JSON.stringify({ code: knownCode }) },
      cookie
    );
    if (!res.ok || !body.ok) throw new Error(`Verify failed: ${res.status} ${JSON.stringify(body)}`);
    console.log("PASS: correct OTP changes the account email");

    const updated = await db.user.findUnique({ where: { id: user.id } });
    if (updated.email !== newEmail) throw new Error("User email was not updated");

    const { res: reuse } = await api(
      "/api/account/email-change/verify",
      { method: "POST", body: JSON.stringify({ code: knownCode }) },
      cookie
    );
    if (reuse.status === 200) throw new Error("Reused OTP should be rejected");
    console.log("PASS: reused OTP rejected");

    const liveSessions = await db.session.count({
      where: { userId: user.id, revokedAt: null },
    });
    if (liveSessions !== 0) throw new Error(`Sessions not revoked (${liveSessions} live)`);
    const { res: sessionRes, body: sessionBody } = await api("/api/auth/session", {}, secondCookie);
    if (sessionRes.ok && sessionBody.user) throw new Error("Old session still valid after email change");
    console.log("PASS: all sessions revoked after email change");

    const oldLogin = await fetch(`${base}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: userEmail, password: "testpass123" }),
    });
    if (oldLogin.ok) throw new Error("Old email can still log in");
    const newLogin = await fetch(`${base}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: newEmail, password: "testpass123" }),
    });
    if (!newLogin.ok) throw new Error("New email cannot log in");
    console.log("PASS: old email rejected, new email logs in");

    const audit = await db.adminAuditLog.findFirst({
      where: { action: "EMAIL_CHANGE_COMPLETED", targetId: user.id },
    });
    if (!audit) throw new Error("EMAIL_CHANGE_COMPLETED audit entry missing");
    console.log("PASS: EMAIL_CHANGE_COMPLETED audit recorded");
  }

  // Welcome email: signup succeeds and audit records the send
  {
    const signupEmail = `${tag}-signup@example.invalid`;
    const res = await fetch(`${base}/api/auth/signup`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Welcome Test",
        email: signupEmail,
        password: "signuppass1",
        frequency: "weekly",
      }),
    });
    if (res.status !== 201) throw new Error(`Signup failed (${res.status})`);
    console.log("PASS: signup creates account");

    // Welcome email sends after the response; poll the audit log briefly.
    let welcomeAudit = null;
    for (let i = 0; i < 20 && !welcomeAudit; i++) {
      await new Promise((r) => setTimeout(r, 500));
      welcomeAudit = await db.adminAuditLog.findFirst({
        where: { action: "WELCOME_EMAIL_SENT", targetLabel: signupEmail },
      });
    }
    if (!welcomeAudit) throw new Error("WELCOME_EMAIL_SENT audit entry missing after signup");
    console.log("PASS: welcome email sent after signup (audit confirmed)");
  }

  console.log("\nAll email-change and welcome-email smoke tests passed.");
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
      await db.session.deleteMany({ where: { userId: { in: ids } } });
      await db.user.deleteMany({ where: { id: { in: ids } } });
    }
    await db.$disconnect();
    await pool.end();
  });
