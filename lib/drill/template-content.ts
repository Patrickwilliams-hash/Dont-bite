import "server-only";

import type { DrillTemplate } from "@prisma/client";

export interface DebriefTemplateContent {
  title: string;
  scamType: string;
  brandName: string;
  fakeDomain: string;
  realDomainHint: string;
  redFlags: string[];
  whyDangerous: string;
  howToSpot: string[];
  learnSlug: string;
}

function parseStringArray(value: unknown, fieldName: string): string[] {
  if (!Array.isArray(value)) {
    throw new Error(`Invalid drill template ${fieldName}: expected string array.`);
  }

  const items: string[] = [];
  for (const item of value) {
    if (typeof item !== "string") {
      throw new Error(`Invalid drill template ${fieldName}: expected string items.`);
    }
    items.push(item);
  }

  return items;
}

export function parseDebriefTemplateContent(
  template: Pick<
    DrillTemplate,
    | "title"
    | "scamType"
    | "brandName"
    | "fakeDomain"
    | "realDomainHint"
    | "redFlags"
    | "whyDangerous"
    | "howToSpot"
    | "learnSlug"
  >
): DebriefTemplateContent {
  return {
    title: template.title,
    scamType: template.scamType,
    brandName: template.brandName,
    fakeDomain: template.fakeDomain,
    realDomainHint: template.realDomainHint,
    redFlags: parseStringArray(template.redFlags, "redFlags"),
    whyDangerous: template.whyDangerous,
    howToSpot: parseStringArray(template.howToSpot, "howToSpot"),
    learnSlug: template.learnSlug,
  };
}
