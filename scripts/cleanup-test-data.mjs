import { config } from "dotenv";
import { createRequire } from "node:module";

config({ path: ".env.local" });
config();

const require = createRequire(import.meta.url);
const { Pool } = require("pg");
const { PrismaPg } = require("@prisma/adapter-pg");
const { PrismaClient } = require("@prisma/client");

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const db = new PrismaClient({ adapter: new PrismaPg(pool) });

const THROWAWAY_EMAIL_FILTER = {
  OR: [
    { email: { endsWith: "@example.invalid" } },
    { email: { contains: "perm-" } },
    { email: { contains: "audit-" } },
    { email: { contains: "demotion-" } },
    { email: { contains: "smoke-" } },
  ],
};

async function main() {
  const throwawayUsers = await db.user.findMany({
    where: THROWAWAY_EMAIL_FILTER,
    select: { id: true, email: true },
  });

  if (throwawayUsers.length === 0) {
    console.log("No throwaway accounts found.");
    return;
  }

  const throwawayIds = throwawayUsers.map((u) => u.id);
  console.log(`Removing ${throwawayUsers.length} throwaway account(s)...`);

  const sessions = await db.session.deleteMany({
    where: { userId: { in: throwawayIds } },
  });
  console.log(`  Deleted ${sessions.count} session(s).`);

  const auditLogs = await db.adminAuditLog.deleteMany({
    where: {
      OR: [
        { actorUserId: { in: throwawayIds } },
        { targetId: { in: throwawayIds } },
        { targetLabel: { endsWith: "@example.invalid" } },
      ],
    },
  });
  console.log(`  Deleted ${auditLogs.count} test audit log entry(ies).`);

  const users = await db.user.deleteMany({
    where: { id: { in: throwawayIds } },
  });
  console.log(`  Deleted ${users.count} user(s).`);

  const genuineSupers = await db.user.count({
    where: { role: "admin", isActive: true, adminTier: "super_admin", NOT: THROWAWAY_EMAIL_FILTER },
  });
  const nullTier = await db.user.count({
    where: { role: "admin", adminTier: null },
  });

  if (genuineSupers < 1) {
    throw new Error("Cleanup aborted: no genuine active Super Admin would remain.");
  }

  console.log(`Genuine active Super Admins remaining: ${genuineSupers}`);
  console.log(`Administrators with null adminTier: ${nullTier}`);
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
