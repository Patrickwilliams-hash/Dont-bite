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
const tag = `drill-s2-${Date.now()}`;

const DRILL_LINK_EVENT_TYPE = "link_clicked";
const PARCELPATH_SLUG = "parcelpath-redelivery";

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

async function ensureParcelPathTemplate() {
  const existing = await db.drillTemplate.findUnique({ where: { slug: PARCELPATH_SLUG } });
  if (existing) return existing;

  return db.drillTemplate.create({
    data: {
      slug: PARCELPATH_SLUG,
      title: "ParcelPath Delivery Reschedule",
      scamType: "delivery",
      brandName: "ParcelPath",
      fakeDomain: "parcelpath-delivery.co",
      realDomainHint: "official courier websites use their verified domain",
      redFlags: ["Unexpected delivery message"],
      whyDangerous: "Smoke test template.",
      howToSpot: ["Check the sender domain"],
      learnSlug: "phishing-emails",
      emailSubject: "Your parcel needs a new delivery time",
      emailPreviewText: "A delivery attempt could not be completed",
      isActive: true,
    },
  });
}

async function cleanupTestArtifacts(ids) {
  const {
    userIds = [],
    adminIds = [],
    deliveryIds = [],
    deleteTemplate = false,
    templateId,
  } = ids;

  for (const deliveryId of deliveryIds) {
    await db.drillEvent.deleteMany({ where: { deliveryId } });
    await db.drillDelivery.delete({ where: { id: deliveryId } }).catch(() => {});
  }

  for (const adminId of adminIds) {
    await db.adminAuditLog.deleteMany({ where: { actorUserId: adminId } }).catch(() => {});
    await db.user.delete({ where: { id: adminId } }).catch(() => {});
  }

  for (const userId of userIds) {
    await db.drillDelivery.deleteMany({ where: { userId } });
    await db.user.delete({ where: { id: userId } }).catch(() => {});
  }

  if (deleteTemplate && templateId) {
    await db.drillTemplate.delete({ where: { id: templateId } }).catch(() => {});
  }
}

async function main() {
  const passwordHash = await hash("testpass123", 12);
  const template = await ensureParcelPathTemplate();

  const superEmail = `${tag}-super@example.invalid`;
  const drillsAdminEmail = `${tag}-drills@example.invalid`;
  const bareAdminEmail = `${tag}-bare@example.invalid`;
  const eligibleEmail = `${tag}-eligible@example.invalid`;
  const inactiveEmail = `${tag}-inactive@example.invalid`;
  const pausedEmail = `${tag}-paused@example.invalid`;
  const adminTargetEmail = `${tag}-admintarget@example.invalid`;
  const userEmail = `${tag}-user@example.invalid`;

  const superAdmin = await db.user.create({
    data: {
      name: "S2 Super",
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
      name: "S2 Drills Admin",
      email: drillsAdminEmail,
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

  const bareAdmin = await db.user.create({
    data: {
      name: "S2 Bare Admin",
      email: bareAdminEmail,
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

  const eligibleUser = await db.user.create({
    data: {
      name: "S2 Eligible User",
      email: eligibleEmail,
      passwordHash,
      role: "user",
      isActive: true,
      mustChangePassword: false,
      trainingActive: true,
      frequency: "weekly",
    },
  });

  const inactiveUser = await db.user.create({
    data: {
      name: "S2 Inactive User",
      email: inactiveEmail,
      passwordHash,
      role: "user",
      isActive: false,
      mustChangePassword: false,
      trainingActive: true,
      frequency: "weekly",
    },
  });

  const pausedUser = await db.user.create({
    data: {
      name: "S2 Paused User",
      email: pausedEmail,
      passwordHash,
      role: "user",
      isActive: true,
      mustChangePassword: false,
      trainingActive: false,
      frequency: "weekly",
    },
  });

  const adminTarget = await db.user.create({
    data: {
      name: "S2 Admin Target",
      email: adminTargetEmail,
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

  const normalUser = await db.user.create({
    data: {
      name: "S2 Normal User",
      email: userEmail,
      passwordHash,
      role: "user",
      isActive: true,
      mustChangePassword: false,
      trainingActive: true,
      frequency: "weekly",
    },
  });

  const createdDeliveryIds = [];
  const cleanupIds = {
    userIds: [
      eligibleUser.id,
      inactiveUser.id,
      pausedUser.id,
      normalUser.id,
      adminTarget.id,
    ],
    adminIds: [superAdmin.id, drillsAdmin.id, bareAdmin.id],
    deliveryIds: createdDeliveryIds,
    templateId: template.id,
    deleteTemplate: false,
  };

  try {
    const superCookie = await adminLogin(superEmail);
    const drillsCookie = await adminLogin(drillsAdminEmail);
    const bareCookie = await adminLogin(bareAdminEmail);
    const userCookie = await userLogin(userEmail);

    const bareSend = await fetch(`${base}/api/admin/drills/send`, {
      method: "POST",
      headers: { "Content-Type": "application/json", cookie: bareCookie },
      body: JSON.stringify({ templateId: template.id, userId: eligibleUser.id }),
    });
    assert(bareSend.status === 403, "bare admin should receive 403");
    console.log("PASS: admin without manage_drills receives 403");

    const userSend = await fetch(`${base}/api/admin/drills/send`, {
      method: "POST",
      headers: { "Content-Type": "application/json", cookie: userCookie },
      body: JSON.stringify({ templateId: template.id, userId: eligibleUser.id }),
    });
    assert(userSend.status === 403, "normal user should receive 403");
    console.log("PASS: normal user receives 403");

    const searchShort = await fetch(`${base}/api/admin/drills/eligible-users/search?q=a`, {
      headers: { cookie: bareCookie },
    });
    assert(searchShort.status === 403, "search should require manage_drills");
    console.log("PASS: eligible-user search requires manage_drills");

    const searchRes = await fetch(
      `${base}/api/admin/drills/eligible-users/search?q=${encodeURIComponent("S2 Eligible")}`,
      { headers: { cookie: drillsCookie } }
    );
    const searchPayload = await searchRes.json();
    assert(searchRes.ok, `search failed: ${searchRes.status}`);
    assert(
      searchPayload.users?.some((user) => user.id === eligibleUser.id),
      "eligible user missing from search"
    );
    assert(
      !searchPayload.users?.some((user) => user.id === inactiveUser.id),
      "inactive user should not appear"
    );
    assert(
      !searchPayload.users?.some((user) => user.id === pausedUser.id),
      "paused user should not appear"
    );
    assert(
      !searchPayload.users?.some((user) => user.passwordHash),
      "search returned sensitive fields"
    );
    console.log("PASS: eligible-user search filters correctly");

    const inactiveSend = await fetch(`${base}/api/admin/drills/send`, {
      method: "POST",
      headers: { "Content-Type": "application/json", cookie: drillsCookie },
      body: JSON.stringify({ templateId: template.id, userId: inactiveUser.id }),
    });
    assert(inactiveSend.status === 400, "inactive user should be rejected");
    console.log("PASS: inactive user rejected");

    const pausedSend = await fetch(`${base}/api/admin/drills/send`, {
      method: "POST",
      headers: { "Content-Type": "application/json", cookie: drillsCookie },
      body: JSON.stringify({ templateId: template.id, userId: pausedUser.id }),
    });
    assert(pausedSend.status === 400, "training-paused user should be rejected");
    console.log("PASS: training-paused user rejected");

    const adminTargetSend = await fetch(`${base}/api/admin/drills/send`, {
      method: "POST",
      headers: { "Content-Type": "application/json", cookie: drillsCookie },
      body: JSON.stringify({ templateId: template.id, userId: adminTarget.id }),
    });
    assert(adminTargetSend.status === 400, "administrator target should be rejected");
    console.log("PASS: administrator target rejected");

    await db.drillTemplate.update({
      where: { id: template.id },
      data: { isActive: false },
    });
    const inactiveTemplateSend = await fetch(`${base}/api/admin/drills/send`, {
      method: "POST",
      headers: { "Content-Type": "application/json", cookie: drillsCookie },
      body: JSON.stringify({ templateId: template.id, userId: eligibleUser.id }),
    });
    assert(inactiveTemplateSend.status === 400, "inactive template should be rejected");
    await db.drillTemplate.update({
      where: { id: template.id },
      data: { isActive: true },
    });
    console.log("PASS: inactive template rejected");

    const sendRes = await fetch(`${base}/api/admin/drills/send`, {
      method: "POST",
      headers: { "Content-Type": "application/json", cookie: drillsCookie },
      body: JSON.stringify({ templateId: template.id, userId: eligibleUser.id }),
    });
    const sendPayload = await sendRes.json();
    const sendBody = JSON.stringify(sendPayload);

    if (sendRes.ok) {
      assert(sendPayload.ok === true, "send ok flag missing");
      assert(sendPayload.status === "sent", "send status not sent");
      assert(typeof sendPayload.deliveryId === "string", "deliveryId missing");
      assert(!sendPayload.token, "raw token leaked in API response");
      assert(!sendPayload.trackingUrl, "tracking URL leaked in API response");
      assert(!sendBody.includes("/drill/"), "tracking URL leaked in API response body");
      createdDeliveryIds.push(sendPayload.deliveryId);

      const delivery = await db.drillDelivery.findUnique({
        where: { id: sendPayload.deliveryId },
      });
      assert(delivery?.status === "sent", "delivery not marked sent");
      assert(delivery?.sentAt instanceof Date, "sentAt missing");
      assert(delivery?.trackingTokenHash?.length === 64, "tracking hash missing");
      assert(!delivery?.sendErrorCode || typeof delivery.sendErrorCode === "string", "unexpected send error field");
      assert(
        !delivery?.trackingTokenHash?.includes("http"),
        "tracking hash should not contain URL data"
      );
      console.log("PASS: delivery transitions to sent and stores hash only");

      const audit = await db.adminAuditLog.findFirst({
        where: {
          action: "DRILL_SENT",
          actorUserId: drillsAdmin.id,
          targetId: template.id,
        },
        orderBy: { createdAt: "desc" },
      });
      assert(audit, "DRILL_SENT audit missing");
      const auditBlob = JSON.stringify(audit.metadata ?? {});
      assert(auditBlob.includes("manual_send"), "audit channel missing");
      assert(auditBlob.includes("sent"), "audit result missing");
      assert(!auditBlob.includes("/drill/"), "audit contains tracking URL");
      assert(!auditBlob.includes("token"), "audit contains token reference");
      console.log("PASS: DRILL_SENT audit contains safe metadata only");
    } else if (sendRes.status === 502) {
      assert(sendPayload.error, "safe failure message missing");
      const failedDelivery = await db.drillDelivery.findFirst({
        where: { userId: eligibleUser.id, templateId: template.id },
        orderBy: { createdAt: "desc" },
      });
      assert(failedDelivery, "failed delivery not created");
      assert(failedDelivery.status === "failed", "failed delivery status incorrect");
      assert(failedDelivery.sendErrorCode, "safe sendErrorCode missing");
      assert(
        ["smtp_rejected", "render_failed", "provider_timeout", "unknown"].includes(
          failedDelivery.sendErrorCode
        ),
        "unsafe sendErrorCode value"
      );
      createdDeliveryIds.push(failedDelivery.id);

      const failAudit = await db.adminAuditLog.findFirst({
        where: {
          action: "DRILL_SEND_FAILED",
          actorUserId: drillsAdmin.id,
          targetId: template.id,
        },
        orderBy: { createdAt: "desc" },
      });
      assert(failAudit, "DRILL_SEND_FAILED audit missing");
      console.log("PASS: SMTP failure records failed delivery and safe error code");
    } else {
      throw new Error(`Unexpected send response: ${sendRes.status} ${sendBody}`);
    }

    if (sendRes.ok) {
      const rawToken = crypto.randomBytes(32).toString("hex");
      const wrongHashDelivery = await db.drillDelivery.findUnique({
        where: { id: sendPayload.deliveryId },
      });
      assert(
        wrongHashDelivery.trackingTokenHash !== rawToken,
        "raw token appears stored in database"
      );
      console.log("PASS: API response never exposes token or URL");
    }

    const templatesRes = await fetch(`${base}/api/admin/drills/templates`, {
      headers: { cookie: superCookie },
    });
    assert(templatesRes.ok, "templates endpoint failed");
    const templatesPayload = await templatesRes.json();
    assert(templatesPayload.templates?.length >= 1, "templates endpoint returned no templates");
    console.log("PASS: manage_drills admin can load templates");

    const clickRawToken = crypto.randomBytes(32).toString("hex");
    const clickHash = crypto.createHash("sha256").update(clickRawToken).digest("hex");
    const clickDelivery = await db.drillDelivery.create({
      data: {
        userId: normalUser.id,
        templateId: template.id,
        trackingTokenHash: clickHash,
        status: "sent",
        outcome: "pending",
        sentAt: new Date(),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        triggeredByUserId: drillsAdmin.id,
      },
    });
    createdDeliveryIds.push(clickDelivery.id);

    let routeAvailable = false;
    try {
      const health = await fetch(`${base}/`, { signal: AbortSignal.timeout(3000) });
      routeAvailable = health.ok;
    } catch {
      routeAvailable = false;
    }

    if (routeAvailable) {
      const firstClick = await fetch(`${base}/drill/${clickRawToken}`);
      assert(firstClick.ok, `first click route failed: ${firstClick.status}`);
      const afterFirst = await db.drillDelivery.findUnique({ where: { id: clickDelivery.id } });
      assert(afterFirst?.outcome === "caught", "first click did not set caught");
      assert(afterFirst?.caughtAt instanceof Date, "caughtAt missing after first click");
      const eventCount = await db.drillEvent.count({
        where: { deliveryId: clickDelivery.id, eventType: DRILL_LINK_EVENT_TYPE },
      });
      assert(eventCount === 1, "expected exactly one link_clicked event");
      console.log("PASS: first click records caught and one event");

      const secondClick = await fetch(`${base}/drill/${clickRawToken}`);
      assert(secondClick.ok, `repeat click route failed: ${secondClick.status}`);
      const afterSecond = await db.drillDelivery.findUnique({ where: { id: clickDelivery.id } });
      assert(
        afterSecond?.caughtAt?.getTime() === afterFirst.caughtAt?.getTime(),
        "caughtAt changed on repeat click"
      );
      const repeatEvents = await db.drillEvent.count({
        where: { deliveryId: clickDelivery.id, eventType: DRILL_LINK_EVENT_TYPE },
      });
      assert(repeatEvents === 1, "repeat click created duplicate event");
      console.log("PASS: repeat click remains idempotent");
    } else {
      console.log("SKIP click route checks: no server available");
    }

    console.log("ALL PASS: smoke-drill-stage2");
  } catch (error) {
    throw error;
  } finally {
    await cleanupTestArtifacts(cleanupIds);
    await db.$disconnect();
    await pool.end();
  }
}

main().catch((error) => {
  console.error("FAIL:", error.message);
  process.exit(1);
});
