/**
 * Local development tool: reset demo cooldown for exactly one user.
 *
 * Usage:
 *   node scripts/reset-demo-cooldown.mjs user@example.com
 *   node scripts/reset-demo-cooldown.mjs --email user@example.com
 *   RESET_DEMO_COOLDOWN_EMAIL=user@example.com node scripts/reset-demo-cooldown.mjs
 *
 * Dry run by default. Pass --confirm to delete scoped cooldown-window demo deliveries.
 */
import { config } from "dotenv";
import { createRequire } from "node:module";

config({ path: ".env.local" });
config();

const require = createRequire(import.meta.url);
const { Pool } = require("pg");
const { PrismaPg } = require("@prisma/adapter-pg");
const { PrismaClient } = require("@prisma/client");

const COOLDOWN_MS = 24 * 60 * 60 * 1000;

function parseArgs(argv) {
  const args = argv.slice(2);
  let email = process.env.RESET_DEMO_COOLDOWN_EMAIL?.trim() ?? "";
  let confirm = false;

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === "--confirm") {
      confirm = true;
    } else if (arg === "--email" && args[i + 1]) {
      email = args[++i].trim();
    } else if (!arg.startsWith("-") && !email) {
      email = arg.trim();
    } else if (arg === "--help" || arg === "-h") {
      printHelp();
      process.exit(0);
    } else {
      console.error(`Unknown argument: ${arg}`);
      printHelp();
      process.exit(1);
    }
  }

  return { email, confirm };
}

function printHelp() {
  console.log(`reset-demo-cooldown — clear demo cooldown for one user (local dev only)

Arguments:
  <email>              Target user email (exact match)
  --email <email>      Same as positional email
  RESET_DEMO_COOLDOWN_EMAIL  Environment variable alternative

Options:
  --confirm            Perform deletion (default is dry run)
  --help               Show this help
`);
}

function anonymiseEmail(email) {
  if (email.endsWith("@example.invalid")) {
    return `test:${email.split("@")[0].slice(0, 24)}@example.invalid`;
  }
  const [local, domain] = email.split("@");
  return `user:${local.slice(0, 2)}***@${domain}`;
}

async function main() {
  const { email, confirm } = parseArgs(process.argv);

  if (!email) {
    console.error("ERROR: Provide exactly one user email (argument or RESET_DEMO_COOLDOWN_EMAIL).");
    printHelp();
    process.exit(1);
  }

  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const db = new PrismaClient({ adapter: new PrismaPg(pool) });
  const since = new Date(Date.now() - COOLDOWN_MS);

  try {
    const matches = await db.user.findMany({
      where: { email: { equals: email, mode: "insensitive" } },
      select: { id: true, email: true, role: true },
    });

    if (matches.length === 0) {
      console.error(`ERROR: No user found for email ${anonymiseEmail(email)}.`);
      process.exit(1);
    }
    if (matches.length > 1) {
      console.error(
        `ERROR: Ambiguous email match (${matches.length} users). Refusing to proceed.`
      );
      process.exit(1);
    }

    const user = matches[0];
    const label = anonymiseEmail(user.email);

    const cooldownDeliveries = await db.drillDelivery.findMany({
      where: {
        userId: user.id,
        purpose: "demo",
        status: "sent",
        sentAt: { gte: since },
      },
      orderBy: { sentAt: "desc" },
      select: {
        id: true,
        sentAt: true,
        createdAt: true,
        _count: { select: { events: true } },
      },
    });

    const trainingInWindow = await db.drillDelivery.count({
      where: {
        userId: user.id,
        purpose: "training",
        status: "sent",
        sentAt: { gte: since },
      },
    });

    const otherUsersDemoInWindow = await db.drillDelivery.count({
      where: {
        userId: { not: user.id },
        purpose: "demo",
        status: "sent",
        sentAt: { gte: since },
      },
    });

    console.log("=== reset-demo-cooldown summary ===");
    console.log(`mode: ${confirm ? "CONFIRM (will delete)" : "DRY RUN (no changes)"}`);
    console.log(`user: ${label} [${user.id.slice(0, 8)}…] role=${user.role}`);
    console.log(`cooldown window: last 24 hours (since ${since.toISOString()})`);
    console.log(`demo deliveries to remove: ${cooldownDeliveries.length}`);
    for (const d of cooldownDeliveries) {
      const ageH = d.sentAt ? ((Date.now() - d.sentAt.getTime()) / 3600000).toFixed(1) : "?";
      console.log(
        `  - delivery ${d.id.slice(0, 8)}… sent ${ageH}h ago (${d._count.events} related events, cascade on delete)`
      );
    }
    console.log(`training deliveries in window (preserved): ${trainingInWindow}`);
    console.log(`other users' demo deliveries in window (untouched): ${otherUsersDemoInWindow}`);

    if (cooldownDeliveries.length === 0) {
      console.log("\nNothing to reset — user is not on demo cooldown.");
      return;
    }

    if (!confirm) {
      console.log("\nDry run complete. Re-run with --confirm to apply changes.");
      return;
    }

    const ids = cooldownDeliveries.map((d) => d.id);
    const deleted = await db.drillDelivery.deleteMany({
      where: {
        id: { in: ids },
        userId: user.id,
        purpose: "demo",
        status: "sent",
        sentAt: { gte: since },
      },
    });

    const remaining = await db.drillDelivery.count({
      where: {
        userId: user.id,
        purpose: "demo",
        status: "sent",
        sentAt: { gte: since },
      },
    });

    console.log(`\nDeleted ${deleted.count} demo delivery row(s).`);
    console.log(`Remaining cooldown-window sent demos for user: ${remaining}`);
    if (remaining === 0) {
      console.log("User demo cooldown cleared.");
    }
  } finally {
    await db.$disconnect();
    await pool.end();
  }
}

main().catch((error) => {
  console.error("FAIL:", error.message);
  process.exit(1);
});
