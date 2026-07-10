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
const base = process.env.SMTP_FAIL_BASE_URL ?? "http://localhost:3012";
const tag = `smtpfail-${Date.now()}`;
const genericMessage =
  "If an account exists for that email address, we've sent password reset instructions.";

async function main() {
  const email = `${tag}@example.invalid`;
  const passwordHash = await hash("testpass12", 12);
  const user = await db.user.create({
    data: {
      name: "SMTP Failure Test",
      email,
      passwordHash,
      role: "user",
      isActive: true,
      mustChangePassword: false,
      trainingActive: true,
      frequency: "weekly",
    },
  });

  const res = await fetch(`${base}/api/auth/forgot-password`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
  });
  const body = await res.json();
  const orphanCount = await db.passwordResetToken.count({
    where: { userId: user.id, usedAt: null },
  });

  if (!res.ok || body.message !== genericMessage) {
    throw new Error(`Expected generic response, got ${res.status} ${JSON.stringify(body)}`);
  }
  if (body.error && /gmail|nodemailer|smtp/i.test(JSON.stringify(body))) {
    throw new Error("Provider error leaked to client");
  }
  if (orphanCount !== 0) {
    throw new Error(`Orphan reset token remains after SMTP failure (${orphanCount})`);
  }

  console.log("PASS: SMTP failure returns generic message");
  console.log("PASS: no orphan reset token after send failure");
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
    const ids = users.map((u) => u.id);
    if (ids.length) {
      await db.passwordResetToken.deleteMany({ where: { userId: { in: ids } } });
      await db.user.deleteMany({ where: { id: { in: ids } } });
    }
    await db.$disconnect();
    await pool.end();
  });
