/**
 * SMTP failure tests: signup must still succeed, and a failed
 * verification-code send must not leave an orphan email-change request.
 * Run against a server started with an invalid EMAIL_HOST:
 *   $env:SMTP_FAIL_BASE_URL="http://localhost:3031"; node scripts/test-email-change-smtp-failure.mjs
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
const tag = `ecfail-${Date.now()}`;

async function main() {
  // Welcome email failure must not prevent account creation.
  const signupEmail = `${tag}-signup@example.invalid`;
  const signupRes = await fetch(`${base}/api/auth/signup`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: "SMTP Fail Signup",
      email: signupEmail,
      password: "signuppass1",
      frequency: "weekly",
    }),
  });
  if (signupRes.status !== 201) {
    throw new Error(`Signup should succeed despite SMTP failure (${signupRes.status})`);
  }
  const created = await db.user.findUnique({ where: { email: signupEmail } });
  if (!created) throw new Error("Account missing after signup");
  console.log("PASS: signup succeeds when welcome email delivery fails");

  await new Promise((r) => setTimeout(r, 2000));
  const welcomeAudit = await db.adminAuditLog.findFirst({
    where: { action: "WELCOME_EMAIL_SENT", targetLabel: signupEmail },
  });
  if (welcomeAudit) throw new Error("WELCOME_EMAIL_SENT recorded despite delivery failure");
  console.log("PASS: no WELCOME_EMAIL_SENT audit when delivery fails");

  // Email-change start must not leave an orphan request when the code can't be sent.
  const userEmail = `${tag}-user@example.invalid`;
  const passwordHash = await hash("testpass123", 12);
  const user = await db.user.create({
    data: {
      name: "SMTP Fail Change",
      email: userEmail,
      passwordHash,
      role: "user",
      isActive: true,
      mustChangePassword: false,
      trainingActive: true,
      frequency: "weekly",
    },
  });

  const loginRes = await fetch(`${base}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: userEmail, password: "testpass123" }),
  });
  if (!loginRes.ok) throw new Error("Login failed");
  const cookie = loginRes.headers.get("set-cookie")?.split(";")[0] ?? "";

  const newEmail = `${tag}-new@example.invalid`;
  const startRes = await fetch(`${base}/api/account/email-change`, {
    method: "POST",
    headers: { "Content-Type": "application/json", cookie },
    body: JSON.stringify({
      currentPassword: "testpass123",
      newEmail,
      confirmEmail: newEmail,
    }),
  });
  const startBody = await startRes.json();
  if (startRes.status !== 502) {
    throw new Error(`Expected 502 on send failure, got ${startRes.status}`);
  }
  if (/gmail|nodemailer|smtp|ENOTFOUND/i.test(JSON.stringify(startBody))) {
    throw new Error("Provider error leaked to client");
  }
  console.log("PASS: email-change start returns safe generic error on SMTP failure");

  const orphan = await db.emailChangeRequest.count({
    where: { userId: user.id, usedAt: null, invalidatedAt: null },
  });
  if (orphan !== 0) throw new Error(`Orphan email-change request remains (${orphan})`);
  console.log("PASS: no orphan email-change request after send failure");

  console.log("\nAll SMTP failure tests passed.");
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
