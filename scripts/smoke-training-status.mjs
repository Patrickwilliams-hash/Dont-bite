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
const base = process.env.SMOKE_BASE_URL ?? "http://localhost:3099";
const tag = `train-${Date.now()}`;

function assert(condition, message) {
  if (!condition) throw new Error(message);
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
  if (!res.ok) throw new Error(`Admin login failed for ${email}: ${res.status}`);
  return cookieFrom(res);
}

async function userLogin(email) {
  const res = await fetch(`${base}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password: "testpass123" }),
  });
  if (!res.ok) throw new Error(`User login failed for ${email}: ${res.status}`);
  return cookieFrom(res);
}

function setTraining(cookie, userId, trainingActive) {
  return fetch(`${base}/api/admin/users/${userId}/training`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", cookie },
    body: JSON.stringify({ trainingActive }),
  });
}

async function searchEligible(cookie, query) {
  const res = await fetch(
    `${base}/api/admin/drills/eligible-users/search?q=${encodeURIComponent(query)}`,
    { headers: { cookie } }
  );
  const payload = await res.json();
  return { res, payload };
}

async function main() {
  const passwordHash = await hash("testpass123", 12);

  const superEmail = `${tag}-super@example.invalid`;
  const usersAdminEmail = `${tag}-usersadmin@example.invalid`;
  const bareAdminEmail = `${tag}-bare@example.invalid`;
  const targetEmail = `${tag}-target@example.invalid`;
  const adminTargetEmail = `${tag}-admintarget@example.invalid`;
  const normalUserEmail = `${tag}-user@example.invalid`;

  const superAdmin = await db.user.create({
    data: {
      name: `${tag} Super`, email: superEmail, passwordHash,
      role: "admin", adminTier: "super_admin", adminPermissions: [],
      isActive: true, mustChangePassword: false, trainingActive: false, frequency: "monthly",
    },
  });

  const usersAdmin = await db.user.create({
    data: {
      name: `${tag} Users Admin`, email: usersAdminEmail, passwordHash,
      role: "admin", adminTier: "administrator", adminPermissions: ["manage_users", "manage_drills"],
      isActive: true, mustChangePassword: false, trainingActive: false, frequency: "monthly",
    },
  });

  const bareAdmin = await db.user.create({
    data: {
      name: `${tag} Bare Admin`, email: bareAdminEmail, passwordHash,
      role: "admin", adminTier: "administrator", adminPermissions: [],
      isActive: true, mustChangePassword: false, trainingActive: false, frequency: "monthly",
    },
  });

  const targetUser = await db.user.create({
    data: {
      name: `${tag} Target User`, email: targetEmail, passwordHash,
      role: "user", isActive: true, mustChangePassword: false, trainingActive: true, frequency: "weekly",
    },
  });

  const adminTarget = await db.user.create({
    data: {
      name: `${tag} Admin Target`, email: adminTargetEmail, passwordHash,
      role: "admin", adminTier: "administrator", adminPermissions: [],
      isActive: true, mustChangePassword: false, trainingActive: true, frequency: "monthly",
    },
  });

  const normalUser = await db.user.create({
    data: {
      name: `${tag} Normal User`, email: normalUserEmail, passwordHash,
      role: "user", isActive: true, mustChangePassword: false, trainingActive: true, frequency: "weekly",
    },
  });

  const adminIds = [superAdmin.id, usersAdmin.id, bareAdmin.id, adminTarget.id];
  const userIds = [targetUser.id, normalUser.id];

  try {
    const healthOk = await fetch(`${base}/`, { signal: AbortSignal.timeout(3000) })
      .then((r) => r.ok)
      .catch(() => false);
    assert(healthOk, `server not reachable at ${base} — start the dev server first`);

    const superCookie = await adminLogin(superEmail);
    const usersAdminCookie = await adminLogin(usersAdminEmail);
    const bareCookie = await adminLogin(bareAdminEmail);
    const userCookie = await userLogin(normalUserEmail);

    // Permission enforcement
    const bareRes = await setTraining(bareCookie, targetUser.id, false);
    assert(bareRes.status === 403, "admin without manage_users should receive 403");
    console.log("PASS: admin without manage_users receives 403");

    const userRes = await setTraining(userCookie, targetUser.id, false);
    assert(userRes.status === 403, "normal user should receive 403");
    console.log("PASS: normal user receives 403");

    const adminTargetRes = await setTraining(superCookie, adminTarget.id, false);
    assert(adminTargetRes.status === 403, "administrator target should be rejected");
    const adminTargetRow = await db.user.findUnique({ where: { id: adminTarget.id } });
    assert(adminTargetRow.trainingActive === true, "administrator target trainingActive changed");
    console.log("PASS: administrator target cannot be changed via user training endpoint");

    // Baseline: target appears in eligible search
    const before = await searchEligible(superCookie, tag);
    assert(before.res.ok, "eligible search failed");
    assert(before.payload.users?.some((u) => u.id === targetUser.id), "target missing from eligible search before pause");
    console.log("PASS: active training user appears in eligible search");

    // Super Admin pauses training
    const superPause = await setTraining(superCookie, targetUser.id, false);
    assert(superPause.ok, `super admin pause failed: ${superPause.status}`);
    const superPausePayload = await superPause.json();
    assert(superPausePayload.user?.trainingActive === false, "pause response did not reflect false");
    const afterPause = await db.user.findUnique({ where: { id: targetUser.id } });
    assert(afterPause.trainingActive === false, "database trainingActive not set to false");
    assert(afterPause.isActive === true, "isActive unexpectedly changed during pause");
    console.log("PASS: Super Admin pauses training and DB updates (isActive untouched)");

    const pauseAudit = await db.adminAuditLog.findFirst({
      where: { action: "USER_TRAINING_PAUSED", actorUserId: superAdmin.id, targetId: targetUser.id },
      orderBy: { createdAt: "desc" },
    });
    assert(pauseAudit, "USER_TRAINING_PAUSED audit missing");
    const pauseBlob = JSON.stringify(pauseAudit.metadata ?? {});
    assert(pauseBlob.includes("trainingActive"), "pause audit metadata missing trainingActive");
    assert(!pauseBlob.includes("passwordHash"), "pause audit leaked sensitive data");
    console.log("PASS: USER_TRAINING_PAUSED audit recorded with safe metadata");

    // Paused user disappears from eligible search
    const duringPause = await searchEligible(superCookie, tag);
    assert(!duringPause.payload.users?.some((u) => u.id === targetUser.id), "paused user still in eligible search");
    console.log("PASS: paused user excluded from eligible search");

    // manage_users admin reactivates training
    const adminResume = await setTraining(usersAdminCookie, targetUser.id, true);
    assert(adminResume.ok, `manage_users reactivate failed: ${adminResume.status}`);
    const adminResumePayload = await adminResume.json();
    assert(adminResumePayload.user?.trainingActive === true, "reactivate response did not reflect true");
    const afterResume = await db.user.findUnique({ where: { id: targetUser.id } });
    assert(afterResume.trainingActive === true, "database trainingActive not set to true");
    console.log("PASS: manage_users admin reactivates training and DB updates");

    const resumeAudit = await db.adminAuditLog.findFirst({
      where: { action: "USER_TRAINING_REACTIVATED", actorUserId: usersAdmin.id, targetId: targetUser.id },
      orderBy: { createdAt: "desc" },
    });
    assert(resumeAudit, "USER_TRAINING_REACTIVATED audit missing");
    console.log("PASS: USER_TRAINING_REACTIVATED audit recorded");

    // Reactivated user reappears in eligible search
    const afterReactivate = await searchEligible(superCookie, tag);
    assert(afterReactivate.payload.users?.some((u) => u.id === targetUser.id), "reactivated user missing from eligible search");
    console.log("PASS: reactivated user reappears in eligible search");

    // Overview API exposes trainingActive
    const overviewRes = await fetch(`${base}/api/admin/overview`, { headers: { cookie: superCookie } });
    const overviewPayload = await overviewRes.json();
    const overviewTarget = overviewPayload.users?.find((u) => u.id === targetUser.id);
    assert(overviewTarget && typeof overviewTarget.trainingActive === "boolean", "overview API does not expose trainingActive");
    console.log("PASS: overview API exposes trainingActive");

    console.log("ALL PASS: smoke-training-status");
  } finally {
    for (const id of adminIds) {
      await db.adminAuditLog.deleteMany({ where: { actorUserId: id } }).catch(() => {});
    }
    for (const id of [...adminIds, ...userIds]) {
      await db.adminAuditLog.deleteMany({ where: { targetId: id } }).catch(() => {});
    }
    for (const id of userIds) {
      await db.user.delete({ where: { id } }).catch(() => {});
    }
    for (const id of adminIds) {
      await db.user.delete({ where: { id } }).catch(() => {});
    }
    await db.$disconnect();
    await pool.end();
  }
}

main().catch((error) => {
  console.error("FAIL:", error.message);
  process.exit(1);
});
