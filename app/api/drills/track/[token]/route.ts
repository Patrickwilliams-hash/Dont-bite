import { NextResponse } from "next/server";
import { markDrillCaught } from "@/lib/drills/service";
import { getDrill } from "@/lib/drills/catalog";

export async function GET(
  req: Request,
  context: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await context.params;
    const send = await markDrillCaught(token);

    if (!send) {
      return NextResponse.redirect(new URL("/dashboard/history", req.url));
    }

    const template = getDrill(send.templateId);
    const destination = template
      ? `/caught/${template.id}?send=${send.id}`
      : "/dashboard/history";

    return NextResponse.redirect(new URL(destination, req.url));
  } catch (error) {
    console.error("Track drill error", error);
    return NextResponse.redirect(new URL("/dashboard/history", req.url));
  }
}
