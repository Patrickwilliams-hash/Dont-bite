/**
 * Trigger a real password-reset email for visual inspection.
 * Set SMOKE_TEST_EMAIL_TO to the test account email (not printed).
 * Run: node scripts/send-password-reset-test-email.mjs
 */
import { config } from "dotenv";

config({ path: ".env.local" });
config();

const base = process.env.SMOKE_BASE_URL ?? "http://localhost:3000";
const email =
  process.env.SMOKE_TEST_EMAIL_TO?.trim() ||
  process.env.PASSWORD_RESET_TEST_EMAIL?.trim() ||
  process.env.EMAIL_USER?.trim();

if (!email) {
  console.error(
    "FAIL: Set SMOKE_TEST_EMAIL_TO, PASSWORD_RESET_TEST_EMAIL, or EMAIL_USER for the test account."
  );
  process.exit(1);
}

const res = await fetch(`${base}/api/auth/forgot-password`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ email }),
});

const body = await res.json().catch(() => ({}));

if (!res.ok) {
  console.error(`FAIL: forgot-password returned ${res.status}`);
  process.exit(1);
}

if (body.message !== "If an account exists for that email address, we've sent password reset instructions.") {
  console.error("FAIL: unexpected API response");
  process.exit(1);
}

console.log("PASS: password-reset test email requested successfully");
console.log("Check your test inbox for the updated masthead branding.");
