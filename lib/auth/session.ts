import crypto from "node:crypto";
import { cookies } from "next/headers";
import { db } from "@/lib/db";
import type { UserRole, AdminTier } from "@prisma/client";

export const SESSION_COOKIE_NAME = "dontbite_session";
const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 14; // 14 days

export interface SessionUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  adminTier: AdminTier | null;
  adminPermissions: string[];
  isActive: boolean;
  frequency: "weekly" | "fortnightly" | "monthly";
  joinedAt: Date;
  trainingActive: boolean;
  mustChangePassword: boolean;
}

export function hashSessionToken(rawToken: string): string {
  return crypto.createHash("sha256").update(rawToken).digest("hex");
}

export function generateSessionToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

export function getSessionExpiry(): Date {
  return new Date(Date.now() + SESSION_TTL_MS);
}

export async function createSession(userId: string) {
  const token = generateSessionToken();
  const tokenHash = hashSessionToken(token);
  const expiresAt = getSessionExpiry();

  const session = await db.session.create({
    data: {
      userId,
      tokenHash,
      expiresAt,
    },
    select: {
      id: true,
      expiresAt: true,
    },
  });

  return { token, session };
}

export async function revokeSession(rawToken: string) {
  const tokenHash = hashSessionToken(rawToken);
  await db.session.updateMany({
    where: {
      tokenHash,
      revokedAt: null,
    },
    data: { revokedAt: new Date() },
  });
}

export async function revokeAllUserSessions(userId: string) {
  await db.session.updateMany({
    where: {
      userId,
      revokedAt: null,
    },
    data: { revokedAt: new Date() },
  });
}

export async function validateSessionToken(rawToken: string) {
  const tokenHash = hashSessionToken(rawToken);
  const now = new Date();
  const result = await db.session.findFirst({
    where: {
      tokenHash,
      revokedAt: null,
      expiresAt: { gt: now },
    },
    select: {
      id: true,
      userId: true,
      expiresAt: true,
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          adminTier: true,
          adminPermissions: true,
          isActive: true,
          frequency: true,
          joinedAt: true,
          trainingActive: true,
          mustChangePassword: true,
        },
      },
    },
  });

  if (!result || !result.user.isActive) return null;

  await db.session.update({
    where: { id: result.id },
    data: { lastSeenAt: now },
  });

  return { session: { id: result.id, userId: result.userId, expiresAt: result.expiresAt }, user: result.user };
}

export function getSessionCookieOptions(expiresAt?: Date) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    expires: expiresAt ?? getSessionExpiry(),
  };
}

export async function setSessionCookie(rawToken: string, expiresAt: Date) {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, rawToken, getSessionCookieOptions(expiresAt));
}

export async function clearSessionCookie() {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, "", {
    ...getSessionCookieOptions(new Date(0)),
    maxAge: 0,
  });
}

export async function readSessionTokenFromCookie() {
  const cookieStore = await cookies();
  return cookieStore.get(SESSION_COOKIE_NAME)?.value ?? null;
}
