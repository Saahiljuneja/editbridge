import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { users, editors, kycApplications, auditLogs } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { sendEmail } from "@/lib/resend";
import { createElement } from "react";
import { KycApproved } from "@/emails/kyc-approved";
import { KycRejected } from "@/emails/kyc-rejected";
import { displayNameFromFull } from "@/lib/utils";
import type { UserRole } from "@/types";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://editbridge.in";

const ALLOWED: UserRole[] = ["admin", "staff_kyc", "staff_support"];

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session || !ALLOWED.includes(session.user.role as UserRole))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  const body = await req.json();
  const { type, reason, subject, message } = body as {
    type: string;
    reason?: string;
    subject?: string;
    message?: string;
  };

  const [user] = await db
    .select({ id: users.id, email: users.email, name: users.name, role: users.role })
    .from(users)
    .where(eq(users.id, id))
    .limit(1);

  if (!user) return NextResponse.json({ error: "User not found." }, { status: 404 });

  try {
    if (type === "kyc_approved") {
      const [editor] = await db.select().from(editors).where(eq(editors.userId, id)).limit(1);
      if (!editor) return NextResponse.json({ error: "No editor profile." }, { status: 400 });

      await sendEmail({
        to: user.email!,
        subject: "KYC approved — you're live on EditBridge!",
        react: createElement(KycApproved, {
          editorName: displayNameFromFull(user.name ?? "Editor"),
          appUrl: APP_URL,
        }),
      });
    } else if (type === "kyc_rejected") {
      if (!reason) return NextResponse.json({ error: "Rejection reason required." }, { status: 400 });

      await sendEmail({
        to: user.email!,
        subject: "Action required — KYC resubmission needed",
        react: createElement(KycRejected, {
          editorName: displayNameFromFull(user.name ?? "Editor"),
          reason,
          appUrl: APP_URL,
        }),
      });
    } else if (type === "custom") {
      if (!subject || !message)
        return NextResponse.json({ error: "Subject and message required." }, { status: 400 });

      await sendEmail({
        to: user.email!,
        subject,
        react: createElement("div", null,
          createElement("p", null, `Hi ${displayNameFromFull(user.name ?? "there")},`),
          createElement("p", null, message),
          createElement("p", null, "— EditBridge Team")
        ),
      });
    } else {
      return NextResponse.json({ error: "Unknown email type." }, { status: 400 });
    }

    await db.insert(auditLogs).values({
      actorId: session.user.userId,
      actorRole: session.user.role as UserRole,
      action: `email.manual.${type}`,
      entityType: "user",
      entityId: id,
      metadata: { to: user.email, type, reason },
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[send-email]", err);
    return NextResponse.json({ error: "Failed to send email." }, { status: 500 });
  }
}
