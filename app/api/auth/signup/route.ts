import { NextResponse, after } from "next/server";
import { db } from "@/lib/db";
import type { DrillFrequency } from "@/lib/mock-store";
import { hash } from "bcryptjs";
import { getEmailConfig } from "@/lib/email/config";
import { sendEmail } from "@/lib/email/mailer";
import { buildWelcomeEmail } from "@/lib/email/templates/welcome-email";
import { getAuditRequestContext, recordAdminAuditLog } from "@/lib/audit/admin-audit";
import { AUDIT_ACTIONS } from "@/lib/audit/actions";

interface SignUpBody {
  name?: string;
  email?: string;
  password?: string;
  frequency?: string;
}

const ALLOWED_FREQUENCIES: DrillFrequency[] = ["weekly", "fortnightly", "monthly"];

async function sendWelcomeEmail(input: {
  userId: string;
  name: string;
  email: string;
  auditContext: ReturnType<typeof getAuditRequestContext>;
}) {
  try {
    const { appUrl } = getEmailConfig();
    const firstName = input.name.split(/\s+/)[0] ?? input.name;
    const emailContent = buildWelcomeEmail(firstName, `${appUrl}/dashboard`);

    await sendEmail({
      to: input.email,
      subject: emailContent.subject,
      text: emailContent.text,
      html: emailContent.html,
    });

    try {
      await recordAdminAuditLog({
        actorUserId: input.userId,
        action: AUDIT_ACTIONS.WELCOME_EMAIL_SENT,
        targetType: "user",
        targetId: input.userId,
        targetLabel: input.email,
        metadata: { channel: "signup" },
        context: input.auditContext,
      });
    } catch (auditError) {
      console.error("Welcome email audit log failed", auditError);
    }
  } catch (error) {
    // Account creation must succeed even when the welcome email cannot be delivered.
    console.error("Welcome email delivery failed", {
      userId: input.userId,
      error: error instanceof Error ? error.name : "unknown",
    });
  }
}

export async function POST(req: Request) {
  try {
    const auditContext = getAuditRequestContext(req);
    const body = (await req.json()) as SignUpBody;
    const name = body.name?.trim() ?? "";
    const email = body.email?.trim().toLowerCase() ?? "";
    const password = body.password ?? "";
    const frequency = body.frequency as DrillFrequency;

    if (!name || !email || !ALLOWED_FREQUENCIES.includes(frequency) || password.length < 8) {
      return NextResponse.json(
        { error: "Missing fields or password is too short (min 8 chars)." },
        { status: 400 }
      );
    }

    const existing = await db.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json(
        { error: "An account with that email already exists." },
        { status: 409 }
      );
    }

    const passwordHash = await hash(password, 12);

    const user = await db.user.create({
      data: { name, email, frequency, passwordHash, role: "user", isActive: true },
      select: {
        id: true,
        name: true,
        email: true,
        frequency: true,
        joinedAt: true,
        trainingActive: true,
      },
    });

    // Deliver after the response so signup isn't blocked, while `after()` keeps
    // the serverless function alive until the send finishes.
    after(() =>
      sendWelcomeEmail({ userId: user.id, name: user.name, email: user.email, auditContext })
    );

    return NextResponse.json(
      {
        user: {
          name: user.name,
          email: user.email,
          frequency: user.frequency,
          joinedAt: user.joinedAt,
          trainingActive: user.trainingActive,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Signup error", error);
    return NextResponse.json({ error: "Failed to create account." }, { status: 500 });
  }
}
