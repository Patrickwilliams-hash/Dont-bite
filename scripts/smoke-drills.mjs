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
const tag = `drill-${Date.now()}`;

function cookieFrom(res) {
  return res.headers.get("set-cookie")?.split(";")[0] ?? "";
}

async function expectStatus(label, res, status) {
  if (res.status !== status) {
    const body = await res.text();
    throw new Error(`${label}: expected ${status}, got ${res.status}: ${body}`);
  }
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

async function main() {
  const passwordHash = await hash("testpass123", 12);
  const superEmail = `${tag}-super@example.invalid`;
  const drillsEmail = `${tag}-drills@example.invalid`;
  const usersEmail = `${tag}-users@example.invalid`;
  const traineeEmail = `${tag}-trainee@example.invalid`;

  const superAdmin = await db.user.create({
    data: {
      name: "Drill Super",
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

  const drillsAdmin = await db.user.create({
    data: {
      name: "Drill Manager",
      email: drillsEmail,
      passwordHash,
      role: "admin",
      adminTier: "administrator",
      adminPermissions: ["manage_drills"],
      isActive: true,
      mustChangePassword: false,
      trainingActive: false,
      frequency: "monthly",
    },
  });

  const usersAdmin = await db.user.create({
    data: {
      name: "Users Only",
      email: usersEmail,
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

  const trainee = await db.user.create({
    data: {
      name: "Drill Trainee",
      email: traineeEmail,
      passwordHash,
      role: "user",
      isActive: true,
      mustChangePassword: false,
      trainingActive: true,
      frequency: "weekly",
    },
  });

  try {
    const drillsCookie = await adminLogin(drillsEmail);
    const usersCookie = await adminLogin(usersEmail);
    const traineeCookie = await userLogin(traineeEmail);

    await expectStatus(
      "users admin templates denied",
      await fetch(`${base}/api/admin/drills/templates`, { headers: { cookie: usersCookie } }),
      403
    );
    await expectStatus(
      "drills admin templates allowed",
      await fetch(`${base}/api/admin/drills/templates`, { headers: { cookie: drillsCookie } }),
      200
    );

    const sendRes = await fetch(`${base}/api/admin/drills/send`, {
      method: "POST",
      headers: { "Content-Type": "application/json", cookie: drillsCookie },
      body: JSON.stringify({
        userId: trainee.id,
        templateId: "bank-verify",
        isTest: true,
      }),
    });
    await expectStatus("send test drill", sendRes, 200);
    const sendBody = await sendRes.json();
    if (!sendBody.send?.trackPath) throw new Error("send response missing trackPath");

    const trackRes = await fetch(`${base}${sendBody.send.trackPath}`, { redirect: "manual" });
    if (![302, 307, 308].includes(trackRes.status)) {
      throw new Error(`track redirect expected, got ${trackRes.status}`);
    }
    const location = trackRes.headers.get("location") ?? "";
    if (!location.includes(`/caught/bank-verify?send=${sendBody.send.id}`)) {
      throw new Error(`unexpected track redirect: ${location}`);
    }

    const historyRes = await fetch(`${base}/api/drills/history`, {
      headers: { cookie: traineeCookie },
    });
    await expectStatus("trainee history", historyRes, 200);
    const historyBody = await historyRes.json();
    const caught = historyBody.drills?.find((item) => item.id === sendBody.send.id);
    if (!caught || caught.status !== "caught") {
      throw new Error("tracked click did not mark drill as caught");
    }

    const testRes = await fetch(`${base}/api/drills/test`, {
      method: "POST",
      headers: { cookie: traineeCookie },
    });
    await expectStatus("user self test drill", testRes, 200);
    const testBody = await testRes.json();
    if (!testBody.drill?.id) throw new Error("self test missing drill");

    const spotRes = await fetch(`${base}/api/drills/spot`, {
      method: "POST",
      headers: { "Content-Type": "application/json", cookie: traineeCookie },
      body: JSON.stringify({ sendId: testBody.drill.id }),
    });
    await expectStatus("spot drill", spotRes, 200);
    const spotBody = await spotRes.json();
    if (spotBody.drill?.status !== "spotted") throw new Error("spot did not update status");

    const statsRes = await fetch(`${base}/api/drills/stats`, {
      headers: { cookie: traineeCookie },
    });
    await expectStatus("user stats", statsRes, 200);
    const statsBody = await statsRes.json();
    if ((statsBody.stats?.caught ?? 0) < 1 || (statsBody.stats?.spotted ?? 0) < 1) {
      throw new Error("user stats did not include caught/spotted outcomes");
    }

    const platformStats = await (
      await fetch(`${base}/api/admin/drills/stats`, { headers: { cookie: drillsCookie } })
    ).json();
    if (platformStats.stats?.drillsSent !== 0) {
      throw new Error("platform stats should exclude test drills");
    }

    console.log("PASS: drill send, track, spot, history, and stats flow");
  } finally {
    await db.drillSend.deleteMany({
      where: { userId: { in: [trainee.id] } },
    });
    await db.adminAuditLog.deleteMany({
      where: {
        OR: [
          { actorUserId: { in: [superAdmin.id, drillsAdmin.id, usersAdmin.id] } },
          { targetId: { in: [trainee.id] } },
        ],
      },
    });
    await db.session.deleteMany({
      where: { userId: { in: [superAdmin.id, drillsAdmin.id, usersAdmin.id, trainee.id] } },
    });
    await db.user.deleteMany({
      where: { id: { in: [superAdmin.id, drillsAdmin.id, usersAdmin.id, trainee.id] } },
    });
    await db.$disconnect();
    await pool.end();
  }
}

main().catch(async (error) => {
  console.error(error);
  try {
    await db.$disconnect();
    await pool.end();
  } catch {
    // ignore cleanup errors
  }
  process.exit(1);
});
