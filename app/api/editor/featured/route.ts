import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { editors, featuredPayments } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { createOrder, verifySignature } from "@/lib/razorpay";
import { isFeatureEnabled } from "@/lib/feature-flags";
import { z } from "zod";
import { revalidatePublicPagesCache } from "@/lib/revalidate";

const DURATION_PRICING: Record<number, number> = {
  7: 99900,
  14: 179900,
  30: 299900,
};

export async function GET() {
  const session = await auth();
  if (!session || session.user.role !== "editor" || !session.user.editorId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [editor] = await db
    .select({ isFeatured: editors.isFeatured, featuredUntil: editors.featuredUntil })
    .from(editors)
    .where(eq(editors.id, session.user.editorId))
    .limit(1);

  if (!editor) return NextResponse.json({ error: "Editor not found" }, { status: 404 });

  const isCurrentlyFeatured = editor.isFeatured && !!editor.featuredUntil && editor.featuredUntil > new Date();
  const daysRemaining = isCurrentlyFeatured
    ? Math.max(0, Math.ceil((editor.featuredUntil!.getTime() - Date.now()) / (24 * 60 * 60 * 1000)))
    : 0;

  return NextResponse.json({
    isFeatured: isCurrentlyFeatured,
    featuredUntil: isCurrentlyFeatured ? editor.featuredUntil : null,
    daysRemaining,
    featureEnabled: await isFeatureEnabled("featured_placement"),
  });
}

const initiateSchema = z.object({
  durationDays: z.union([z.literal(7), z.literal(14), z.literal(30)]),
});

const verifySchema = z.object({
  durationDays: z.union([z.literal(7), z.literal(14), z.literal(30)]),
  razorpayOrderId: z.string().min(1),
  razorpayPaymentId: z.string().min(1),
  razorpaySignature: z.string().min(1),
});

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session || session.user.role !== "editor" || !session.user.editorId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();

  // Phase 2: payment already completed by Razorpay checkout — verify + activate.
  // Not gated by the feature flag: money has already changed hands via Razorpay,
  // so this must always finish and record it, even if the flag was flipped off
  // mid-checkout — the alternative is charging the editor and giving nothing back.
  if ("razorpaySignature" in body) {
    const parsed = verifySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }
    const { durationDays, razorpayOrderId, razorpayPaymentId, razorpaySignature } = parsed.data;

    const valid = verifySignature(razorpayOrderId, razorpayPaymentId, razorpaySignature);
    if (!valid) {
      return NextResponse.json({ error: "Payment verification failed" }, { status: 400 });
    }

    const amountPaid = DURATION_PRICING[durationDays];
    const featuredFrom = new Date();
    const featuredUntil = new Date(featuredFrom.getTime() + durationDays * 24 * 60 * 60 * 1000);

    await db.insert(featuredPayments).values({
      editorId: session.user.editorId,
      durationDays,
      amountPaid,
      razorpayPaymentId,
      featuredFrom,
      featuredUntil,
    });

    await db
      .update(editors)
      .set({ isFeatured: true, featuredUntil, updatedAt: new Date() })
      .where(eq(editors.id, session.user.editorId));

    revalidatePublicPagesCache();
    return NextResponse.json({ success: true, featuredUntil });
  }

  // Phase 1: create the Razorpay order for the selected duration.
  if (!(await isFeatureEnabled("featured_placement"))) {
    return NextResponse.json({ error: "Featured placement is temporarily unavailable." }, { status: 403 });
  }

  const parsed = initiateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const { durationDays } = parsed.data;
  const amount = DURATION_PRICING[durationDays];
  const receipt = `feat-${session.user.editorId.slice(0, 8)}-${Date.now()}`;
  const rzpOrder = await createOrder(amount, "INR", receipt);

  return NextResponse.json({
    razorpayOrderId: rzpOrder.id,
    key: process.env.RAZORPAY_KEY_ID,
    amount,
    durationDays,
  });
}
