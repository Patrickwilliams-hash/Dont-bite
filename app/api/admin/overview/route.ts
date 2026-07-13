import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth/guards";
import { hasAdminPermission } from "@/lib/auth/admin-permissions";

export async function GET() {
  try {
    const auth = await requireAdmin();
    if (!auth.ok) return auth.response;

    if (!hasAdminPermission(auth.user, "manage_users")) {
      return NextResponse.json({ canViewUserData: false });
    }

    const allUsers = await db.user.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        email: true,
        frequency: true,
        role: true,
        isActive: true,
        trainingActive: true,
        joinedAt: true,
        lastLoginAt: true,
        createdAt: true,
      },
    });

    const users = allUsers.filter((user) => user.role === "user");
    type TrainingUser = (typeof users)[number];

    const stats = {
      totalUsers: users.length,
      activeUsers: users.filter((u: TrainingUser) => u.isActive).length,
      weeklyUsers: users.filter((u: TrainingUser) => u.frequency === "weekly").length,
      fortnightlyUsers: users.filter((u: TrainingUser) => u.frequency === "fortnightly").length,
      monthlyUsers: users.filter((u: TrainingUser) => u.frequency === "monthly").length,
      usersLoggedIn: users.filter((u: TrainingUser) => u.lastLoginAt !== null).length,
    };

    return NextResponse.json({ canViewUserData: true, users, stats });
  } catch (error) {
    console.error("Admin overview error", error);
    return NextResponse.json({ error: "Failed to load admin data." }, { status: 500 });
  }
}
