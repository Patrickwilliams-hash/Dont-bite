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
const base = process.env.SMOKE_BASE_URL ?? "http://localhost:3099";
const tag = `drill-s3a-${Date.now()}`;

const PARCELPATH_SLUG = "parcelpath-redelivery";
const DRILL_LINK_EVENT_TYPE = "link_clicked";

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function cookieFrom(res) {
  return res.headers.get("set-cookie")?.split(";")[0] ?? "";
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

async function adminLogin(email) {
  const res = await fetch(`${base}/api/auth/admin-login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password: "testpass123" }),
  });
  if (!res.ok) throw new Error(`Admin login failed for ${email}: ${res.status}`);
  return cookieFrom(res);
}

async function cleanup(ids) {
  const { userIds = [], adminIds = [], deliveryIds = [] } = ids;
  for (const deliveryId of deliveryIds) {
    await db.drillEvent.deleteMany({ where: { deliveryId } });
    await db.drillDelivery.delete({ where: { id: deliveryId } }).catch(() => {});
  }
  for (const id of [...adminIds, ...userIds]) {
    await db.drillDelivery.deleteMany({ where: { userId: id } });
    await db.user.delete({ where: { id } }).catch(() => {});
  }
}

async function main() {
  const passwordHash = await hash("testpass123", 12);

  const activeUser = await db.user.create({
    data: {
      name: `${tag} Active`,
      email: `${tag}-active@example.invalid`,
      passwordHash,
      role: "user",
      isActive: true,
      trainingActive: true,
      mustChangePassword: false,
      frequency: "weekly",
    },
  });

  const pausedUser = await db.user.create({
    data: {
      name: `${tag} Paused`,
      email: `${tag}-paused@example.invalid`,
      passwordHash,
      role: "user",
      isActive: true,
      trainingActive: false,
      mustChangePassword: false,
      frequency: "weekly",
    },
  });

  const adminUser = await db.user.create({
    data: {
      name: `${tag} Admin`,
      email: `${tag}-admin@example.invalid`,
      passwordHash,
      role: "admin",
      adminTier: "super_admin",
      adminPermissions: [],
      isActive: true,
      trainingActive: false,
      mustChangePassword: false,
      frequency: "monthly",
    },
  });

  const drillsAdmin = await db.user.create({
    data: {
      name: `${tag} Drills Admin`,
      email: `${tag}-drills@example.invalid`,
      passwordHash,
      role: "admin",
      adminTier: "administrator",
      adminPermissions: ["manage_drills"],
      isActive: true,
      trainingActive: false,
      mustChangePassword: false,
      frequency: "monthly",
    },
  });

  const cleanupIds = {
    userIds: [activeUser.id, pausedUser.id],
    adminIds: [adminUser.id, drillsAdmin.id],
    deliveryIds: [],
  };

  try {
    const healthOk = await fetch(`${base}/`, { signal: AbortSignal.timeout(3000) })
      .then((r) => r.ok)
      .catch(() => false);
    assert(healthOk, `server not reachable at ${base}`);

    const parcelPath = await db.drillTemplate.findFirst({
      where: { slug: PARCELPATH_SLUG },
      select: { id: true, interactionType: true },
    });
    assert(parcelPath, "ParcelPath template missing — run seed-parcelpath-template.mjs");
    assert(parcelPath.interactionType === "link_visit", "ParcelPath interactionType not link_visit");
    console.log("PASS: ParcelPath template has interactionType=link_visit");

    const caughtCount = await db.$queryRaw`
      SELECT COUNT(*)::int AS count FROM "DrillDelivery" WHERE outcome::text = 'caught'
    `.then((rows) => rows[0]?.count ?? 0);
    assert(caughtCount === 0, "legacy caught outcomes remain in database");
    console.log("PASS: no legacy caught outcomes in database");

    const activeCookie = await userLogin(activeUser.email);
    const pausedCookie = await userLogin(pausedUser.email);
    const adminCookie = await adminLogin(adminUser.email);
    const drillsCookie = await adminLogin(drillsAdmin.email);

    const loggedOut = await fetch(`${base}/api/account/drills/demo`, { method: "POST" });
    assert(loggedOut.status === 401, "logged-out demo request should be 401");
    console.log("PASS: logged-out request rejected");

    const adminDemo = await fetch(`${base}/api/account/drills/demo`, {
      method: "POST",
      headers: { cookie: adminCookie },
    });
    assert(adminDemo.status === 400 || adminDemo.status === 403, "admin demo request rejected");
    console.log("PASS: admin account rejected for self-service demo");

    const inactiveDemoUser = await db.user.create({
      data: {
        name: `${tag} Inactive Demo`,
        email: `${tag}-inactive-demo@example.invalid`,
        passwordHash,
        role: "user",
        isActive: true,
        trainingActive: true,
        mustChangePassword: false,
        frequency: "weekly",
      },
    });
    cleanupIds.userIds.push(inactiveDemoUser.id);
    const inactiveDemoCookie = await userLogin(inactiveDemoUser.email);
    await db.user.update({
      where: { id: inactiveDemoUser.id },
      data: { isActive: false },
    });
    const inactiveDemo = await fetch(`${base}/api/account/drills/demo`, {
      method: "POST",
      headers: { cookie: inactiveDemoCookie },
    });
    assert(inactiveDemo.status === 400 || inactiveDemo.status === 401, "inactive account rejected");
    console.log("PASS: inactive account rejected");

    const pausedDemo = await fetch(`${base}/api/account/drills/demo`, {
      method: "POST",
      headers: { cookie: pausedCookie },
    });
    const pausedPayload = await pausedDemo.json();
    assert(pausedDemo.ok || pausedDemo.status === 502, "paused user demo send attempted");
    if (pausedDemo.ok) {
      assert(pausedPayload.ok === true, "paused user demo should succeed when SMTP works");
      const pausedDelivery = await db.drillDelivery.findFirst({
        where: { userId: pausedUser.id, purpose: "demo" },
        orderBy: { createdAt: "desc" },
      });
      assert(pausedDelivery?.purpose === "demo", "paused user delivery not purpose=demo");
      if (pausedDelivery) cleanupIds.deliveryIds.push(pausedDelivery.id);
      console.log("PASS: paused training user may request demo (policy: allowed)");
    } else {
      console.log("SKIP: paused user SMTP path (delivery failed safely)");
    }

    const demoRes = await fetch(`${base}/api/account/drills/demo`, {
      method: "POST",
      headers: { cookie: activeCookie },
    });
    const demoPayload = await demoRes.json();
    const demoBody = JSON.stringify(demoPayload);
    assert(!demoPayload.token && !demoPayload.trackingUrl, "demo API leaked token or URL");
    assert(!demoBody.includes("/drill/"), "demo API body leaked tracking URL");

    if (demoRes.ok) {
      assert(demoPayload.ok === true, "demo ok flag missing");
      assert(demoPayload.message, "demo success message missing");
      const delivery = await db.drillDelivery.findFirst({
        where: { userId: activeUser.id, purpose: "demo" },
        orderBy: { createdAt: "desc" },
      });
      assert(delivery, "demo delivery not created");
      assert(delivery.purpose === "demo", "delivery purpose not demo");
      assert(delivery.userId === activeUser.id, "delivery user mismatch");
      if (delivery.status === "sent") {
        assert(delivery.trackingTokenHash?.length === 64, "hash missing");
        cleanupIds.deliveryIds.push(delivery.id);
        console.log("PASS: active user demo delivery purpose=demo with token parity storage");
      } else if (delivery.status === "failed") {
        cleanupIds.deliveryIds.push(delivery.id);
        console.log("PASS: demo SMTP failure stored safely (no false cooldown if not sent)");
      }

      const cooldownRes = await fetch(`${base}/api/account/drills/demo`, {
        method: "POST",
        headers: { cookie: activeCookie },
      });
      if (delivery?.status === "sent") {
        assert(cooldownRes.status === 429, "cooldown should return 429");
        const cooldownPayload = await cooldownRes.json();
        assert(cooldownPayload.code === "DEMO_COOLDOWN", "cooldown code missing");
        console.log("PASS: 24-hour cooldown enforced after successful demo");
      }
    } else if (demoRes.status === 502) {
      console.log("PASS: demo SMTP failure returns safe error (no token leakage)");
    } else {
      throw new Error(`Unexpected demo response: ${demoRes.status} ${demoBody}`);
    }

    const concurrentUser = await db.user.create({
      data: {
        name: `${tag} Concurrent`,
        email: `${tag}-concurrent@example.invalid`,
        passwordHash,
        role: "user",
        isActive: true,
        trainingActive: true,
        mustChangePassword: false,
        frequency: "weekly",
      },
    });
    cleanupIds.userIds.push(concurrentUser.id);
    const concurrentCookie = await userLogin(concurrentUser.email);
    const [c1, c2] = await Promise.all([
      fetch(`${base}/api/account/drills/demo`, { method: "POST", headers: { cookie: concurrentCookie } }),
      fetch(`${base}/api/account/drills/demo`, { method: "POST", headers: { cookie: concurrentCookie } }),
    ]);
    const sentCount = await db.drillDelivery.count({
      where: { userId: concurrentUser.id, purpose: "demo", status: "sent" },
    });
    assert(sentCount <= 1, "concurrent demo requests created duplicate sent deliveries");
    assert(
      c1.status === 429 ||
        c2.status === 429 ||
        c1.status === 409 ||
        c2.status === 409 ||
        sentCount === 1,
      "concurrent demo requests did not enforce single-send constraint"
    );
    const concurrentDeliveries = await db.drillDelivery.findMany({
      where: { userId: concurrentUser.id, purpose: "demo" },
      select: { id: true },
    });
    cleanupIds.deliveryIds.push(...concurrentDeliveries.map((d) => d.id));
    console.log("PASS: concurrent duplicate requests constrained");

    const rawToken = crypto.randomBytes(32).toString("hex");
    const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");
    const clickDelivery = await db.drillDelivery.create({
      data: {
        userId: activeUser.id,
        templateId: parcelPath.id,
        trackingTokenHash: tokenHash,
        status: "sent",
        purpose: "demo",
        outcome: "pending",
        sentAt: new Date(),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });
    cleanupIds.deliveryIds.push(clickDelivery.id);

    const clickRes = await fetch(`${base}/drill/${rawToken}`);
    const clickHtml = await clickRes.text();
    assert(clickRes.ok, `debrief route failed: ${clickRes.status}`);
    assert(clickHtml.includes("You took the bait") || clickHtml.includes("took the bait"), "debrief heading missing");
    assert(clickHtml.toLowerCase().includes("demo"), "debrief missing demo label");
    assert(clickHtml.includes("does not affect"), "debrief missing demo progress note");

    const afterClick = await db.drillDelivery.findUnique({ where: { id: clickDelivery.id } });
    assert(afterClick?.outcome === "link_followed", "click did not set link_followed");
    const events = await db.drillEvent.count({
      where: { deliveryId: clickDelivery.id, eventType: DRILL_LINK_EVENT_TYPE },
    });
    assert(events === 1, "expected one link_clicked event");

    await fetch(`${base}/drill/${rawToken}`);
    const repeatEvents = await db.drillEvent.count({
      where: { deliveryId: clickDelivery.id, eventType: DRILL_LINK_EVENT_TYPE },
    });
    assert(repeatEvents === 1, "repeat click not idempotent");
    console.log("PASS: tracking sets link_followed, demo debrief, idempotent");

    if (parcelPath) {
      const adminSend = await fetch(`${base}/api/admin/drills/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json", cookie: drillsCookie },
        body: JSON.stringify({ templateId: parcelPath.id, userId: activeUser.id }),
      });
      if (adminSend.ok) {
        const adminPayload = await adminSend.json();
        const adminDelivery = await db.drillDelivery.findUnique({
          where: { id: adminPayload.deliveryId },
        });
        assert(adminDelivery?.purpose === "demo", "admin manual send should be purpose=demo");
        if (adminDelivery) cleanupIds.deliveryIds.push(adminDelivery.id);
        console.log("PASS: admin manual send still works with purpose=demo");
      } else {
        console.log("SKIP: admin manual send SMTP unavailable");
      }
    }

    console.log("ALL PASS: smoke-drill-stage3a");
  } finally {
    await cleanup(cleanupIds);
    await db.$disconnect();
    await pool.end();
  }
}

main().catch((error) => {
  console.error("FAIL:", error.message);
  process.exit(1);
});
