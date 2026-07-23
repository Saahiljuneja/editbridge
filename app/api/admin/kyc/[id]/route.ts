import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { kycApplications, editors, users, notifications } from "@/lib/db/schema";
import { eq, sql } from "drizzle-orm";
import { notifyKycApproved, notifyKycRejected } from "@/lib/notifications";
import { onEditorProfileUpdated } from "@/lib/rewards";
import { assertPermission } from "@/lib/rbac";
import { logAction } from "@/lib/audit";
import { z } from "zod";
import type { UserRole } from "@/types";

const schema = z.object({
  action: z.enum(["approve", "reject", "expire"]),
  rejectionReason: z.string().min(10).max(500).optional(),
  adminNotes: z.string().max(1000).optional(),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  const deny = assertPermission(session?.user?.role, "kyc:review");
  if (!session || deny) return deny ?? NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await request.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { action, rejectionReason, adminNotes } = parsed.data;

  if (action === "reject" && !rejectionReason) {
    return NextResponse.json({ error: "Rejection reason is required" }, { status: 400 });
  }

  const [application] = await db
    .select({ id: kycApplications.id, editorId: kycApplications.editorId, status: kycApplications.status })
    .from(kycApplications)
    .where(eq(kycApplications.id, id))
    .limit(1);

  if (!application) return NextResponse.json({ error: "Application not found" }, { status: 404 });

  // Manual expire — works on approved applications only; bypasses the pending check
  if (action === "expire") {
    if (application.status !== "approved") {
      return NextResponse.json({ error: "Only approved KYC can be expired" }, { status: 409 });
    }
    await db.update(editors).set({ kycStatus: "expired", updatedAt: new Date() }).where(eq(editors.id, application.editorId));
    const [editorRow] = await db.select({ userId: editors.userId }).from(editors).where(eq(editors.id, application.editorId)).limit(1);
    if (editorRow) {
      await db.insert(notifications).values({
        userId: editorRow.userId,
        type: "kyc_rejected",
        title: "KYC verification expired",
        body: "Your identity verification has been marked as expired by our team. Please resubmit your documents to continue using the platform.",
        link: "/editor/kyc/resubmit",
      });
    }
    logAction({
      actorId: session.user.userId!,
      actorRole: session.user.role as UserRole,
      action: "kyc.expire",
      entityType: "kycApplication",
      entityId: id,
      metadata: { editorId: application.editorId },
    });
    return NextResponse.json({ success: true });
  }

  if (application.status !== "pending") {
    return NextResponse.json({ error: "Application already reviewed" }, { status: 409 });
  }

  const newStatus = action === "approve" ? "approved" : "rejected";

  await db
    .update(kycApplications)
    .set({
      status: newStatus,
      reviewedBy: session.user.userId!,
      reviewedAt: new Date(),
      rejectionReason: rejectionReason ?? null,
      adminNotes: adminNotes ?? null,
      updatedAt: new Date(),
    })
    .where(eq(kycApplications.id, id));

  await db
    .update(editors)
    .set({
      kycStatus: newStatus,
      kycRejectionReason: rejectionReason ?? null,
      kycApprovedAt: action === "approve" ? new Date() : null,
      // Increment rejection count on reject; reset to 0 on approval
      ...(action === "reject"
        ? { kycRejectionCount: sql`${editors.kycRejectionCount} + 1` }
        : { kycRejectionCount: 0 }),
      updatedAt: new Date(),
    })
    .where(eq(editors.id, application.editorId));

  // Send email notification to editor
  const [editor] = await db
    .select({ userId: editors.userId })
    .from(editors)
    .where(eq(editors.id, application.editorId))
    .limit(1);

  if (editor) {
    const [editorUser] = await db
      .select({ name: users.name, email: users.email })
      .from(users)
      .where(eq(users.id, editor.userId))
      .limit(1);

    if (editorUser) {
      if (action === "approve") {
        notifyKycApproved({ editorEmail: editorUser.email, editorName: editorUser.name ?? "" });
      } else {
        notifyKycRejected({
          editorEmail: editorUser.email,
          editorName: editorUser.name ?? "",
          reason: rejectionReason!,
        });
      }
    }
  }

  // Rewards: on KYC approval, check profile completion for profile_star badge
  if (action === "approve" && editor) {
    onEditorProfileUpdated(editor.userId, application.editorId).catch(() => {});
  }

  logAction({
    actorId: session.user.userId!,
    actorRole: session.user.role as UserRole,
    action: `kyc.${action}`,
    entityType: "kycApplication",
    entityId: id,
    metadata: { editorId: application.editorId, rejectionReason: rejectionReason ?? null },
  });

  return NextResponse.json({ success: true });
}
