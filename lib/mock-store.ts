export type DrillFrequency = "weekly" | "fortnightly" | "monthly";
export type ScamType =
  | "phishing"
  | "subscription"
  | "delivery"
  | "social-engineering"
  | "invoice"
  | "romance";

export type EmailKind = "drill" | "legit";
export type EmailOutcome =
  | "pending"
  | "spotted" // drill correctly reported as phishing
  | "caught" // drill link clicked — got hooked
  | "trusted" // legit email correctly trusted
  | "false-alarm"; // legit email wrongly reported

export interface User {
  name: string;
  email: string;
  frequency: DrillFrequency;
  joinedAt: string;
}

export interface Stats {
  drillsSent: number;
  spotted: number;
  caught: number;
  falseAlarms: number;
  streak: number;
  monthlyTrend: { month: string; caught: number; spotted: number }[];
  byScamType: Record<ScamType, number>;
}

export interface DrillEmail {
  id: string;
  subject: string;
  from: string;
  fromEmail: string;
  body: string;
  preview: string;
  read: boolean;
  kind: EmailKind;
  type: ScamType;
  drillId: string;
  receivedAt: string;
  outcome: EmailOutcome;
}

export interface MockStore {
  user: User | null;
  stats: Stats;
  emails: DrillEmail[];
}

export const STORAGE_KEY = "phish-mock-v2";

export const defaultStats = (): Stats => ({
  drillsSent: 0,
  spotted: 0,
  caught: 0,
  falseAlarms: 0,
  streak: 0,
  monthlyTrend: [
    { month: "Apr", caught: 2, spotted: 1 },
    { month: "May", caught: 1, spotted: 2 },
    { month: "Jun", caught: 0, spotted: 0 },
  ],
  byScamType: {
    phishing: 0,
    subscription: 0,
    delivery: 0,
    "social-engineering": 0,
    invoice: 0,
    romance: 0,
  },
});

export function createSeedEmails(): DrillEmail[] {
  const now = Date.now();
  return [
    {
      id: "email-1",
      subject: "URGENT: Verify your SecureBank account now",
      from: "SecureBank Security",
      fromEmail: "security@secure-bank-verify.com",
      preview: "We detected unusual activity on your account. Click here to verify...",
      body: `Dear Customer,

We detected unusual sign-in activity on your SecureBank account from an unknown device in Auckland, New Zealand.

If this wasn't you, please verify your identity immediately to prevent your account from being locked.

VERIFY MY ACCOUNT NOW
https://secure-bank-verify.com/login

This link expires in 24 hours.

SecureBank Security Team
Do not reply to this email.`,
      read: false,
      kind: "drill",
      type: "phishing",
      drillId: "bank-verify",
      receivedAt: new Date(now - 2 * 60 * 60 * 1000).toISOString(),
      outcome: "pending",
    },
    {
      id: "email-legit-1",
      subject: "Your order #BT-4471 is on its way ☕",
      from: "Bean There Café",
      fromEmail: "orders@beanthere.co.nz",
      preview: "Thanks for your order! Your coffee beans have shipped.",
      body: `Hi there,

Thanks for your order with Bean There Café!

Order #BT-4471
1x Single Origin Beans (250g) — $18.00
Shipping — Free

Your order has shipped and should arrive within 2–3 business days. No action is needed from you.

You can view your order details any time by logging in to your account at beanthere.co.nz.

Enjoy your coffee!
The Bean There team`,
      read: false,
      kind: "legit",
      type: "phishing",
      drillId: "",
      receivedAt: new Date(now - 3 * 60 * 60 * 1000).toISOString(),
      outcome: "pending",
    },
    {
      id: "email-2",
      subject: "Your parcel could not be delivered — action required",
      from: "FastPost NZ",
      fromEmail: "delivery@fastpost-nz.co",
      preview: "We attempted delivery but no one was home. Reschedule now...",
      body: `Hello,

We attempted to deliver your parcel today but no one was available to receive it.

Tracking: FP-92837465
Status: On hold — redelivery fee $2.40

To reschedule delivery, please confirm your address and payment details:
https://fastpost-nz.co/reschedule

FastPost NZ Customer Service`,
      read: false,
      kind: "drill",
      type: "delivery",
      drillId: "delivery-reschedule",
      receivedAt: new Date(now - 5 * 60 * 60 * 1000).toISOString(),
      outcome: "pending",
    },
    {
      id: "email-3",
      subject: "Your free trial ends tomorrow — update payment",
      from: "PureGlow Wellness",
      fromEmail: "billing@pureglow-trial.com",
      preview: "Your 14-day free trial of Argan Oil Weight Loss Blend ends tomorrow...",
      body: `Hi there,

Your 14-day FREE trial of Argan Oil Weight Loss Blend ends tomorrow.

To continue enjoying your results, your subscription will automatically renew at $89.95/month.

If you wish to cancel, you must call our support line within the next 6 hours.

MANAGE SUBSCRIPTION
https://pureglow-trial.com/account

PureGlow Wellness Team`,
      read: false,
      kind: "drill",
      type: "subscription",
      drillId: "subscription-renewal",
      receivedAt: new Date(now - 24 * 60 * 60 * 1000).toISOString(),
      outcome: "pending",
    },
    {
      id: "email-legit-2",
      subject: "Welcome to Don't Bite — you're all set",
      from: "Don't Bite",
      fromEmail: "hello@dontbite.co.nz",
      preview: "Your training is active. Here's what to expect next.",
      body: `Kia ora,

Welcome to Don't Bite! Your scam-awareness training is now active.

From time to time, we'll send simulated scam emails to this inbox — mixed in with your normal mail. Your job is simple: spot them.

If you think an email is a scam, report it. If you're ever caught out by one of our drills, Phil will pop up with a friendly lesson so you're ready next time.

There's nothing you need to do right now. Happy spotting!

— The Don't Bite team`,
      read: false,
      kind: "legit",
      type: "phishing",
      drillId: "",
      receivedAt: new Date(now - 28 * 60 * 60 * 1000).toISOString(),
      outcome: "pending",
    },
  ];
}

export function getDefaultStore(): MockStore {
  return {
    user: null,
    stats: defaultStats(),
    emails: [],
  };
}

export function loadStore(): MockStore {
  if (typeof window === "undefined") return getDefaultStore();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return getDefaultStore();
    return normalizeStore(JSON.parse(raw) as Partial<MockStore>);
  } catch {
    return getDefaultStore();
  }
}

function normalizeStore(data: Partial<MockStore>): MockStore {
  const defaults = getDefaultStore();
  return {
    user: data.user ?? null,
    stats: {
      ...defaults.stats,
      ...(data.stats ?? {}),
      monthlyTrend: data.stats?.monthlyTrend ?? defaults.stats.monthlyTrend,
      byScamType: {
        ...defaults.stats.byScamType,
        ...(data.stats?.byScamType ?? {}),
      },
    },
    emails: Array.isArray(data.emails) ? data.emails : defaults.emails,
  };
}

export function saveStore(store: MockStore): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  window.dispatchEvent(new Event("phish-store-update"));
}

export function signUp(
  name: string,
  email: string,
  frequency: DrillFrequency
): MockStore {
  const store = getDefaultStore();
  store.user = { name, email, frequency, joinedAt: new Date().toISOString() };
  saveStore(store);
  return store;
}

export function setLocalUserSession(user: User): MockStore {
  const store = loadStore();
  if (!store.user || store.user.email !== user.email) {
    // Switch to a clean account state when a different SQL user logs in.
    store.stats = defaultStats();
    store.emails = [];
  }
  store.user = user;
  saveStore(store);
  return store;
}

export function logout(): MockStore {
  const store = loadStore();
  store.user = null;
  saveStore(store);
  return store;
}

export function login(email: string): MockStore | null {
  const store = loadStore();
  if (!store.user || store.user.email !== email) return null;
  return store;
}

export function markEmailRead(emailId: string): void {
  const store = loadStore();
  const email = store.emails.find((e) => e.id === emailId);
  if (email && !email.read) {
    email.read = true;
    saveStore(store);
  }
}

function currentMonth(store: MockStore) {
  return store.stats.monthlyTrend[store.stats.monthlyTrend.length - 1];
}

/** User reports an email as phishing. Correct for drills, a false alarm for legit mail. */
export function reportEmail(emailId: string): EmailOutcome | null {
  const store = loadStore();
  const email = store.emails.find((e) => e.id === emailId);
  if (!email || email.outcome !== "pending") return email?.outcome ?? null;

  email.read = true;
  if (email.kind === "drill") {
    email.outcome = "spotted";
    store.stats.spotted += 1;
    store.stats.streak += 1;
    const month = currentMonth(store);
    if (month) month.spotted += 1;
  } else {
    email.outcome = "false-alarm";
    store.stats.falseAlarms += 1;
    store.stats.streak = 0;
  }
  saveStore(store);
  return email.outcome;
}

/**
 * User clicks a link in an email. For a drill this is the "gotcha" that triggers
 * the Phil lesson. For legit mail it's the safe, correct outcome.
 */
export function clickEmailLink(emailId: string): EmailOutcome | null {
  const store = loadStore();
  const email = store.emails.find((e) => e.id === emailId);
  if (!email) return null;

  email.read = true;

  if (email.kind === "drill") {
    if (email.outcome === "pending" || email.outcome === "spotted") {
      // Clicking overrides a prior "spotted" only if not already caught.
      if (email.outcome === "spotted") {
        store.stats.spotted = Math.max(0, store.stats.spotted - 1);
        const month = currentMonth(store);
        if (month) month.spotted = Math.max(0, month.spotted - 1);
      }
      email.outcome = "caught";
      store.stats.caught += 1;
      store.stats.streak = 0;
      store.stats.byScamType[email.type] =
        (store.stats.byScamType[email.type] || 0) + 1;
      const month = currentMonth(store);
      if (month) month.caught += 1;
      saveStore(store);
    }
    return "caught";
  }

  if (email.outcome === "pending") {
    email.outcome = "trusted";
    store.stats.streak += 1;
    saveStore(store);
  }
  return email.outcome;
}

export function sendNewDrill(): void {
  const store = loadStore();
  const templates = createSeedEmails().filter((e) => e.kind === "drill");
  const template = templates[Math.floor(Math.random() * templates.length)];
  const newEmail: DrillEmail = {
    ...template,
    id: `email-${Date.now()}`,
    read: false,
    outcome: "pending",
    receivedAt: new Date().toISOString(),
  };
  store.emails.unshift(newEmail);
  store.stats.drillsSent += 1;
  saveStore(store);
}

export function getWeakestScamType(store: MockStore): ScamType {
  const entries = Object.entries(store.stats.byScamType) as [ScamType, number][];
  const sorted = entries.sort((a, b) => b[1] - a[1]);
  if (!sorted[0] || sorted[0][1] === 0) return "phishing";
  return sorted[0][0];
}
