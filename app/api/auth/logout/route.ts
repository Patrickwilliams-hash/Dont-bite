import { NextResponse } from "next/server";
import { clearSessionCookie, readSessionTokenFromCookie, revokeSession } from "@/lib/auth/session";

export async function POST() {
  try {
    const token = await readSessionTokenFromCookie();
    if (token) {
      await revokeSession(token);
    }
    await clearSessionCookie();
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Logout error", error);
    return NextResponse.json({ error: "Failed to log out." }, { status: 500 });
  }
}
