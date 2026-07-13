import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdminPermission } from "@/lib/auth/guards";

export async function GET(req: Request) {
  try {
    const auth = await requireAdminPermission("manage_drills");
    if (!auth.ok) return auth.response;

    const url = new URL(req.url);
    const query = url.searchParams.get("q")?.trim() ?? "";

    if (query.length < 2) {
      return NextResponse.json({ users: [] });
    }

    const users = await db.user.findMany({
      where: {
        role: "user",
        isActive: true,
        trainingActive: true,
        OR: [
          { name: { contains: query, mode: "insensitive" } },
          { email: { contains: query, mode: "insensitive" } },
        ],
      },
      orderBy: { name: "asc" },
      take: 10,
      select: {
        id: true,
        name: true,
        email: true,
        frequency: true,
        trainingActive: true,
      },
    });

    return NextResponse.json({ users });
  } catch (error) {
    console.error("Eligible drill user search error", error);
    return NextResponse.json({ error: "Failed to search eligible users." }, { status: 500 });
  }
}
