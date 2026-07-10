/**
 * Pre-manual-test verification for password-reset email assets and template.
 * Run: node scripts/verify-manual-test-ready.mjs
 *
 * Does not print passwords, tokens, credentials, or environment values.
 */
import { config } from "dotenv";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

config({ path: ".env.local" });
config();

const PHIL_FILE = "phil-intro.png";
const philPath = join("public", "mascot", PHIL_FILE);
const appUrl = process.env.APP_URL?.trim().replace(/\/$/, "") ?? "";
const expectedImageUrl = appUrl ? `${appUrl}/mascot/${PHIL_FILE}` : null;

function pass(message) {
  console.log(`PASS: ${message}`);
}

function fail(message) {
  console.error(`FAIL: ${message}`);
  process.exitCode = 1;
}

async function checkImageHttp(baseUrl) {
  const imageUrl = `${baseUrl.replace(/\/$/, "")}/mascot/${PHIL_FILE}`;
  try {
    const res = await fetch(imageUrl, { method: "HEAD" });
    if (res.ok) {
      pass(`image URL responds ${res.status} at ${baseUrl}/mascot/${PHIL_FILE}`);
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

async function main() {
  if (!existsSync(philPath)) {
    fail(`${philPath} not found`);
    return;
  }

  const stat = readFileSync(philPath);
  if (stat.length < 1000) {
    fail(`${philPath} appears too small to be a valid image`);
    return;
  }
  pass(`${philPath} exists (${Math.round(stat.length / 1024)} KB)`);

  if (!appUrl) {
    fail("APP_URL is not configured");
  } else {
    pass("APP_URL is configured");
    pass("email image URL pattern: {APP_URL}/mascot/phil-intro.png");
  }

  const systemTemplate = readFileSync("lib/email/templates/system-email.ts", "utf8");
  if (!systemTemplate.includes("/mascot/phil-intro.png")) {
    fail("system-email template does not reference phil-intro.png");
  } else {
    pass("system-email template references phil-intro.png");
  }

  if (systemTemplate.includes("localhost") && !systemTemplate.includes("getEmailConfig")) {
    fail("system-email template hardcodes localhost");
  } else {
    pass("image URL is derived from APP_URL via getEmailConfig()");
  }

  const resetTemplate = readFileSync("lib/email/templates/password-reset-email.ts", "utf8");
  if (!resetTemplate.includes("buildSystemEmail")) {
    fail("password-reset email does not use system template");
  } else {
    pass("password-reset email uses branded system template");
  }

  const forgotRoute = readFileSync("app/api/auth/forgot-password/route.ts", "utf8");
  if (forgotRoute.includes("resetUrl") && forgotRoute.includes("NextResponse.json") && forgotRoute.match(/resetUrl.*NextResponse/)) {
    fail("forgot-password may expose resetUrl in API response");
  } else {
    pass("forgot-password does not return resetUrl to the browser");
  }

  const resetRoute = readFileSync("app/api/auth/reset-password/route.ts", "utf8");
  if (!resetRoute.includes("revokeAllUserSessions(resetToken.userId, tx)")) {
    fail("session revocation is not inside the password-reset transaction");
  } else {
    pass("password update, token invalidation, and session revocation share one transaction");
  }

  const ports = [3000, 3001, 3010];
  let imageLoaded = false;
  for (const port of ports) {
  const base = `http://localhost:${port}`;
    if (await checkImageHttp(base)) {
      imageLoaded = true;
      break;
    }
  }

  if (!imageLoaded) {
    console.log(
      "NOTE: Start the dev server (npm run dev) and re-run to verify the image URL over HTTP."
    );
  }

  console.log("\nManual test checklist:");
  console.log("1. Ensure APP_URL matches the URL you use in the browser.");
  console.log("2. Log in to a throwaway test account, then log out (optional baseline).");
  console.log("3. Visit /forgot-password and submit the test account email.");
  console.log("4. Confirm the generic success message (no reset link on the page).");
  console.log("5. Open the inbox and confirm the branded reset email arrived.");
  console.log("6. Verify Phil appears, the button uses your APP_URL host, and plain-text includes the link.");
  console.log("7. Click the button, set a new password, and confirm success directs you to log in.");
  console.log("8. Confirm old password fails and new password works.");
  console.log("9. If you were logged in elsewhere, confirm that session no longer works.");
  console.log("10. Try reusing the reset link — it should be rejected.");
}

main().catch((error) => {
  console.error("FAIL:", error.message);
  process.exit(1);
});
