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
const tag = `perm-${Date.now()}`;

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

async function expectStatus(label, res, status) {
  if (res.status !== status) {
    const body = await res.text();
    throw new Error(`${label}: expected ${status}, got ${res.status}: ${body}`);
  }
}

async function main() {
  const passwordHash = await hash("testpass123", 12);

  const superEmail = `${tag}-super@example.invalid`;
  const manageAdminsEmail = `${tag}-manage-admins@example.invalid`;
  const manageUsersEmail = `${tag}-manage-users@example.invalid`;
  const auditEmail = `${tag}-audit@example.invalid`;
  const bareEmail = `${tag}-bare@example.invalid`;
  const userEmail = `${tag}-user@example.invalid`;
  const promoteTargetEmail = `${tag}-promote@example.invalid`;
  const patchTargetEmail = `${tag}-patch-target@example.invalid`;

  const superAdmin = await db.user.create({
    data: {
      name: "Perm Super",
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

  const manageAdminsAdmin = await db.user.create({
    data: {
      name: "Perm Manage Admins",
      email: manageAdminsEmail,
      passwordHash,
      role: "admin",
      adminTier: "administrator",
      adminPermissions: ["manage_admins"],
      isActive: true,
      mustChangePassword: false,
      trainingActive: false,
      frequency: "monthly",
    },
  });

  const manageUsersAdmin = await db.user.create({
    data: {
      name: "Perm Manage Users",
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

  const auditAdmin = await db.user.create({
    data: {
      name: "Perm Audit",
      email: auditEmail,
      passwordHash,
      role: "admin",
      adminTier: "administrator",
      adminPermissions: ["view_audit_log"],
      isActive: true,
      mustChangePassword: false,
      trainingActive: false,
      frequency: "monthly",
    },
  });

  const bareAdmin = await db.user.create({
    data: {
      name: "Perm Bare",
      email: bareEmail,
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
      name: "Perm Training User",
      email: userEmail,
      passwordHash,
      role: "user",
      isActive: true,
      mustChangePassword: false,
      trainingActive: true,
      frequency: "weekly",
    },
  });

  const promoteTarget = await db.user.create({
    data: {
      name: "Promote Target",
      email: promoteTargetEmail,
      passwordHash,
      role: "user",
      isActive: true,
      mustChangePassword: false,
      trainingActive: true,
      frequency: "monthly",
    },
  });

  const patchTarget = await db.user.create({
    data: {
      name: "Patch Target",
      email: patchTargetEmail,
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

  const superCookie = await adminLogin(superEmail);
  const manageAdminsCookie = await adminLogin(manageAdminsEmail);
  const manageUsersCookie = await adminLogin(manageUsersEmail);
  const auditCookie = await adminLogin(auditEmail);
  const bareCookie = await adminLogin(bareEmail);
  const userCookie = await userLogin(userEmail);

  // normal user receives 403 from all admin APIs (before any user deletion)
  await expectStatus("user /api/admin/me", await fetch(`${base}/api/admin/me`, { headers: { cookie: userCookie } }), 403);
  await expectStatus("user overview", await fetch(`${base}/api/admin/overview`, { headers: { cookie: userCookie } }), 403);
  await expectStatus("user administrators", await fetch(`${base}/api/admin/administrators`, { headers: { cookie: userCookie } }), 403);
  await expectStatus("user audit-log", await fetch(`${base}/api/admin/audit-log`, { headers: { cookie: userCookie } }), 403);
  await expectStatus("user search", await fetch(`${base}/api/admin/users/search?q=Perm`, { headers: { cookie: userCookie } }), 403);
  console.log("PASS: normal user receives 403 from all admin APIs");

  // Super Admin can access all admin APIs
  await expectStatus("super /api/admin/me", await fetch(`${base}/api/admin/me`, { headers: { cookie: superCookie } }), 200);
  await expectStatus("super overview", await fetch(`${base}/api/admin/overview`, { headers: { cookie: superCookie } }), 200);
  await expectStatus("super administrators", await fetch(`${base}/api/admin/administrators`, { headers: { cookie: superCookie } }), 200);
  await expectStatus("super audit-log", await fetch(`${base}/api/admin/audit-log`, { headers: { cookie: superCookie } }), 200);
  await expectStatus("super user search", await fetch(`${base}/api/admin/users/search?q=Promote`, { headers: { cookie: superCookie } }), 200);
  console.log("PASS: Super Admin can access all existing admin APIs");

  // manage_admins administrator can manage normal administrators
  await expectStatus("manage_admins list", await fetch(`${base}/api/admin/administrators`, { headers: { cookie: manageAdminsCookie } }), 200);
  const createRes = await fetch(`${base}/api/admin/administrators`, {
    method: "POST",
    headers: { "Content-Type": "application/json", cookie: manageAdminsCookie },
    body: JSON.stringify({ name: "Created By Manage Admins", email: `${tag}-created@example.invalid` }),
  });
  await expectStatus("manage_admins create", createRes, 201);
  const promoteRes = await fetch(`${base}/api/admin/administrators/promote`, {
    method: "POST",
    headers: { "Content-Type": "application/json", cookie: manageAdminsCookie },
    body: JSON.stringify({ userId: promoteTarget.id }),
  });
  await expectStatus("manage_admins promote", promoteRes, 200);
  const patchRes = await fetch(`${base}/api/admin/administrators/${patchTarget.id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", cookie: manageAdminsCookie },
    body: JSON.stringify({ permissions: ["view_audit_log"] }),
  });
  await expectStatus("manage_admins patch permissions", patchRes, 200);
  console.log("PASS: manage_admins administrator can manage normal administrators");

  // manage_admins cannot perform Super Admin-only actions
  const promoteSuperRes = await fetch(`${base}/api/admin/administrators/${patchTarget.id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", cookie: manageAdminsCookie },
    body: JSON.stringify({ adminTier: "super_admin" }),
  });
  await expectStatus("manage_admins cannot promote super", promoteSuperRes, 403);
  const patchSuperRes = await fetch(`${base}/api/admin/administrators/${superAdmin.id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", cookie: manageAdminsCookie },
    body: JSON.stringify({ permissions: [] }),
  });
  await expectStatus("manage_admins cannot patch super admin", patchSuperRes, 403);
  console.log("PASS: manage_admins administrator cannot perform Super Admin-only actions");

  // administrator without manage_admins receives 403
  await expectStatus("bare administrators list", await fetch(`${base}/api/admin/administrators`, { headers: { cookie: bareCookie } }), 403);
  await expectStatus("bare promote", await fetch(`${base}/api/admin/administrators/promote`, {
    method: "POST",
    headers: { "Content-Type": "application/json", cookie: bareCookie },
    body: JSON.stringify({ userId: trainingUser.id }),
  }), 403);
  await expectStatus("bare user search", await fetch(`${base}/api/admin/users/search?q=Perm`, { headers: { cookie: bareCookie } }), 403);
  console.log("PASS: administrator without manage_admins receives 403 from administrator APIs");

  // manage_users administrator can access user management
  const overviewRes = await fetch(`${base}/api/admin/overview`, { headers: { cookie: manageUsersCookie } });
  await expectStatus("manage_users overview", overviewRes, 200);
  const overviewBody = await overviewRes.json();
  if (!overviewBody.canViewUserData || !overviewBody.users || !overviewBody.stats) {
    throw new Error("manage_users overview missing user data");
  }
  await expectStatus("manage_users reset password", await fetch(`${base}/api/admin/users/${trainingUser.id}/reset-password`, {
    method: "POST",
    headers: { cookie: manageUsersCookie },
  }), 200);
  await expectStatus("manage_users delete", await fetch(`${base}/api/admin/users/${trainingUser.id}`, {
    method: "DELETE",
    headers: { cookie: manageUsersCookie },
  }), 200);
  console.log("PASS: manage_users administrator can access user management");

  // administrator without manage_users receives 403 from user APIs
  await expectStatus("bare delete user", await fetch(`${base}/api/admin/users/${promoteTarget.id}`, {
    method: "DELETE",
    headers: { cookie: bareCookie },
  }), 403);
  await expectStatus("bare reset password", await fetch(`${base}/api/admin/users/${promoteTarget.id}/reset-password`, {
    method: "POST",
    headers: { cookie: bareCookie },
  }), 403);
  const bareOverview = await fetch(`${base}/api/admin/overview`, { headers: { cookie: bareCookie } });
  await expectStatus("bare overview (no user leak)", bareOverview, 200);
  const bareOverviewBody = await bareOverview.json();
  if (bareOverviewBody.users || bareOverviewBody.stats) {
    throw new Error("overview leaked user data to admin without manage_users");
  }
  if (bareOverviewBody.canViewUserData !== false) {
    throw new Error("overview should set canViewUserData=false without manage_users");
  }
  console.log("PASS: administrator without manage_users receives 403 from user APIs and no overview leak");

  // administrator without view_audit_log receives 403 from audit APIs
  await expectStatus("manage_admins audit denied", await fetch(`${base}/api/admin/audit-log`, { headers: { cookie: manageAdminsCookie } }), 403);
  await expectStatus("manage_admins audit export denied", await fetch(`${base}/api/admin/audit-log/export`, { headers: { cookie: manageAdminsCookie } }), 403);
  await expectStatus("audit admin audit allowed", await fetch(`${base}/api/admin/audit-log`, { headers: { cookie: auditCookie } }), 200);
  console.log("PASS: administrator without view_audit_log receives 403 from audit APIs");

  // searchable promotion endpoint enforces manage_admins
  await expectStatus("manage_users search denied", await fetch(`${base}/api/admin/users/search?q=Promote`, { headers: { cookie: manageUsersCookie } }), 403);
  const searchRes = await fetch(`${base}/api/admin/users/search?q=Promote`, { headers: { cookie: manageAdminsCookie } });
  await expectStatus("manage_admins search allowed", searchRes, 200);
  const searchBody = await searchRes.json();
  if (!Array.isArray(searchBody.users)) throw new Error("search response missing users array");
  const shortSearch = await fetch(`${base}/api/admin/users/search?q=a`, { headers: { cookie: manageAdminsCookie } });
  await expectStatus("short search", shortSearch, 200);
  const shortBody = await shortSearch.json();
  if (shortBody.users.length !== 0) throw new Error("search with <2 chars should return empty");
  console.log("PASS: searchable promotion endpoint enforces manage_admins");

  // UI tabs match permissions (via /api/admin/me access flags)
  const meManageAdmins = await (await fetch(`${base}/api/admin/me`, { headers: { cookie: manageAdminsCookie } })).json();
  if (!meManageAdmins.access?.canManageAdmins || meManageAdmins.access?.canManageUsers || meManageAdmins.access?.canViewAuditLog) {
    throw new Error("manage_admins me access flags incorrect");
  }
  const meManageUsers = await (await fetch(`${base}/api/admin/me`, { headers: { cookie: manageUsersCookie } })).json();
  if (!meManageUsers.access?.canManageUsers || meManageUsers.access?.canManageAdmins) {
    throw new Error("manage_users me access flags incorrect");
  }
  const meSuper = await (await fetch(`${base}/api/admin/me`, { headers: { cookie: superCookie } })).json();
  if (
    !meSuper.access?.isSuperAdmin ||
    !meSuper.access?.canManageUsers ||
    !meSuper.access?.canManageAdmins ||
    !meSuper.access?.canViewAuditLog ||
    !meSuper.access?.canManageDrills
  ) {
    throw new Error("super admin me access flags incorrect");
  }
  console.log("PASS: UI tab access flags match permissions via /api/admin/me");

  // null adminTier does not grant Super Admin access (fail closed)
  const nullTierEmail = `${tag}-null-tier@example.invalid`;
  await db.user.create({
    data: {
      name: "Null Tier Admin",
      email: nullTierEmail,
      passwordHash,
      role: "admin",
      adminTier: null,
      adminPermissions: [],
      isActive: true,
      mustChangePassword: false,
      trainingActive: false,
      frequency: "monthly",
    },
  });
  const nullTierCookie = await adminLogin(nullTierEmail);
  const nullMe = await (await fetch(`${base}/api/admin/me`, { headers: { cookie: nullTierCookie } })).json();
  if (nullMe.access?.isSuperAdmin) throw new Error("null adminTier incorrectly grants Super Admin");
  await expectStatus("null tier audit denied", await fetch(`${base}/api/admin/audit-log`, { headers: { cookie: nullTierCookie } }), 403);
  console.log("PASS: adminTier=null does not grant Super Admin access (fail closed)");

  // at least one explicit active Super Admin remains after migration check
  const activeSuperCount = await db.user.count({
    where: { role: "admin", isActive: true, adminTier: "super_admin" },
  });
  if (activeSuperCount < 1) throw new Error("No active explicit Super Admin in database");
  console.log(`PASS: at least one explicit active Super Admin exists (${activeSuperCount})`);

  // cleanup
  const emails = [
    superEmail,
    manageAdminsEmail,
    manageUsersEmail,
    auditEmail,
    bareEmail,
    userEmail,
    promoteTargetEmail,
    patchTargetEmail,
    nullTierEmail,
    `${tag}-created@example.invalid`,
  ];
  await db.adminAuditLog.deleteMany({
    where: {
      OR: [
        { actorUserId: { in: [superAdmin.id, manageAdminsAdmin.id, manageUsersAdmin.id, auditAdmin.id, bareAdmin.id] } },
        { targetLabel: { in: emails } },
      ],
    },
  });
  await db.user.deleteMany({ where: { email: { in: emails } } });

  console.log("\nAll permission smoke tests passed.");
}

main()
  .catch((error) => {
    console.error("FAIL:", error.message);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
    await pool.end();
  });
