export type DrillFrequency = "weekly" | "fortnightly" | "monthly";
export type ScamType =
  | "phishing"
  | "subscription"
  | "delivery"
  | "social-engineering"
  | "invoice"
  | "romance";

export interface User {
  name: string;
  email: string;
  frequency: DrillFrequency;
  joinedAt: string;
  trainingActive: boolean;
}

export interface Stats {
  drillsSent: number;
  spotted: number;
  caught: number;
  falseAlarms: number;
  monthlyTrend: { month: string; caught: number; spotted: number }[];
  byScamType: Record<ScamType, number>;
}

export interface MockStore {
  user: User | null;
  stats: Stats;
}

export const STORAGE_KEY = "phish-mock-v2";

// Real drill tracking doesn't exist yet, so stats start (and stay) at zero
// until the drill delivery system is built. No mock data.
export const defaultStats = (): Stats => ({
  drillsSent: 0,
  spotted: 0,
  caught: 0,
  falseAlarms: 0,
  monthlyTrend: [],
  byScamType: {
    phishing: 0,
    subscription: 0,
    delivery: 0,
    "social-engineering": 0,
    invoice: 0,
    romance: 0,
  },
});

export function getDefaultStore(): MockStore {
  return {
    user: null,
    stats: defaultStats(),
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
  const user = data.user
    ? { ...data.user, trainingActive: data.user.trainingActive ?? true }
    : null;
  return {
    user,
    stats: {
      ...defaults.stats,
      ...(data.stats ?? {}),
      monthlyTrend: data.stats?.monthlyTrend ?? defaults.stats.monthlyTrend,
      byScamType: {
        ...defaults.stats.byScamType,
        ...(data.stats?.byScamType ?? {}),
      },
    },
  };
}

export function saveStore(store: MockStore): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  window.dispatchEvent(new Event("phish-store-update"));
}

export function setLocalUserSession(user: User): MockStore {
  const store = loadStore();
  if (!store.user || store.user.email !== user.email) {
    // Switch to a clean account state when a different SQL user logs in.
    store.stats = defaultStats();
  }
  store.user = user;
  saveStore(store);
  return store;
}

/** Patch fields on the locally stored session user (e.g. after a settings update). */
export function updateLocalUser(patch: Partial<User>): MockStore {
  const store = loadStore();
  if (store.user) {
    store.user = { ...store.user, ...patch };
    saveStore(store);
  }
  return store;
}

export function logout(): MockStore {
  const store = loadStore();
  store.user = null;
  saveStore(store);
  return store;
}

export function getWeakestScamType(store: MockStore): ScamType {
  const entries = Object.entries(store.stats.byScamType) as [ScamType, number][];
  const sorted = entries.sort((a, b) => b[1] - a[1]);
  if (!sorted[0] || sorted[0][1] === 0) return "phishing";
  return sorted[0][0];
}
