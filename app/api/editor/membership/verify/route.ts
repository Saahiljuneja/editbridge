import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { editors, membershipPayments } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";
import { verifySignature } from "@/lib/razorpay";
import { z } from "zod";

const verifySchema = z.object({
  razorpayOrderId: z.string().min(1),
  razorpayPaymentId: z.string().min(1),
  razorpaySignature: z.string().min(1),
});

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session || session.user?.role !== "editor") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [editor] = await db
    .select({ id: editors.id })
    .from(editors)
    .where(eq(editors.userId, session.user.userId!))
    .limit(1);

  if (!editor) {
    return NextResponse.json({ error: "Editor profile not found" }, { status: 404 });
  }

  const body = await req.json();
  const result = verifySchema.safeParse(body);
  if (!result.success) {
    return NextResponse.json({ error: "Invalid payment details" }, { status: 400 });
  }

  const { razorpayOrderId, razorpayPaymentId, razorpaySignature } = result.data;

  // Validate Razorpay signature
  const isValid = verifySignature(razorpayOrderId, razorpayPaymentId, razorpaySignature);
  if (!isValid) {
    return NextResponse.json({ error: "Signature verification failed" }, { status: 400 });
  }

  try {
    // Find the pending payment
    const [payment] = await db
      .select()
      .from(membershipPayments)
      .where(
        and(
          eq(membershipPayments.razorpayOrderId, razorpayOrderId),
          eq(membershipPayments.editorId, editor.id)
        )
      )
      .limit(1);

    if (!payment) {
      return NextResponse.json({ error: "Payment record not found" }, { status: 404 });
    }

    if (payment.status !== "pending") {
      return NextResponse.json({ error: "Payment already processed" }, { status: 409 });
    }

    // Determine the expiresAt timestamp
    const now = new Date();
    let finalExpiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    const [currentEditor] = await db
      .select({
        membershipTier: editors.membershipTier,
        membershipExpiresAt: editors.membershipExpiresAt,
      })
      .from(editors)
      .where(eq(editors.id, editor.id))
      .limit(1);

    if (
      currentEditor &&
      currentEditor.membershipTier === payment.tier &&
      currentEditor.membershipExpiresAt &&
      new Date(currentEditor.membershipExpiresAt) > now
    ) {
      finalExpiresAt = new Date(
        new Date(currentEditor.membershipExpiresAt).getTime() + 30 * 24 * 60 * 60 * 1000
      );
    }

    // Perform database updates in a transaction
    await db.transaction(async (tx) => {
      // 1. Update payment record
      await tx
        .update(membershipPayments)
        .set({
          status: "completed",
          razorpayPaymentId,
          expiresAt: finalExpiresAt,
        })
        .where(eq(membershipPayments.id, payment.id));

      // 2. Update editor membership
      await tx
        .update(editors)
        .set({
          membershipTier: payment.tier,
          membershipExpiresAt: finalExpiresAt,
        })
        .where(eq(editors.id, editor.id));
    });

    return NextResponse.json({
      success: true,
      tier: payment.tier,
      expiresAt: finalExpiresAt,
    });
  } catch (err) {
    console.error("[Membership Verification] Failed to verify payment:", err);
    return NextResponse.json({ error: "Failed to process membership transaction" }, { status: 500 });
  }
}
