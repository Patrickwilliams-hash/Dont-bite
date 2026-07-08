import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  try {
    const users = await db.user.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        email: true,
        frequency: true,
        role: true,
        isActive: true,
        joinedAt: true,
        lastLoginAt: true,
        createdAt: true,
      },
    });
    type AdminUser = (typeof users)[number];

    const stats = {
      totalUsers: users.length,
      activeUsers: users.filter((u: AdminUser) => u.isActive).length,
      weeklyUsers: users.filter((u: AdminUser) => u.frequency === "weekly").length,
      fortnightlyUsers: users.filter((u: AdminUser) => u.frequency === "fortnightly").length,
      monthlyUsers: users.filter((u: AdminUser) => u.frequency === "monthly").length,
      usersLoggedIn: users.filter((u: AdminUser) => u.lastLoginAt !== null).length,
    };

    return NextResponse.json({ users, stats });
  } catch (error) {
    console.error("Admin overview error", error);
    return NextResponse.json({ error: "Failed to load admin data." }, { status: 500 });
  }
}
