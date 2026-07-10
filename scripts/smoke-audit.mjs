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
const base = process.env.SMOKE_BASE_URL ?? "http://localhost:3030";
const tag = `audit-${Date.now()}`;

async function main() {
  const passwordHash = await hash("testpass123", 12);
  const superEmail = `${tag}-super@example.invalid`;
  const limitedEmail = `${tag}-limited@example.invalid`;
  const userEmail = `${tag}-user@example.invalid`;

  const superAdmin = await db.user.create({
    data: {
      name: "Audit Super",
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

  const limitedAdmin = await db.user.create({
    data: {
      name: "Audit Limited",
      email: limitedEmail,
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

  await db.user.create({
    data: {
      name: "Audit User",
      email: userEmail,
      passwordHash,
      role: "user",
      isActive: true,
      mustChangePassword: false,
      trainingActive: true,
      frequency: "weekly",
    },
  });

  const superLogin = await fetch(`${base}/api/auth/admin-login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: superEmail, password: "testpass123" }),
  });
  if (!superLogin.ok) throw new Error(`Super admin login failed: ${superLogin.status}`);
  const superCookie = superLogin.headers.get("set-cookie")?.split(";")[0] ?? "";

  const meRes = await fetch(`${base}/api/admin/me`, { headers: { cookie: superCookie } });
  const me = await meRes.json();
  if (!meRes.ok || me.administrator?.adminTierLabel !== "Super Admin") {
    throw new Error("Admin me failed for super admin");
  }
  console.log("PASS: /api/admin/me returns Super Admin from session");

  const limitedLogin = await fetch(`${base}/api/auth/admin-login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: limitedEmail, password: "testpass123" }),
  });
  const limitedCookie = limitedLogin.headers.get("set-cookie")?.split(";")[0] ?? "";

  const deniedAudit = await fetch(`${base}/api/admin/audit-log`, {
    headers: { cookie: limitedCookie },
  });
  if (deniedAudit.status !== 403) throw new Error(`Expected 403 for audit log, got ${deniedAudit.status}`);
  console.log("PASS: administrator without view_audit_log gets 403");

  const userLogin = await fetch(`${base}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: userEmail, password: "testpass123" }),
  });
  const userCookie = userLogin.headers.get("set-cookie")?.split(";")[0] ?? "";
  const userAudit = await fetch(`${base}/api/admin/audit-log`, { headers: { cookie: userCookie } });
  if (userAudit.status !== 403) throw new Error(`Expected 403 for normal user audit API, got ${userAudit.status}`);
  console.log("PASS: normal user cannot access audit log API");

  const createRes = await fetch(`${base}/api/admin/administrators`, {
    method: "POST",
    headers: { "Content-Type": "application/json", cookie: superCookie },
    body: JSON.stringify({ name: "Created Admin", email: `${tag}-created@example.invalid` }),
  });
  const createBody = await createRes.json();
  if (!createRes.ok || !createBody.administrator) throw new Error("Create admin failed");
  console.log("PASS: super admin can create administrator");

  const auditRes = await fetch(`${base}/api/admin/audit-log?category=administrators`, {
    headers: { cookie: superCookie },
  });
  const auditBody = await auditRes.json();
  const createdEntry = auditBody.entries?.find((entry) => entry.action === "ADMIN_CREATED");
  if (!createdEntry) throw new Error("ADMIN_CREATED audit entry missing");
  if (JSON.stringify(createdEntry).includes("tempPassword")) {
    throw new Error("Audit log leaked temporary password data");
  }
  console.log("PASS: ADMIN_CREATED audit entry recorded without password data");

  const logoutRes = await fetch(`${base}/api/auth/logout`, {
    method: "POST",
    headers: { cookie: superCookie },
  });
  if (!logoutRes.ok) throw new Error("Logout failed");
  const sessionAfter = await fetch(`${base}/api/admin/me`, { headers: { cookie: superCookie } });
  if (sessionAfter.status !== 401) throw new Error("Session not revoked after logout");
  console.log("PASS: admin logout revokes session");

  await db.adminAuditLog.deleteMany({
    where: { actorUserId: { in: [superAdmin.id, limitedAdmin.id] } },
  });
  await db.user.deleteMany({
    where: {
      email: {
        in: [
          superEmail,
          limitedEmail,
          userEmail,
          `${tag}-created@example.invalid`,
        ],
      },
    },
  });

  await db.$disconnect();
  await pool.end();
}

main().catch(async (error) => {
  console.error("FAIL:", error.message);
  await db.$disconnect().catch(() => {});
  await pool.end().catch(() => {});
  process.exit(1);
});
