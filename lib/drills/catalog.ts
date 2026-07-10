import type { ScamType } from "@/lib/mock-store";

export interface DrillTemplate {
  id: string;
  title: string;
  scamType: ScamType;
  subject: string;
  previewText: string;
  senderName: string;
  senderEmail: string;
  fakeDomain: string;
  realDomainHint: string;
  brandName: string;
  redFlags: string[];
  whyDangerous: string;
  howToSpot: string[];
  learnSlug: string;
}

export const drillTemplates: Record<string, DrillTemplate> = {
  "bank-verify": {
    id: "bank-verify",
    title: "SecureBank Account Verification",
    scamType: "phishing",
    subject: "Action required: verify your SecureBank account within 24 hours",
    previewText: "We noticed unusual sign-in activity on your account.",
    senderName: "SecureBank Security",
    senderEmail: "security@secure-bank-verify.com",
    fakeDomain: "secure-bank-verify.com",
    realDomainHint: "securebank.co.nz",
    brandName: "SecureBank",
    redFlags: [
      "Sender email uses secure-bank-verify.com — not the real bank domain",
      "Creates urgent pressure: 'account will be locked in 24 hours'",
      "Link goes to a login page asking for your real credentials",
      "Generic greeting: 'Dear Customer' instead of your name",
      "Threatens consequences to make you act without thinking",
    ],
    whyDangerous:
      "If you enter your real login details, scammers can access your bank account, transfer money, or use your identity. Banks will rarely ask you to verify via email links — and they will never ask for your full password on a page you reached from an email.",
    howToSpot: [
      "Check the sender's email address carefully — look for misspellings or extra words",
      "Hover over links before clicking to see the real URL",
      "Log in by typing your bank's address directly into your browser",
      "Call your bank using the number on your card, not one in the email",
      "Real banks don't threaten to lock your account via email",
    ],
    learnSlug: "phishing-emails",
  },
  "delivery-reschedule": {
    id: "delivery-reschedule",
    title: "FastPost Delivery Reschedule",
    scamType: "delivery",
    subject: "Your parcel is waiting — pay $2.40 to reschedule delivery",
    previewText: "We attempted delivery today but nobody was home.",
    senderName: "FastPost NZ",
    senderEmail: "tracking@fastpost-nz.co",
    fakeDomain: "fastpost-nz.co",
    realDomainHint: "nzpost.co.nz",
    brandName: "FastPost NZ",
    redFlags: [
      "Small fee ($2.40) designed to seem harmless",
      "Asks for card details to 'reschedule' a delivery you weren't expecting",
      "Domain fastpost-nz.co is not the official courier",
      "Creates fake tracking number to appear legitimate",
      "No mention of what was actually ordered or from whom",
    ],
    whyDangerous:
      "Courier scams work because the fee seems tiny — but once you enter card details, scammers can charge much more. These pages often harvest card numbers for fraud or sign you up for hidden subscriptions.",
    howToSpot: [
      "Check if you were actually expecting a parcel",
      "Verify tracking numbers on the official courier website directly",
      "Be suspicious of any delivery fee request via email link",
      "Official couriers rarely charge redelivery fees this way",
      "Look up the courier's real website — don't use the link in the email",
    ],
    learnSlug: "phishing-emails",
  },
  "subscription-renewal": {
    id: "subscription-renewal",
    title: "PureGlow Free Trial Renewal",
    scamType: "subscription",
    subject: "Your PureGlow free trial ends tonight — confirm to keep access",
    previewText: "Confirm your details to avoid interruption.",
    senderName: "PureGlow Billing",
    senderEmail: "billing@pureglow-trial.com",
    fakeDomain: "pureglow-trial.com",
    realDomainHint: "pureglow.com (if it exists)",
    brandName: "PureGlow Wellness",
    redFlags: [
      "Free trial that auto-renews at $89.95/month — buried in fine print",
      "Cancellation requires calling within 6 hours — designed to be missed",
      "Product name uses buzzwords: 'Argan Oil Weight Loss Blend'",
      "You may not remember signing up — because the signup was on a different site",
      "Pre-checked 'agree to terms' boxes on the original signup page",
    ],
    whyDangerous:
      "This is the scam Patrick saw daily at ANZ chargebacks. Customers genuinely didn't realise they'd authorised recurring charges. The signup page had tiny text about auto-renewal, pre-checked boxes, and a 'free' product that cost nothing upfront — but $89.95/month after 14 days. Banks often side with the merchant because the customer did technically agree.",
    howToSpot: [
      "Read ALL fine print before any 'free' trial",
      "Search the company name + 'scam' or 'reviews' before signing up",
      "Use a virtual card or prepaid card for unknown sites",
      "Set a calendar reminder to cancel before the trial ends",
      "Be wary of 'miracle' health products with celebrity endorsements",
      "Check your bank statements weekly for unexpected charges",
    ],
    learnSlug: "hidden-subscriptions",
  },
};

export function listDrillTemplates(): DrillTemplate[] {
  return Object.values(drillTemplates);
}

export function getDrill(id: string): DrillTemplate | undefined {
  return drillTemplates[id];
}

export function isKnownDrillTemplateId(id: string): boolean {
  return id in drillTemplates;
}
