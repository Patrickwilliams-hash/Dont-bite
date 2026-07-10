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

async function main() {
  const nullTierAdmins = await db.user.findMany({
    where: { role: "admin", adminTier: null },
    select: { id: true, email: true, isActive: true },
  });

  if (nullTierAdmins.length > 0) {
    const result = await db.user.updateMany({
      where: { role: "admin", adminTier: null },
      data: { adminTier: "super_admin" },
    });
    console.log(`Migrated ${result.count} administrator(s) to explicit super_admin.`);
    for (const admin of nullTierAdmins) {
      console.log(`  - ${admin.email}${admin.isActive ? "" : " (inactive)"}`);
    }
  } else {
    console.log("No administrators with null adminTier found.");
  }

  const activeSuperAdmins = await db.user.count({
    where: { role: "admin", isActive: true, adminTier: "super_admin" },
  });

  if (activeSuperAdmins === 0) {
    throw new Error("Migration aborted: no active Super Admin would remain. Manual intervention required.");
  }

  console.log(`Active Super Admins after migration: ${activeSuperAdmins}`);
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
