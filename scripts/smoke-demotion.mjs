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

const tag = `smoke-${Date.now()}`;
const actorEmail = `${tag}-actor@example.invalid`;
const targetEmail = `${tag}-target@example.invalid`;

async function main() {
  const passwordHash = await hash("testpass123", 12);

  const actor = await db.user.create({
    data: {
      name: "Smoke Actor Admin",
      email: actorEmail,
      passwordHash,
      role: "admin",
      isActive: true,
      mustChangePassword: false,
      trainingActive: false,
      frequency: "monthly",
    },
  });

  const target = await db.user.create({
    data: {
      name: "Smoke Target Admin",
      email: targetEmail,
      passwordHash,
      role: "admin",
      isActive: true,
      mustChangePassword: false,
      trainingActive: false,
      frequency: "monthly",
    },
  });

  const base = process.env.SMOKE_BASE_URL ?? "http://localhost:3010";

  const loginRes = await fetch(`${base}/api/auth/admin-login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: actorEmail, password: "testpass123" }),
  });
  if (!loginRes.ok) {
    throw new Error(`Admin login failed: ${loginRes.status} ${await loginRes.text()}`);
  }

  const cookie = loginRes.headers.get("set-cookie");
  if (!cookie) throw new Error("Missing session cookie from admin login");

  const demoteRes = await fetch(`${base}/api/admin/administrators/${target.id}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      cookie: cookie.split(";")[0],
    },
    body: JSON.stringify({ role: "user" }),
  });
  const demoteBody = await demoteRes.json();
  if (!demoteRes.ok) {
    throw new Error(`Demote failed: ${demoteRes.status} ${JSON.stringify(demoteBody)}`);
  }

  const demoted = await db.user.findUnique({
    where: { id: target.id },
    select: { role: true, trainingActive: true },
  });

  if (demoted?.role !== "user") {
    throw new Error(`Expected role=user, got ${demoted?.role}`);
  }
  if (demoted?.trainingActive !== false) {
    throw new Error(`Expected trainingActive=false, got ${demoted?.trainingActive}`);
  }

  console.log("PASS: demoted admin has role=user and trainingActive=false");

  await db.user.deleteMany({ where: { id: { in: [actor.id, target.id] } } });
  await db.$disconnect();
  await pool.end();
}

main().catch(async (error) => {
  console.error("FAIL:", error.message);
  await db.$disconnect().catch(() => {});
  await pool.end().catch(() => {});
  process.exit(1);
});
