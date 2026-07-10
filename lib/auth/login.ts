import { compare } from "bcryptjs";
import { db } from "@/lib/db";
import type { UserRole } from "@prisma/client";

export interface AuthenticatedUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  frequency: "weekly" | "fortnightly" | "monthly";
  joinedAt: Date;
  trainingActive: boolean;
  mustChangePassword: boolean;
}

export type AuthenticateResult =
  | { ok: true; user: AuthenticatedUser }
  | { ok: false; reason: "invalid" | "inactive" };

export async function authenticateWithPassword(
  email: string,
  password: string
): Promise<AuthenticateResult> {
  const normalizedEmail = email.trim().toLowerCase();

  const user = await db.user.findUnique({
    where: { email: normalizedEmail },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      frequency: true,
      joinedAt: true,
      passwordHash: true,
      isActive: true,
      mustChangePassword: true,
      trainingActive: true,
    },
  });

  if (!user || !user.isActive) {
    return { ok: false, reason: "invalid" };
  }

  if (!user.passwordHash || !user.passwordHash.startsWith("$2")) {
    return { ok: false, reason: "invalid" };
  }

  const validPassword = await compare(password, user.passwordHash);
  if (!validPassword) {
    return { ok: false, reason: "invalid" };
  }

  return {
    ok: true,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      frequency: user.frequency,
      joinedAt: user.joinedAt,
      trainingActive: user.trainingActive,
      mustChangePassword: user.mustChangePassword,
    },
  };
}

export function serializeSessionUser(user: AuthenticatedUser) {
  return {
    name: user.name,
    email: user.email,
    frequency: user.frequency,
    joinedAt: user.joinedAt,
    trainingActive: user.trainingActive,
    role: user.role,
  };
}
