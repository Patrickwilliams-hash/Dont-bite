import { NextResponse } from "next/server";
import { readSessionTokenFromCookie, validateSessionToken, type SessionUser } from "@/lib/auth/session";
import {
  hasAdminPermission,
  isSuperAdmin,
  type AdminPermissionKey,
} from "@/lib/auth/admin-permissions";

export type AuthGuardResult =
  | { ok: true; user: SessionUser; sessionId: string }
  | { ok: false; response: NextResponse<{ error: string }> };

export async function requireUser(): Promise<AuthGuardResult> {
  const rawToken = await readSessionTokenFromCookie();
  if (!rawToken) {
    return { ok: false, response: NextResponse.json({ error: "Authentication required." }, { status: 401 }) };
  }

  const validated = await validateSessionToken(rawToken);
  if (!validated) {
    return { ok: false, response: NextResponse.json({ error: "Authentication required." }, { status: 401 }) };
  }

  return { ok: true, user: validated.user, sessionId: validated.session.id };
}

export async function requireAdmin(): Promise<AuthGuardResult> {
  const auth = await requireUser();
  if (!auth.ok) return auth;
  if (auth.user.role !== "admin") {
    return { ok: false, response: NextResponse.json({ error: "Admin access required." }, { status: 403 }) };
  }
  return auth;
}

export async function requireAdminPermission(
  permission: AdminPermissionKey
): Promise<AuthGuardResult> {
  const auth = await requireAdmin();
  if (!auth.ok) return auth;
  if (!hasAdminPermission(auth.user, permission)) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Insufficient administrator permissions." }, { status: 403 }),
    };
  }
  return auth;
}

export async function requireSuperAdmin(): Promise<AuthGuardResult> {
  const auth = await requireAdmin();
  if (!auth.ok) return auth;
  if (!isSuperAdmin(auth.user)) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Super Admin access required." }, { status: 403 }),
    };
  }
  return auth;
}