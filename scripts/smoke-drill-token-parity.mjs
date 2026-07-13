import { config } from "dotenv";
import { createRequire } from "node:module";
import crypto from "node:crypto";
import { readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

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
const tag = `drill-parity-${Date.now()}`;
const CAPTURE_DIR = path.join(os.tmpdir(), "dontbite-drill-send-capture");
const DRILL_LINK_EVENT_TYPE = "link_clicked";
const PARCELPATH_SLUG = "parcelpath-redelivery";

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function hashTrackingToken(rawToken) {
  return crypto.createHash("sha256").update(rawToken).digest("hex");
}

function extractRawTrackingTokenFromUrl(trackingUrl) {
  const match = trackingUrl.match(/\/drill\/([0-9a-f]{64})(?:[/?#]|$)/);
  return match?.[1] ?? null;
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
  if (!res.ok) throw new Error(`Admin login failed: ${res.status}`);
  return cookieFrom(res);
}

async function readCapture(deliveryId) {
  const filePath = path.join(CAPTURE_DIR, `${deliveryId}.json`);
  const contents = await readFile(filePath, "utf8");
  return JSON.parse(contents);
}

async function deleteCapture(deliveryId) {
  await rm(path.join(CAPTURE_DIR, `${deliveryId}.json`), { force: true });
}

async function cleanup(ids) {
  const { userId, adminId, deliveryId } = ids;
  if (deliveryId) {
    await db.drillEvent.deleteMany({ where: { deliveryId } });
    await db.drillDelivery.delete({ where: { id: deliveryId } }).catch(() => {});
    await deleteCapture(deliveryId).catch(() => {});
  }
  if (adminId) {
    await db.adminAuditLog.deleteMany({ where: { actorUserId: adminId } }).catch(() => {});
    await db.user.delete({ where: { id: adminId } }).catch(() => {});
  }
  if (userId) {
    await db.user.delete({ where: { id: userId } }).catch(() => {});
  }
}

async function main() {
  if (process.env.DRILL_SEND_TEST_CAPTURE !== "1") {
    throw new Error(
      "DRILL_SEND_TEST_CAPTURE=1 must be set on the running server before running this test."
    );
  }

  const passwordHash = await hash("testpass123", 12);
  const adminEmail = `${tag}-admin@example.invalid`;
  const userEmail = `${tag}-user@example.invalid`;

  const template = await db.drillTemplate.findFirst({
    where: { slug: PARCELPATH_SLUG, isActive: true },
    select: { id: true },
  });
  assert(template, "ParcelPath template missing. Run scripts/seed-parcelpath-template.mjs first.");

  const admin = await db.user.create({
    data: {
      name: "Parity Admin",
      email: adminEmail,
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

  const user = await db.user.create({
    data: {
      name: "Parity User",
      email: userEmail,
      passwordHash,
      role: "user",
      isActive: true,
      mustChangePassword: false,
      trainingActive: true,
      frequency: "weekly",
    },
  });

  let deliveryId = null;

  try {
    const cookie = await adminLogin(adminEmail);
    const sendRes = await fetch(`${base}/api/admin/drills/send`, {
      method: "POST",
      headers: { "Content-Type": "application/json", cookie },
      body: JSON.stringify({ templateId: template.id, userId: user.id }),
    });
    const sendPayload = await sendRes.json();
    assert(sendRes.ok && sendPayload.ok, `send failed: ${sendRes.status}`);
    deliveryId = sendPayload.deliveryId;

    const capture = await readCapture(deliveryId);
    const delivery = await db.drillDelivery.findUnique({ where: { id: deliveryId } });

    assert(capture.trackingTokenHash === delivery.trackingTokenHash, "capture hash mismatch with DB");
    assert(
      hashTrackingToken(capture.rawTrackingToken) === delivery.trackingTokenHash,
      "SHA-256(raw token) does not equal stored trackingTokenHash"
    );
    assert(
      capture.trackingUrl.includes(`/drill/${capture.rawTrackingToken}`),
      "rendered tracking URL does not contain the generated raw token"
    );
    assert(
      capture.emailHtml.includes(capture.trackingUrl),
      "rendered email HTML does not contain the tracking URL"
    );
  assert(
      capture.emailText.includes(capture.trackingUrl),
      "rendered email text does not contain the tracking URL"
    );
    assert(
      extractRawTrackingTokenFromUrl(capture.trackingUrl) === capture.rawTrackingToken,
      "tracking URL token extraction mismatch"
    );
    console.log("PASS: one raw token used for hash storage and email URL");

    const firstClick = await fetch(`${base}/drill/${capture.rawTrackingToken}`);
    assert(firstClick.ok, `first click failed: ${firstClick.status}`);
    const afterFirst = await db.drillDelivery.findUnique({ where: { id: deliveryId } });
    assert(afterFirst?.outcome === "caught", "first click did not set caught");
    assert(afterFirst?.caughtAt instanceof Date, "caughtAt missing after first click");
    assert(
      (await db.drillEvent.count({
        where: { deliveryId, eventType: DRILL_LINK_EVENT_TYPE },
      })) === 1,
      "expected exactly one link_clicked event"
    );
    console.log("PASS: click resolves delivery and records caught");

    const secondClick = await fetch(`${base}/drill/${capture.rawTrackingToken}`);
    assert(secondClick.ok, `repeat click failed: ${secondClick.status}`);
    assert(
      (await db.drillEvent.count({
        where: { deliveryId, eventType: DRILL_LINK_EVENT_TYPE },
      })) === 1,
      "repeat click created duplicate event"
    );
    console.log("PASS: repeat click is idempotent");

    console.log("ALL PASS: smoke-drill-token-parity");
  } finally {
    await cleanup({ userId: user.id, adminId: admin.id, deliveryId });
    await db.$disconnect();
    await pool.end();
  }
}

main().catch((error) => {
  console.error("FAIL:", error.message);
  process.exit(1);
});
