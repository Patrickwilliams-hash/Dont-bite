import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/guards";
import {
  DEMO_COOLDOWN_CODE,
  DEMO_COOLDOWN_MESSAGE,
  getDemoCooldownStatus,
} from "@/lib/drill/demo-cooldown";
import {
  DemoDrillCooldownError,
  DemoDrillInProgressError,
  sendSelfServiceDemoDrillAtomic,
} from "@/lib/drill/send-demo-drill";
import {
  DrillSendDeliveryError,
  DrillSendValidationError,
} from "@/lib/drill/send-drill";

export const dynamic = "force-dynamic";

const DEMO_SUCCESS_MESSAGE = "Your ParcelPath demo drill is on its way.";

const PRIVATE_NO_STORE = { "Cache-Control": "private, no-store" };

export async function GET() {
  try {
    const auth = await requireUser();
    if (!auth.ok) return auth.response;

    if (auth.user.role !== "user") {
      return NextResponse.json(
        { ok: false, error: "Demo drills are only available for training user accounts." },
        { status: 403, headers: PRIVATE_NO_STORE }
      );
    }

    const cooldown = await getDemoCooldownStatus(auth.user.id);
    if (!cooldown.canRequest) {
      return NextResponse.json(
        {
          ok: false,
          canRequest: false,
          code: DEMO_COOLDOWN_CODE,
          message: cooldown.message ?? DEMO_COOLDOWN_MESSAGE,
        },
        { status: 200, headers: PRIVATE_NO_STORE }
      );
    }

    return NextResponse.json(
      { ok: true, canRequest: true },
      { headers: PRIVATE_NO_STORE }
    );
  } catch (error) {
    console.error("Demo drill status error", error);
    return NextResponse.json(
      { error: "Failed to check demo drill availability." },
      { status: 500, headers: PRIVATE_NO_STORE }
    );
  }
}

export async function POST() {
  try {
    const auth = await requireUser();
    if (!auth.ok) return auth.response;

    try {
      await sendSelfServiceDemoDrillAtomic(auth.user.id);
      return NextResponse.json(
        {
          ok: true,
          message: DEMO_SUCCESS_MESSAGE,
        },
        { headers: PRIVATE_NO_STORE }
      );
    } catch (error) {
      if (error instanceof DemoDrillCooldownError) {
        return NextResponse.json(
          {
            ok: false,
            canRequest: false,
            code: DEMO_COOLDOWN_CODE,
            message: error.message,
          },
          { status: 429, headers: PRIVATE_NO_STORE }
        );
      }

      if (error instanceof DemoDrillInProgressError) {
        return NextResponse.json(
          { ok: false, error: error.message },
          { status: 409, headers: PRIVATE_NO_STORE }
        );
      }

      if (error instanceof DrillSendValidationError) {
        return NextResponse.json(
          { error: error.message },
          { status: 400, headers: PRIVATE_NO_STORE }
        );
      }

      if (error instanceof DrillSendDeliveryError) {
        return NextResponse.json(
          { error: error.message },
          { status: 502, headers: PRIVATE_NO_STORE }
        );
      }

      throw error;
    }
  } catch (error) {
    console.error("Demo drill send error", error);
    return NextResponse.json(
      { error: "Failed to send demo drill." },
      { status: 500, headers: PRIVATE_NO_STORE }
    );
  }
}