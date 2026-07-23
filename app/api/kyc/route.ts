import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { editors, kycApplications, notifications, users } from "@/lib/db/schema";
import { eq, and, ne, count, sql } from "drizzle-orm";
import { submitKycSchema } from "@/lib/validations";
import { sendEmail } from "@/lib/resend";
import { createElement } from "react";
import { KycAdminAlert } from "@/emails/kyc-admin-alert";

const MAX_REJECTIONS = 3;

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session || session.user?.role !== "editor") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const parsed = submitKycSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { documentType, documentNumber, documentUrl, documentBackUrl, panNumber, panDocumentUrl, selfieUrl } = parsed.data;

  const [editor] = await db
    .select({ id: editors.id, kycRejectionCount: editors.kycRejectionCount })
    .from(editors)
    .where(eq(editors.userId, session.user.userId!))
    .limit(1);

  if (!editor) {
    return NextResponse.json({ error: "Editor record not found" }, { status: 404 });
  }

  // Block after too many rejections
  if (editor.kycRejectionCount >= MAX_REJECTIONS) {
    return NextResponse.json(
      { error: `Your account has been flagged after ${MAX_REJECTIONS} failed KYC attempts. Please contact support@editbridge.in to continue.` },
      { status: 403 }
    );
  }

  // Duplicate PAN check — reject if another editor already has this PAN
  const [duplicatePan] = await db
    .select({ id: editors.id })
    .from(editors)
    .where(and(eq(editors.panNumber, panNumber), ne(editors.id, editor.id)))
    .limit(1);

  if (duplicatePan) {
    return NextResponse.json(
      { error: "This PAN number is already registered with another account. Contact support if you believe this is an error." },
      { status: 409 }
    );
  }

  // Get submission number (count of existing submissions + 1)
  const [countRow] = await db
    .select({ total: count() })
    .from(kycApplications)
    .where(eq(kycApplications.editorId, editor.id));
  const submissionNumber = (countRow?.total ?? 0) + 1;

  // Always INSERT — preserves full history
  await db.insert(kycApplications).values({
    editorId: editor.id,
    documentType,
    documentNumber: documentNumber ?? null,
    documentUrl,
    documentBackUrl: documentBackUrl ?? null,
    panDocumentUrl,
    selfieUrl,
    submissionNumber,
    status: "pending",
  });

  // Save PAN number to editor profile for TDS calculations
  await db
    .update(editors)
    .set({ kycStatus: "pending", panNumber, updatedAt: new Date() })
    .where(eq(editors.id, editor.id));

  // In-app notification to all admin + staff_kyc users
  const adminUsers = await db
    .select({ id: users.id })
    .from(users)
    .where(sql`${users.role} IN ('admin', 'staff_kyc')`);

  if (adminUsers.length > 0) {
    await db.insert(notifications).values(
      adminUsers.map((u) => ({
        userId: u.id,
        type: "kyc_submitted",
        title: "New KYC submission",
        body: `${session.user.name ?? session.user.email} submitted a new KYC application (submission #${submissionNumber}).`,
        link: "/admin/kyc",
      }))
    );
  }

  // Email admin (fire-and-forget)
  const adminEmail = process.env.ADMIN_EMAIL;
  if (adminEmail) {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://editbridge.in";
    sendEmail({
      to: adminEmail,
      subject: `[Admin] New KYC submission — ${session.user.name ?? session.user.email}`,
      react: createElement(KycAdminAlert, {
        editorName: session.user.name ?? "Unknown",
        editorEmail: session.user.email ?? "",
        documentType,
        appUrl,
      }),
    }).catch(() => {});
  }

  return NextResponse.json({ success: true }, { status: 201 });
}
