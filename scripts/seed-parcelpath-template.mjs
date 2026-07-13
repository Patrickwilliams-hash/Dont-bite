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

const PARCELPATH_DRILL_SLUG = "parcelpath-redelivery";

const parcelPathDrillDefinition = {
  title: "ParcelPath Delivery Reschedule",
  scamType: "delivery",
  brandName: "ParcelPath",
  fakeDomain: "parcelpath-delivery.co",
  realDomainHint: "official courier websites use their verified domain",
  redFlags: [
    "Unexpected delivery message when you were not expecting a parcel",
    "Vague parcel details — no clear sender, order number, or item description",
    "Creates mild urgency: 'choose a time within 24 hours'",
    "Sender domain does not match a courier you recognise",
    "Asks you to follow a link instead of using an official app or website",
  ],
  whyDangerous:
    "Courier scams often start with a believable delivery problem. The link can lead to a fake page that asks for personal details, payment information, or login credentials. Even a small fee request can be used to harvest card details for fraud.",
  howToSpot: [
    "Check whether you were actually expecting a delivery",
    "Look up the courier using contact details you find yourself — not from the email",
    "Be wary of vague tracking references with no order context",
    "Do not follow redelivery links from unexpected messages",
    "Official couriers usually provide clear parcel details and recognised branding",
  ],
  learnSlug: "phishing-emails",
  emailSubject: "Your parcel needs a new delivery time",
  emailPreviewText: "A delivery attempt could not be completed — action requested",
};

async function seedParcelPathTemplate() {
  const data = {
    ...parcelPathDrillDefinition,
    redFlags: [...parcelPathDrillDefinition.redFlags],
    howToSpot: [...parcelPathDrillDefinition.howToSpot],
    isActive: true,
  };

  const template = await db.drillTemplate.upsert({
    where: { slug: PARCELPATH_DRILL_SLUG },
    create: {
      slug: PARCELPATH_DRILL_SLUG,
      ...data,
    },
    update: data,
    select: {
      id: true,
      slug: true,
      title: true,
      isActive: true,
      updatedAt: true,
    },
  });

  const count = await db.drillTemplate.count({
    where: { slug: PARCELPATH_DRILL_SLUG },
  });

  console.log("PASS: ParcelPath template seeded");
  console.log(
    JSON.stringify(
      {
        slug: template.slug,
        templateId: template.id,
        isActive: template.isActive,
        matchingSlugCount: count,
      },
      null,
      2
    )
  );
}

seedParcelPathTemplate()
  .catch((error) => {
    console.error("FAIL: seed-parcelpath-template", error instanceof Error ? error.message : "unknown");
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
    await pool.end();
  });
