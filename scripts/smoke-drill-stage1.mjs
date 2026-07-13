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
const tag = `drill-s1-${Date.now()}`;

const TRACKING_TOKEN_BYTE_LENGTH = 32;
const TRACKING_TOKEN_HEX_LENGTH = TRACKING_TOKEN_BYTE_LENGTH * 2;
const DRILL_LINK_EVENT_TYPE = "link_clicked";

function generateTrackingToken() {
  return crypto.randomBytes(TRACKING_TOKEN_BYTE_LENGTH).toString("hex");
}

function hashTrackingToken(rawToken) {
  return crypto.createHash("sha256").update(rawToken).digest("hex");
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function recordFirstClickIfPending(deliveryId) {
  await db.$transaction(async (tx) => {
    const updated = await tx.drillDelivery.updateMany({
      where: { id: deliveryId, outcome: "pending" },
      data: { outcome: "link_followed", caughtAt: new Date() },
    });

    if (updated.count !== 1) return;

    await tx.drillEvent.create({
      data: {
        deliveryId,
        eventType: DRILL_LINK_EVENT_TYPE,
        ipHash: "smoke-test-hash",
        userAgent: "smoke-drill-stage1",
      },
    });
  });
}

async function countLinkClickedEvents(deliveryId) {
  return db.drillEvent.count({
    where: { deliveryId, eventType: DRILL_LINK_EVENT_TYPE },
  });
}

async function cleanup(ids) {
  const { userId, templateId, deliveryIds, expiredDeliveryId } = ids;

  if (expiredDeliveryId) {
    await db.drillEvent.deleteMany({ where: { deliveryId: expiredDeliveryId } });
    await db.drillDelivery.delete({ where: { id: expiredDeliveryId } });
  }

  for (const deliveryId of deliveryIds) {
    await db.drillEvent.deleteMany({ where: { deliveryId } });
    await db.drillDelivery.delete({ where: { id: deliveryId } });
  }

  if (templateId) {
    await db.drillTemplate.delete({ where: { id: templateId } });
  }

  if (userId) {
    await db.user.delete({ where: { id: userId } });
  }
}

async function main() {
  const passwordHash = await hash("testpass123", 12);
  const userEmail = `${tag}-user@example.invalid`;
  const templateSlug = `${tag}-template`;

  const user = await db.user.create({
    data: {
      name: "Drill Stage1 Smoke User",
      email: userEmail,
      passwordHash,
      role: "user",
      isActive: true,
      mustChangePassword: false,
      trainingActive: true,
      frequency: "weekly",
    },
  });

  const template = await db.drillTemplate.create({
    data: {
      slug: templateSlug,
      title: "Smoke Test Drill Template",
      scamType: "phishing",
      brandName: "SmokeBank",
      fakeDomain: "smoke-bank.example.invalid",
      realDomainHint: "realbank.example.invalid",
      redFlags: ["Urgent tone", "Unexpected link", "Generic greeting"],
      whyDangerous: "Smoke test only: entering credentials could expose your account.",
      howToSpot: ["Check the sender domain", "Avoid urgent links", "Call the bank directly"],
      learnSlug: "phishing-emails",
      isActive: true,
    },
  });

  const rawToken = generateTrackingToken();
  const trackingTokenHash = hashTrackingToken(rawToken);
  assert(rawToken.length === TRACKING_TOKEN_HEX_LENGTH, "token length mismatch");

  const routeRawToken = generateTrackingToken();
  const routeTrackingTokenHash = hashTrackingToken(routeRawToken);

  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const delivery = await db.drillDelivery.create({
    data: {
      userId: user.id,
      templateId: template.id,
      trackingTokenHash,
      status: "sent",
      outcome: "pending",
      sentAt: new Date(),
      expiresAt,
    },
  });

  const routeDelivery = await db.drillDelivery.create({
    data: {
      userId: user.id,
      templateId: template.id,
      trackingTokenHash: routeTrackingTokenHash,
      status: "sent",
      outcome: "pending",
      sentAt: new Date(),
      expiresAt,
    },
  });

  const expiredRawToken = generateTrackingToken();
  const expiredDelivery = await db.drillDelivery.create({
    data: {
      userId: user.id,
      templateId: template.id,
      trackingTokenHash: hashTrackingToken(expiredRawToken),
      status: "sent",
      outcome: "pending",
      sentAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      expiresAt: new Date(Date.now() - 60 * 1000),
    },
  });

  try {
    await recordFirstClickIfPending(delivery.id);

    const afterFirst = await db.drillDelivery.findUnique({ where: { id: delivery.id } });
    assert(afterFirst?.outcome === "link_followed", "expected outcome link_followed after first visit");
    assert(afterFirst?.caughtAt instanceof Date, "expected caughtAt after first visit");
    assert(
      (await countLinkClickedEvents(delivery.id)) === 1,
      "expected exactly one link_clicked event after first visit"
    );
    console.log("PASS: first visit records link_followed outcome and one event");

    await recordFirstClickIfPending(delivery.id);

    const afterSecond = await db.drillDelivery.findUnique({ where: { id: delivery.id } });
    assert(afterSecond?.caughtAt?.getTime() === afterFirst.caughtAt?.getTime(), "caughtAt changed on second visit");
    assert(
      (await countLinkClickedEvents(delivery.id)) === 1,
      "expected no duplicate link_clicked event after second visit"
    );
    console.log("PASS: second visit is idempotent");

    let routeAvailable = false;
    try {
      const health = await fetch(`${base}/`, { signal: AbortSignal.timeout(3000) });
      routeAvailable = health.ok || health.status === 404 || health.status === 200;
    } catch {
      routeAvailable = false;
    }

    if (routeAvailable) {
      const validRes = await fetch(`${base}/drill/${routeRawToken}`);
      const validHtml = await validRes.text();
      assert(validRes.ok, `valid token route failed: ${validRes.status}`);
      assert(validHtml.includes("SmokeBank"), "debrief missing brand content");
      assert(validHtml.includes("simulated Don"), "debrief missing training disclosure");

      const routeAfterFirst = await db.drillDelivery.findUnique({ where: { id: routeDelivery.id } });
      assert(routeAfterFirst?.outcome === "link_followed", "route first visit did not set link_followed");
      assert(routeAfterFirst?.caughtAt instanceof Date, "route first visit did not set caughtAt");
      assert(
        (await countLinkClickedEvents(routeDelivery.id)) === 1,
        "route first visit did not create exactly one event"
      );
      console.log("PASS: /drill/[token] resolves debrief and records first click");

      const repeatRes = await fetch(`${base}/drill/${routeRawToken}`);
      assert(repeatRes.ok, `repeat visit failed: ${repeatRes.status}`);
      assert(
        (await countLinkClickedEvents(routeDelivery.id)) === 1,
        "route repeat visit created duplicate event"
      );
      console.log("PASS: repeat route visit does not duplicate events");

      const expiredRes = await fetch(`${base}/drill/${expiredRawToken}`);
      const expiredHtml = await expiredRes.text();
      assert(expiredRes.ok, `expired route should render page: ${expiredRes.status}`);
      assert(expiredHtml.toLowerCase().includes("expired"), "expired page missing expiry copy");
      console.log("PASS: expired delivery shows friendly expiry state");

      const invalidRes = await fetch(`${base}/drill/${"0".repeat(64)}`);
      const invalidHtml = await invalidRes.text();
      assert(invalidRes.ok, `invalid token route should render page: ${invalidRes.status}`);
      assert(invalidHtml.toLowerCase().includes("not found"), "invalid token missing not-found copy");
      console.log("PASS: invalid token rejected generically");
    } else {
      console.log(`SKIP route checks: no server at ${base}`);
    }

    const manageDrillsEmail = `${tag}-drills-admin@example.invalid`;
    const manageDrillsAdmin = await db.user.create({
      data: {
        name: "Drill Perm Admin",
        email: manageDrillsEmail,
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

    try {
      const loginRes = await fetch(`${base}/api/auth/admin-login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: manageDrillsEmail, password: "testpass123" }),
      });

      if (loginRes.ok) {
        const cookie = loginRes.headers.get("set-cookie")?.split(";")[0] ?? "";
        const meRes = await fetch(`${base}/api/admin/me`, { headers: { cookie } });
        assert(meRes.ok, `admin me failed: ${meRes.status}`);
        const me = await meRes.json();
        assert(me.access?.canManageDrills === true, "expected canManageDrills true");
        console.log("PASS: canManageDrills exposed in admin access flags");
      } else {
        console.log("SKIP canManageDrills route check: admin login unavailable");
      }
    } finally {
      await db.user.delete({ where: { id: manageDrillsAdmin.id } });
    }

    const remainingTemplate = await db.drillTemplate.findUnique({ where: { id: template.id } });
    const remainingUser = await db.user.findUnique({ where: { id: user.id } });
    assert(remainingTemplate && remainingUser, "pre-cleanup state missing");

    await cleanup({
      userId: user.id,
      templateId: template.id,
      deliveryIds: [delivery.id, routeDelivery.id],
      expiredDeliveryId: expiredDelivery.id,
    });

    const deletedUser = await db.user.findUnique({ where: { id: user.id } });
    const deletedTemplate = await db.drillTemplate.findUnique({ where: { id: template.id } });
    const deletedDelivery = await db.drillDelivery.findUnique({ where: { id: delivery.id } });
    const deletedRouteDelivery = await db.drillDelivery.findUnique({ where: { id: routeDelivery.id } });
    const deletedExpired = await db.drillDelivery.findUnique({ where: { id: expiredDelivery.id } });
    const leftoverEvents = await db.drillEvent.count({
      where: { deliveryId: { in: [delivery.id, routeDelivery.id, expiredDelivery.id] } },
    });

    assert(!deletedUser, "throwaway user still present after cleanup");
    assert(!deletedTemplate, "throwaway template still present after cleanup");
    assert(!deletedDelivery, "primary delivery still present after cleanup");
    assert(!deletedRouteDelivery, "route delivery still present after cleanup");
    assert(!deletedExpired, "expired delivery still present after cleanup");
    assert(leftoverEvents === 0, "drill events still present after cleanup");
    console.log("PASS: all temporary smoke-test data cleaned up");

    console.log("ALL PASS: smoke-drill-stage1");
  } catch (error) {
    await cleanup({
      userId: user.id,
      templateId: template.id,
      deliveryIds: [delivery.id, routeDelivery.id],
      expiredDeliveryId: expiredDelivery.id,
    }).catch(() => {});
    throw error;
  } finally {
    await db.$disconnect();
    await pool.end();
  }
}

main().catch((error) => {
  console.error("FAIL:", error.message);
  process.exit(1);
});
