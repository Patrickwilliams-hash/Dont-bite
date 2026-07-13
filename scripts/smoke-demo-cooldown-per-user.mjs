import { config } from "dotenv";
import { createRequire } from "node:module";
import { spawn } from "node:child_process";
import crypto from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";

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
const tag = `demo-cd-${Date.now()}`;
const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const resetScript = path.join(scriptDir, "reset-demo-cooldown.mjs");

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
  if (!res.ok) throw new Error(`login failed ${email}: ${res.status}`);
  return cookieFrom(res);
}

async function userLogout(cookie) {
  const res = await fetch(`${base}/api/auth/logout`, {
    method: "POST",
    headers: { cookie },
  });
  assert(res.ok, `logout failed: ${res.status}`);
}

async function getDemoStatus(cookie) {
  const res = await fetch(`${base}/api/account/drills/demo`, {
    headers: { cookie },
    cache: "no-store",
  });
  const body = await res.json();
  return { status: res.status, body, cacheControl: res.headers.get("cache-control") };
}

async function postDemo(cookie) {
  const res = await fetch(`${base}/api/account/drills/demo`, {
    method: "POST",
    headers: { cookie },
    cache: "no-store",
  });
  const body = await res.json();
  return { status: res.status, body };
}

async function createUser(suffix) {
  const passwordHash = await hash("testpass123", 12);
  return db.user.create({
    data: {
      name: `${tag} ${suffix}`,
      email: `${tag}-${suffix}@example.invalid`,
      passwordHash,
      role: "user",
      isActive: true,
      trainingActive: true,
      mustChangePassword: false,
      frequency: "weekly",
    },
  });
}

async function cleanupUsers(userIds) {
  for (const userId of userIds) {
    await db.drillEvent.deleteMany({ where: { delivery: { userId } } });
    await db.drillDelivery.deleteMany({ where: { userId } });
    await db.user.delete({ where: { id: userId } }).catch(() => {});
  }
}

function runResetScript(email, extraArgs = []) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [resetScript, email, ...extraArgs], {
      env: { ...process.env },
      stdio: ["ignore", "pipe", "pipe"],
    });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString();
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });
    child.on("close", (code) => {
      resolve({ code, stdout, stderr });
    });
    child.on("error", reject);
  });
}

async function main() {
  const userA = await createUser("a");
  const userB = await createUser("b");
  const userC = await createUser("c");
  const userD = await createUser("d");
  const userIds = [userA.id, userB.id, userC.id, userD.id];

  try {
    const healthOk = await fetch(`${base}/`, { signal: AbortSignal.timeout(3000) })
      .then((r) => r.ok)
      .catch(() => false);
    assert(healthOk, `server not reachable at ${base}`);

    const cookieA = await userLogin(userA.email);
    const cookieB = await userLogin(userB.email);
    const cookieC = await userLogin(userC.email);
    const cookieD = await userLogin(userD.email);

    // 1. Four users with no demo history all start available
    for (const [label, cookie] of [
      ["A", cookieA],
      ["B", cookieB],
      ["C", cookieC],
      ["D", cookieD],
    ]) {
      const status = await getDemoStatus(cookie);
      assert(status.body.canRequest === true, `User ${label} should start available`);
    }
    console.log("PASS: 1. four users with no history all available");

    // 2. User A sends successfully
    const postA = await postDemo(cookieA);
    assert(postA.status === 200 && postA.body.ok === true, "User A demo send failed");
    console.log("PASS: 2. User A sends demo successfully");

    // 3. Only User A enters cooldown
    const statusA = await getDemoStatus(cookieA);
    assert(
      statusA.body.code === "DEMO_COOLDOWN" || statusA.body.canRequest === false,
      "User A should be on cooldown"
    );
    assert(
      statusA.cacheControl?.includes("no-store"),
      "GET demo status must not be publicly cached"
    );
    console.log("PASS: 3. only User A on cooldown");

    // 4. User B remains available
    const statusBBefore = await getDemoStatus(cookieB);
    assert(statusBBefore.body.canRequest === true, "User B should not be on cooldown");
    console.log("PASS: 4. User B remains available");

    // 5. User B sends successfully
    const postB = await postDemo(cookieB);
    assert(postB.status === 200 && postB.body.ok === true, "User B demo send failed");
    console.log("PASS: 5. User B sends demo successfully");

    // 6. User B independently on cooldown
    const statusBAfter = await getDemoStatus(cookieB);
    assert(
      statusBAfter.body.code === "DEMO_COOLDOWN" || statusBAfter.body.canRequest === false,
      "User B should be on cooldown after own send"
    );
    console.log("PASS: 6. User B independently on cooldown");

    // 7–8. User C and D remain available
    const statusC = await getDemoStatus(cookieC);
    assert(statusC.body.canRequest === true, "User C should remain available");
    const statusD = await getDemoStatus(cookieD);
    assert(statusD.body.canRequest === true, "User D should remain available");
    console.log("PASS: 7–8. User C and D remain available");

    // 9. Concurrent requests for same user → at most one sent delivery
    const concurrentUser = await createUser("concurrent-a");
    userIds.push(concurrentUser.id);
    const concurrentCookie = await userLogin(concurrentUser.email);
    const [ca1, ca2] = await Promise.all([
      postDemo(concurrentCookie),
      postDemo(concurrentCookie),
    ]);
    const sentConcurrent = await db.drillDelivery.count({
      where: { userId: concurrentUser.id, purpose: "demo", status: "sent" },
    });
    assert(sentConcurrent <= 1, "concurrent same-user requests produced more than one sent delivery");
    assert(
      ca1.status === 429 ||
        ca2.status === 429 ||
        ca1.status === 409 ||
        ca2.status === 409 ||
        sentConcurrent === 1,
      "concurrent same-user constraint not enforced"
    );
    console.log("PASS: 9. concurrent same-user requests produce at most one sent delivery");

    // 10. Simultaneous requests from two different users both succeed
    const userE = await createUser("e");
    const userF = await createUser("f");
    userIds.push(userE.id, userF.id);
    const cookieE = await userLogin(userE.email);
    const cookieF = await userLogin(userF.email);
    const [de1, de2] = await Promise.all([postDemo(cookieE), postDemo(cookieF)]);
    assert(de1.status === 200 && de1.body.ok, "User E parallel send failed");
    assert(de2.status === 200 && de2.body.ok, "User F parallel send failed");
    console.log("PASS: 10. simultaneous different users both succeed");

    // 11. Failed send does not consume cooldown
    const template = await db.drillTemplate.findFirst({ where: { slug: "parcelpath-redelivery" } });
    assert(template, "ParcelPath template required");
    const failedDelivery = await db.drillDelivery.create({
      data: {
        userId: userC.id,
        templateId: template.id,
        trackingTokenHash: crypto.createHash("sha256").update(crypto.randomBytes(32)).digest("hex"),
        status: "failed",
        purpose: "demo",
        outcome: "pending",
        sendErrorCode: "smtp_rejected",
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });
    const statusCAfterFail = await getDemoStatus(cookieC);
    assert(statusCAfterFail.body.canRequest === true, "failed send should not trigger cooldown");
    await db.drillDelivery.delete({ where: { id: failedDelivery.id } });
    console.log("PASS: 11. failed send does not consume cooldown");

    // 12. GET status isolated by session user
    const crossCheckB = await getDemoStatus(cookieB);
    assert(crossCheckB.body.canRequest === false, "User B GET should reflect User B cooldown only");
    const crossCheckC = await getDemoStatus(cookieC);
    assert(crossCheckC.body.canRequest === true, "User C GET must not inherit User B cooldown");
    console.log("PASS: 12. GET status isolated by session user");

    // 13. Logout/login account switching returns correct cooldown
    await userLogout(cookieB);
    const cookieCAfterSwitch = await userLogin(userC.email);
    const switchStatusC = await getDemoStatus(cookieCAfterSwitch);
    assert(switchStatusC.body.canRequest === true, "after switch User C should be available");
    const cookieBAfterSwitch = await userLogin(userB.email);
    const switchStatusB = await getDemoStatus(cookieBAfterSwitch);
    assert(
      switchStatusB.body.canRequest === false,
      "after switch User B should still be on cooldown"
    );
    console.log("PASS: 13. logout/login account switching returns correct cooldown");

    // 14–17. Reset script behaviour
    const resetTarget = await createUser("reset-target");
    userIds.push(resetTarget.id);
    const resetCookie = await userLogin(resetTarget.email);
    const resetSend = await postDemo(resetCookie);
    assert(resetSend.status === 200 && resetSend.body.ok, "reset target demo send failed");
    const blockedBeforeReset = await getDemoStatus(resetCookie);
    assert(blockedBeforeReset.body.canRequest === false, "reset target should be on cooldown");

    const otherWithCooldown = await createUser("reset-other");
    userIds.push(otherWithCooldown.id);
    const otherCookie = await userLogin(otherWithCooldown.email);
    await postDemo(otherCookie);
    const otherBlocked = await getDemoStatus(otherCookie);
    assert(otherBlocked.body.canRequest === false, "other user should be on cooldown for isolation test");

    const trainingDelivery = await db.drillDelivery.create({
      data: {
        userId: resetTarget.id,
        templateId: template.id,
        trackingTokenHash: crypto.createHash("sha256").update(crypto.randomBytes(32)).digest("hex"),
        status: "sent",
        purpose: "training",
        outcome: "pending",
        sentAt: new Date(),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    const dryRun = await runResetScript(resetTarget.email);
    assert(dryRun.code === 0, `reset dry-run failed: ${dryRun.stderr}`);
    const stillBlocked = await getDemoStatus(resetCookie);
    assert(stillBlocked.body.canRequest === false, "dry run must not clear cooldown");
    const demoCountAfterDry = await db.drillDelivery.count({
      where: { userId: resetTarget.id, purpose: "demo", status: "sent" },
    });
    assert(demoCountAfterDry >= 1, "dry run must not delete demo deliveries");
    console.log("PASS: 14. reset script dry-run changes nothing");

    const confirmed = await runResetScript(resetTarget.email, ["--confirm"]);
    assert(confirmed.code === 0, `reset confirm failed: ${confirmed.stderr}`);
    const availableAfterReset = await getDemoStatus(resetCookie);
    assert(availableAfterReset.body.canRequest === true, "confirmed reset should clear cooldown");
    const trainingStill = await db.drillDelivery.findUnique({ where: { id: trainingDelivery.id } });
    assert(trainingStill?.purpose === "training", "reset must not remove training deliveries");
    const otherStillBlocked = await getDemoStatus(otherCookie);
    assert(otherStillBlocked.body.canRequest === false, "reset must not affect other users");
    console.log("PASS: 15–17. reset clears only selected user; training preserved");

    // 18. Cleanup leaves no throwaway deliveries/events/users
    const orphanUsers = await db.user.count({
      where: { email: { startsWith: tag } },
    });
    assert(orphanUsers === userIds.length, "expected throwaway users still present before final cleanup");

    await cleanupUsers(userIds);
    const remaining = await db.user.count({ where: { email: { startsWith: tag } } });
    assert(remaining === 0, `cleanup left ${remaining} throwaway user(s)`);
    const orphanDeliveries = await db.drillDelivery.count({
      where: { user: { email: { startsWith: tag } } },
    });
    assert(orphanDeliveries === 0, `cleanup left ${orphanDeliveries} throwaway delivery row(s)`);
    console.log("PASS: 18. automated test cleanup leaves no throwaway data");
    console.log("ALL PASS: smoke-demo-cooldown-per-user");
  } finally {
    await cleanupUsers(userIds).catch(() => {});
    await db.$disconnect();
    await pool.end();
  }
}

main().catch((error) => {
  console.error("FAIL:", error.message);
  process.exit(1);
});
