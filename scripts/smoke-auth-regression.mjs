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
const base = process.env.SMOKE_BASE_URL ?? "http://localhost:3010";
const tag = `regress-${Date.now()}`;

function cookieFrom(res) {
  return res.headers.get("set-cookie")?.split(";")[0] ?? "";
}

async function main() {
  const signupEmail = `${tag}-signup@example.invalid`;
  const signupRes = await fetch(`${base}/api/auth/signup`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: "Regression Signup",
      email: signupEmail,
      password: "signuppass1",
      frequency: "weekly",
    }),
  });
  if (!signupRes.ok) {
    throw new Error(`Signup failed: ${signupRes.status} ${await signupRes.text()}`);
  }
  console.log("PASS: signup");

  const loginRes = await fetch(`${base}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: signupEmail, password: "signuppass1" }),
  });
  if (!loginRes.ok) {
    throw new Error(`Login failed: ${loginRes.status} ${await loginRes.text()}`);
  }
  const sessionCookie = cookieFrom(loginRes);
  console.log("PASS: login");

  const sessionRes = await fetch(`${base}/api/auth/session`, {
    headers: { cookie: sessionCookie },
  });
  if (!sessionRes.ok) {
    throw new Error(`Session check failed: ${sessionRes.status}`);
  }
  console.log("PASS: session");

  const changeRes = await fetch(`${base}/api/auth/change-password`, {
    method: "POST",
    headers: { "Content-Type": "application/json", cookie: sessionCookie },
    body: JSON.stringify({
      currentPassword: "signuppass1",
      newPassword: "changedpass1",
    }),
  });
  if (!changeRes.ok) {
    throw new Error(`Change password failed: ${changeRes.status} ${await changeRes.text()}`);
  }
  console.log("PASS: change-password");

  const logoutRes = await fetch(`${base}/api/auth/logout`, {
    method: "POST",
    headers: { cookie: sessionCookie },
  });
  if (!logoutRes.ok) {
    throw new Error(`Logout failed: ${logoutRes.status}`);
  }
  console.log("PASS: logout");

  const adminEmail = `${tag}-admin@example.invalid`;
  const adminPasswordHash = await hash("adminpass123", 12);
  await db.user.create({
    data: {
      name: "Regression Admin",
      email: adminEmail,
      passwordHash: adminPasswordHash,
      role: "admin",
      isActive: true,
      mustChangePassword: false,
      trainingActive: false,
      frequency: "weekly",
      adminTier: "super_admin",
    },
  });

  const adminLogin = await fetch(`${base}/api/auth/admin-login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: adminEmail, password: "adminpass123" }),
  });
  if (!adminLogin.ok) {
    throw new Error(`Admin login failed: ${adminLogin.status} ${await adminLogin.text()}`);
  }
  console.log("PASS: admin login");

  console.log("\nAll auth regression tests passed.");
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
      await db.session.deleteMany({ where: { userId: { in: ids } } });
      await db.user.deleteMany({ where: { id: { in: ids } } });
    }
    await db.$disconnect();
    await pool.end();
  });
