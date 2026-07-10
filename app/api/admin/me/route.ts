import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/guards";
import {
  adminTierLabel,
  summarizeAdminPermissions,
  getAdminAccessFlags,
} from "@/lib/auth/admin-permissions";

export async function GET() {
  try {
    const auth = await requireAdmin();
    if (!auth.ok) return auth.response;

    const access = getAdminAccessFlags(auth.user);

    return NextResponse.json({
      administrator: {
        name: auth.user.name,
        email: auth.user.email,
        adminTier: auth.user.adminTier,
        adminTierLabel: adminTierLabel(auth.user.adminTier),
        permissions: auth.user.adminPermissions,
        permissionsSummary: summarizeAdminPermissions(auth.user),
      },
      access,
    });
  } catch (error) {
    console.error("Admin me error", error);
    return NextResponse.json({ error: "Failed to load administrator profile." }, { status: 500 });
  }
}
