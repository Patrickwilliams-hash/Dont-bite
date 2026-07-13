import type { DrillOutcome } from "@prisma/client";

/** User-facing labels for technical drill outcomes. Branding terms stay out of the database. */
export const OUTCOME_USER_LABELS: Record<DrillOutcome, string> = {
  pending: "Active",
  no_interaction: "Swam Clear",
  link_followed: "Took the Bait",
  input_attempted: "Hooked",
};

export const OUTCOME_USER_DESCRIPTIONS: Record<DrillOutcome, string> = {
  pending: "This drill is still active.",
  no_interaction: "No unsafe interaction was detected.",
  link_followed: "The suspicious link was followed.",
  input_attempted: "An attempt was made to begin entering information on a simulated landing page.",
};

export function outcomeUserLabel(outcome: DrillOutcome): string {
  return OUTCOME_USER_LABELS[outcome];
}
