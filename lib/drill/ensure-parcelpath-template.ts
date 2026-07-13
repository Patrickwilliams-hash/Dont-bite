import "server-only";

import { db } from "@/lib/db";
import {
  PARCELPATH_DRILL_SLUG,
  parcelPathDrillDefinition,
} from "@/lib/drill/parcelpath-template";

export async function ensureParcelPathTemplate() {
  const data = {
    title: parcelPathDrillDefinition.title,
    scamType: parcelPathDrillDefinition.scamType,
    brandName: parcelPathDrillDefinition.brandName,
    fakeDomain: parcelPathDrillDefinition.fakeDomain,
    realDomainHint: parcelPathDrillDefinition.realDomainHint,
    redFlags: [...parcelPathDrillDefinition.redFlags],
    whyDangerous: parcelPathDrillDefinition.whyDangerous,
    howToSpot: [...parcelPathDrillDefinition.howToSpot],
    learnSlug: parcelPathDrillDefinition.learnSlug,
    emailSubject: parcelPathDrillDefinition.emailSubject,
    emailPreviewText: parcelPathDrillDefinition.emailPreviewText,
    isActive: true,
  };

  return db.drillTemplate.upsert({
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
      brandName: true,
      scamType: true,
      emailSubject: true,
      emailPreviewText: true,
      isActive: true,
    },
  });
}
