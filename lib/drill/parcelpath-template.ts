import "server-only";

export const PARCELPATH_DRILL_SLUG = "parcelpath-redelivery";

export const parcelPathDrillDefinition = {
  slug: PARCELPATH_DRILL_SLUG,
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
  emailSenderDisplayName: "ParcelPath Updates",
  emailScenarioMessage:
    "We attempted to deliver your parcel today but could not complete the delivery. Please choose a new delivery time within the next 24 hours to avoid the parcel being returned to the sender.",
  emailCtaLabel: "Choose delivery time",
} as const;

export type ParcelPathDrillDefinition = typeof parcelPathDrillDefinition;
