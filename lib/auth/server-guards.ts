import { redirect } from "next/navigation";
import { readSessionTokenFromCookie, validateSessionToken, type SessionUser } from "@/lib/auth/session";

export async function requireAdminPageAccess(): Promise<SessionUser> {
  const token = await readSessionTokenFromCookie();
  if (!token) {
    redirect("/admin/login");
  }

  const validated = await validateSessionToken(token);
  if (!validated) {
    redirect("/admin/login");
  }

  if (validated.user.role !== "admin") {
    redirect("/admin/login?denied=1");
  }

  return validated.user;
}
