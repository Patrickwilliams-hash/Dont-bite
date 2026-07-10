import { db } from "@/lib/db";
import { getDrill, isKnownDrillTemplateId, type DrillTemplate } from "@/lib/drills/catalog";
import type { ScamType, Stats } from "@/lib/mock-store";
import { defaultStats } from "@/lib/mock-store";

export const DRILL_EXPIRY_DAYS = 14;

export type DrillHistoryStatus = "pending" | "caught" | "spotted" | "expired";

export interface DrillHistoryItem {
  id: string;
  templateId: string;
  title: string;
  scamType: ScamType;
  status: DrillHistoryStatus;
  isTest: boolean;
  sentAt: string;
  clickedAt: string | null;
  spottedAt: string | null;
  expiresAt: string | null;
  lessonPath: string | null;
  learnSlug: string | null;
}

export function getDrillExpiryDate(from = new Date()): Date {
  const expiresAt = new Date(from);
  expiresAt.setDate(expiresAt.getDate() + DRILL_EXPIRY_DAYS);
  return expiresAt;
}

export async function expirePendingDrills(userId?: string) {
  const now = new Date();
  await db.drillSend.updateMany({
    where: {
      status: "pending",
      expiresAt: { lt: now },
      ...(userId ? { userId } : {}),
    },
    data: { status: "expired" },
  });
}

export function serializeDrillHistoryItem(send: {
  id: string;
  templateId: string;
  title: string;
  scamType: string;
  status: DrillHistoryStatus;
  isTest: boolean;
  sentAt: Date;
  clickedAt: Date | null;
  spottedAt: Date | null;
  expiresAt: Date | null;
}): DrillHistoryItem {
  const template = getDrill(send.templateId);
  const lessonPath =
    send.status === "caught" || send.status === "spotted"
      ? `/caught/${send.templateId}?send=${send.id}`
      : null;

  return {
    id: send.id,
    templateId: send.templateId,
    title: send.title,
    scamType: send.scamType as ScamType,
    status: send.status,
    isTest: send.isTest,
    sentAt: send.sentAt.toISOString(),
    clickedAt: send.clickedAt?.toISOString() ?? null,
    spottedAt: send.spottedAt?.toISOString() ?? null,
    expiresAt: send.expiresAt?.toISOString() ?? null,
    lessonPath,
    learnSlug: template?.learnSlug ?? null,
  };
}

export function buildStatsFromSends(
  sends: Array<{
    scamType: string;
    status: DrillHistoryStatus;
    sentAt: Date;
    isTest: boolean;
  }>,
  options: { includeTests?: boolean } = {}
): Stats {
  const includeTests = options.includeTests ?? true;
  const stats = defaultStats();
  const monthBuckets = new Map<string, { month: string; caught: number; spotted: number; sortKey: string }>();

  for (const send of sends) {
    if (!includeTests && send.isTest) continue;

    stats.drillsSent += 1;

    if (send.status === "caught") {
      stats.caught += 1;
      const key = send.scamType as ScamType;
      if (key in stats.byScamType) {
        stats.byScamType[key] += 1;
      }
    } else if (send.status === "spotted") {
      stats.spotted += 1;
    }

    if (send.status === "caught" || send.status === "spotted") {
      const monthKey = `${send.sentAt.getUTCFullYear()}-${String(send.sentAt.getUTCMonth() + 1).padStart(2, "0")}`;
      const label = send.sentAt.toLocaleDateString("en-NZ", { month: "short", year: "2-digit" });
      const bucket = monthBuckets.get(monthKey) ?? {
        month: label,
        caught: 0,
        spotted: 0,
        sortKey: monthKey,
      };
      if (send.status === "caught") bucket.caught += 1;
      if (send.status === "spotted") bucket.spotted += 1;
      monthBuckets.set(monthKey, bucket);
    }
  }

  stats.monthlyTrend = [...monthBuckets.values()]
    .sort((a, b) => a.sortKey.localeCompare(b.sortKey))
    .slice(-6)
    .map(({ month, caught, spotted }) => ({ month, caught, spotted }));

  return stats;
}

export async function getUserDrillStats(userId: string): Promise<Stats> {
  await expirePendingDrills(userId);
  const sends = await db.drillSend.findMany({
    where: { userId },
    select: {
      scamType: true,
      status: true,
      sentAt: true,
      isTest: true,
    },
  });
  return buildStatsFromSends(sends);
}

export async function getUserDrillHistory(userId: string, limit = 50): Promise<DrillHistoryItem[]> {
  await expirePendingDrills(userId);
  const sends = await db.drillSend.findMany({
    where: { userId },
    orderBy: { sentAt: "desc" },
    take: limit,
  });
  return sends.map(serializeDrillHistoryItem);
}

export async function createDrillSend(input: {
  userId: string;
  template: DrillTemplate;
  isTest?: boolean;
  sentByAdminId?: string;
}) {
  const sentAt = new Date();
  return db.drillSend.create({
    data: {
      userId: input.userId,
      templateId: input.template.id,
      scamType: input.template.scamType,
      title: input.template.title,
      status: "pending",
      isTest: input.isTest ?? false,
      sentByAdminId: input.sentByAdminId,
      sentAt,
      expiresAt: getDrillExpiryDate(sentAt),
    },
  });
}

export async function markDrillCaught(trackingToken: string) {
  const send = await db.drillSend.findUnique({
    where: { trackingToken },
  });
  if (!send) return null;

  if (send.status === "pending") {
    const now = new Date();
    if (send.expiresAt && send.expiresAt < now) {
      return db.drillSend.update({
        where: { id: send.id },
        data: { status: "expired" },
      });
    }

    return db.drillSend.update({
      where: { id: send.id },
      data: {
        status: "caught",
        clickedAt: now,
      },
    });
  }

  return send;
}

export async function markDrillSpotted(sendId: string, userId: string) {
  const send = await db.drillSend.findFirst({
    where: { id: sendId, userId },
  });
  if (!send) return null;

  if (send.status === "pending") {
    const now = new Date();
    if (send.expiresAt && send.expiresAt < now) {
      return db.drillSend.update({
        where: { id: send.id },
        data: { status: "expired" },
      });
    }

    return db.drillSend.update({
      where: { id: send.id },
      data: {
        status: "spotted",
        spottedAt: now,
      },
    });
  }

  return send;
}

export async function getPlatformDrillStats() {
  await expirePendingDrills();

  const [sent, caught, spotted, pending, recent] = await Promise.all([
    db.drillSend.count({ where: { isTest: false } }),
    db.drillSend.count({ where: { isTest: false, status: "caught" } }),
    db.drillSend.count({ where: { isTest: false, status: "spotted" } }),
    db.drillSend.count({ where: { isTest: false, status: "pending" } }),
    db.drillSend.findMany({
      where: { isTest: false },
      orderBy: { sentAt: "desc" },
      take: 12,
      select: {
        id: true,
        title: true,
        status: true,
        sentAt: true,
        user: { select: { name: true, email: true } },
      },
    }),
  ]);

  const completed = caught + spotted;
  const spotRate = completed > 0 ? Math.round((spotted / completed) * 100) : null;

  return {
    drillsSent: sent,
    bites: caught,
    spotted,
    pending,
    spotRate,
    recent: recent.map((item) => ({
      id: item.id,
      title: item.title,
      status: item.status,
      sentAt: item.sentAt.toISOString(),
      userName: item.user.name,
      userEmail: item.user.email,
    })),
  };
}

export function assertTemplateId(templateId: string): DrillTemplate {
  if (!isKnownDrillTemplateId(templateId)) {
    throw new Error("Unknown drill template.");
  }
  const template = getDrill(templateId);
  if (!template) {
    throw new Error("Unknown drill template.");
  }
  return template;
}
