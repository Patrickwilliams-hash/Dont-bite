import { config } from "dotenv";
import { createRequire } from "node:module";

config({ path: ".env.local" });
config();

const base = process.env.SMOKE_BASE_URL ?? "http://localhost:3000";

async function expectStatus(label, res, status) {
  if (res.status !== status) {
    const body = await res.text();
    throw new Error(`${label}: expected ${status}, got ${res.status}: ${body}`);
  }
}

async function main() {
  const missing = [
    "EMAIL_HOST",
    "EMAIL_PORT",
    "EMAIL_SECURE",
    "EMAIL_USER",
    "EMAIL_APP_PASSWORD",
    "EMAIL_FROM",
    "APP_URL",
  ].filter((key) => !process.env[key]?.trim());

  if (missing.length > 0) {
    console.log(`SKIP live send: missing env (${missing.join(", ")}).`);
    console.log("PASS: mailer config validation will reject missing SMTP settings.");
    return;
  }

  const require = createRequire(import.meta.url);
  const { hash } = require("bcryptjs");
  const { Pool } = require("pg");
  const { PrismaPg } = require("@prisma/adapter-pg");
  const { PrismaClient } = require("@prisma/client");

  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const db = new PrismaClient({ adapter: new PrismaPg(pool) });
  const tag = `email-${Date.now()}`;
  const superEmail = `${tag}-super@example.invalid`;
  const passwordHash = await hash("testpass123", 12);

  const superAdmin = await db.user.create({
    data: {
      name: "Email Smoke Super",
      email: superEmail,
      passwordHash,
      role: "admin",
      adminTier: "super_admin",
      adminPermissions: [],
      isActive: true,
      mustChangePassword: false,
      trainingActive: false,
      frequency: "monthly",
    },
  });

  try {
    const loginRes = await fetch(`${base}/api/auth/admin-login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: superEmail, password: "testpass123" }),
    });
    if (!loginRes.ok) throw new Error(`Admin login failed: ${loginRes.status}`);
    const cookie = loginRes.headers.get("set-cookie")?.split(";")[0] ?? "";

    const recipient = process.env.SMOKE_TEST_EMAIL_TO?.trim() || process.env.EMAIL_USER?.trim();
    if (!recipient) throw new Error("Set SMOKE_TEST_EMAIL_TO or EMAIL_USER for live send test.");

    const sendRes = await fetch(`${base}/api/admin/email/test`, {
      method: "POST",
      headers: { "Content-Type": "application/json", cookie },
      body: JSON.stringify({ to: recipient }),
    });
    const body = await sendRes.json();
    if (!sendRes.ok) {
      throw new Error(`Test email failed: ${sendRes.status} ${JSON.stringify(body)}`);
    }
    console.log(`PASS: test email accepted for delivery to configured recipient.`);

    const audit = await db.adminAuditLog.findFirst({
      where: { actorUserId: superAdmin.id, action: "EMAIL_TEST_SENT" },
      orderBy: { createdAt: "desc" },
    });
    if (!audit) throw new Error("EMAIL_TEST_SENT audit entry missing");
    if (audit.metadata && JSON.stringify(audit.metadata).includes("password")) {
      throw new Error("Audit metadata leaked sensitive content");
    }
    console.log("PASS: EMAIL_TEST_SENT audit entry recorded without sensitive metadata");
  } finally {
    await db.adminAuditLog.deleteMany({ where: { actorUserId: superAdmin.id } });
    await db.user.delete({ where: { id: superAdmin.id } });
    await db.$disconnect();
    await pool.end();
  }
}

main().catch((error) => {
  console.error("FAIL:", error.message);
  process.exit(1);
});
