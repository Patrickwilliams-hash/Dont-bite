import { config } from "dotenv";
import { createRequire } from "node:module";

config({ path: ".env.local" });
config();

const require = createRequire(import.meta.url);
const { Pool } = require("pg");

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function withClient(fn) {
  const client = await pool.connect();
  try {
    return await fn(client);
  } finally {
    client.release();
  }
}

async function enumValueExists(client, enumName, value) {
  const result = await client.query(
    `SELECT 1 FROM pg_enum e
     JOIN pg_type t ON e.enumtypid = t.oid
     WHERE t.typname = $1 AND e.enumlabel = $2`,
    [enumName, value]
  );
  return result.rowCount > 0;
}

async function addEnumValueCommitted(enumName, value) {
  await withClient(async (client) => {
    if (await enumValueExists(client, enumName, value)) {
      console.log(`SKIP: ${enumName}.${value} already exists`);
      return;
    }
    await client.query(`ALTER TYPE "${enumName}" ADD VALUE '${value}'`);
    console.log(`ADD: ${enumName}.${value}`);
  });
}

async function recreateOutcomeEnumWithoutCaught() {
  const hasCaught = await withClient((client) => enumValueExists(client, "DrillOutcome", "caught"));
  if (!hasCaught) {
    console.log("SKIP: DrillOutcome already migrated (no caught value)");
    return;
  }

  if (!(await withClient((client) => enumValueExists(client, "DrillOutcome", "link_followed")))) {
    await addEnumValueCommitted("DrillOutcome", "link_followed");
  }
  if (!(await withClient((client) => enumValueExists(client, "DrillOutcome", "input_attempted")))) {
    await addEnumValueCommitted("DrillOutcome", "input_attempted");
  }

  await withClient(async (client) => {
    await client.query("BEGIN");
    try {
      const migrated = await client.query(
        `UPDATE "DrillDelivery" SET outcome = 'link_followed' WHERE outcome::text = 'caught'`
      );
      console.log(`MIGRATE: ${migrated.rowCount} delivery row(s) caught → link_followed`);

      await client.query(`ALTER TABLE "DrillDelivery" ALTER COLUMN outcome DROP DEFAULT`);

      const newTypeExists = await client.query(
        `SELECT 1 FROM pg_type WHERE typname = 'DrillOutcome_new'`
      );
      if (newTypeExists.rowCount === 0) {
        await client.query(`
          CREATE TYPE "DrillOutcome_new" AS ENUM ('pending', 'no_interaction', 'link_followed', 'input_attempted')
        `);
      }

      await client.query(`
        ALTER TABLE "DrillDelivery"
        ALTER COLUMN outcome TYPE "DrillOutcome_new"
        USING (
          CASE outcome::text
            WHEN 'caught' THEN 'link_followed'
            ELSE outcome::text
          END
        )::"DrillOutcome_new"
      `);

      await client.query(`DROP TYPE "DrillOutcome"`);
      await client.query(`ALTER TYPE "DrillOutcome_new" RENAME TO "DrillOutcome"`);
      await client.query(`ALTER TABLE "DrillDelivery" ALTER COLUMN outcome SET DEFAULT 'pending'`);
      await client.query("COMMIT");
      console.log("MIGRATE: DrillOutcome enum recreated without caught");
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    }
  });
}

async function ensurePurposeColumn() {
  await withClient(async (client) => {
    const col = await client.query(`
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'DrillDelivery' AND column_name = 'purpose'
    `);

    if (col.rowCount === 0) {
      const typeExists = await client.query(
        `SELECT 1 FROM pg_type WHERE typname = 'DrillDeliveryPurpose'`
      );
      if (typeExists.rowCount === 0) {
        await client.query(`
          CREATE TYPE "DrillDeliveryPurpose" AS ENUM ('demo', 'training')
        `);
      }
      await client.query(`
        ALTER TABLE "DrillDelivery"
        ADD COLUMN "purpose" "DrillDeliveryPurpose" NOT NULL DEFAULT 'demo'
      `);
      console.log("ADD: DrillDelivery.purpose column (default demo for existing rows)");
    } else {
      console.log("SKIP: DrillDelivery.purpose already exists");
    }
  });
}

async function ensureInteractionTypeColumn() {
  await withClient(async (client) => {
    const col = await client.query(`
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'DrillTemplate' AND column_name = 'interactionType'
    `);

    if (col.rowCount === 0) {
      const typeExists = await client.query(
        `SELECT 1 FROM pg_type WHERE typname = 'DrillInteractionType'`
      );
      if (typeExists.rowCount === 0) {
        await client.query(`
          CREATE TYPE "DrillInteractionType" AS ENUM ('link_visit', 'first_input_attempt')
        `);
      }
      await client.query(`
        ALTER TABLE "DrillTemplate"
        ADD COLUMN "interactionType" "DrillInteractionType" NOT NULL DEFAULT 'link_visit'
      `);
      console.log("ADD: DrillTemplate.interactionType column");
    } else {
      console.log("SKIP: DrillTemplate.interactionType already exists");
    }

    const parcelPath = await client.query(`
      UPDATE "DrillTemplate"
      SET "interactionType" = 'link_visit'
      WHERE slug = 'parcelpath-redelivery'
    `);
    if (parcelPath.rowCount > 0) {
      console.log(`UPDATE: ParcelPath template interactionType=link_visit (${parcelPath.rowCount} row)`);
    }
  });
}

async function backfillDemoPurpose() {
  await withClient(async (client) => {
    const result = await client.query(`
      UPDATE "DrillDelivery"
      SET purpose = 'demo'
      WHERE purpose IS DISTINCT FROM 'demo'
    `);
    if (result.rowCount > 0) {
      console.log(`BACKFILL: ${result.rowCount} existing delivery row(s) set to purpose=demo`);
    }
  });
}

async function main() {
  await recreateOutcomeEnumWithoutCaught();
  await ensurePurposeColumn();
  await ensureInteractionTypeColumn();
  await backfillDemoPurpose();
  console.log("DONE: migrate-drill-stage3a");
  await pool.end();
}

main().catch(async (error) => {
  console.error("FAIL:", error.message);
  await pool.end();
  process.exit(1);
});
