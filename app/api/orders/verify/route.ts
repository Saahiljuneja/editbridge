import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { packages, editors, orders, users, clientBlocks, preOrderQuestions } from "@/lib/db/schema";
import { and, eq, isNull } from "drizzle-orm";
import { verifySignature } from "@/lib/razorpay";
import { notifyOrderPlacedClient, notifyOrderPlacedEditor, createInAppNotification, editorWantsNotif } from "@/lib/notifications";
import { onClientOrderPlaced, onRepeatClientPair, consumeCredits } from "@/lib/rewards";
import { maybeTriggerReferralReward } from "@/lib/referrals";
import { getPlatformSettings } from "@/lib/platform-settings";
import { generateBriefText } from "@/lib/brief";
import { createOrderEvent } from "@/lib/order-events";
import { z } from "zod";

const briefDataSchema = z.object({
  mood: z.array(z.string()).min(1),
  musicPreference: z.string().min(1),
  colorLook: z.string().optional(),
  referenceUrls: z.array(z.string()).max(5).default([]),
  mustInclude: z.string().max(500).default(""),
  mustAvoid: z.string().max(500).default(""),
  additionalNotes: z.string().max(1000).default(""),
});

const verifySchema = z.object({
  razorpayOrderId: z.string().min(1),
  razorpayPaymentId: z.string().min(1),
  razorpaySignature: z.string().min(1),
  packageId: z.string().uuid(),
  briefData: briefDataSchema,
  creditApplied: z.number().int().min(0).default(0),
  rewardDiscountAmount: z.number().int().min(0).default(0),
});

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const parsed = verifySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const {
    razorpayOrderId,
    razorpayPaymentId,
    razorpaySignature,
    packageId,
    briefData,
    creditApplied,
    rewardDiscountAmount,
  } = parsed.data;

  const brief = generateBriefText(briefData);

  const valid = verifySignature(razorpayOrderId, razorpayPaymentId, razorpaySignature);
  if (!valid) {
    return NextResponse.json({ error: "Payment verification failed" }, { status: 400 });
  }

  const [pkg] = await db
    .select({
      id: packages.id,
      title: packages.title,
      price: packages.price,
      deliveryDays: packages.deliveryDays,
      editorId: packages.editorId,
      isActive: packages.isActive,
    })
    .from(packages)
    .where(and(eq(packages.id, packageId), eq(packages.isActive, true)))
    .limit(1);

  if (!pkg) {
    return NextResponse.json({ error: "Package not found" }, { status: 404 });
  }

  const [editor] = await db
    .select({ id: editors.id, userId: editors.userId })
    .from(editors)
    .where(eq(editors.id, pkg.editorId))
    .limit(1);

  if (!editor) {
    return NextResponse.json({ error: "Editor not found" }, { status: 404 });
  }

  // Defense-in-depth: re-check the block here too, in case it was created
  // between the /api/orders pricing call and this payment-verification call.
  const [blocked] = await db
    .select({ id: clientBlocks.id })
    .from(clientBlocks)
    .where(and(eq(clientBlocks.editorId, editor.id), eq(clientBlocks.clientId, session.user.userId!)))
    .limit(1);

  if (blocked) {
    return NextResponse.json({ error: "This editor is not accepting new orders at this time" }, { status: 403 });
  }

  const { commissionRatePct, processingFeePct } = await getPlatformSettings();
  const PROCESSING_FEE = Math.round(pkg.price * (processingFeePct / 100));
  // Clamp discount: cannot exceed package price, and must not be negative
  const discount = Math.max(0, Math.min(rewardDiscountAmount, pkg.price));
  const discountedPrice = pkg.price - discount;
  // Commission absorbs the client discount so the editor always receives pkg.price × (1 - commissionRate)
  const fullCommission = Math.round(pkg.price * (commissionRatePct / 100));
  const commissionAmount = Math.max(0, fullCommission - discount);
  const deadline = new Date(Date.now() + pkg.deliveryDays * 24 * 60 * 60 * 1000);

  const [order] = await db
    .insert(orders)
    .values({
      clientId: session.user.userId!,
      editorId: editor.id,
      packageId: pkg.id,
      status: "pending",
      totalAmount: discountedPrice + PROCESSING_FEE, // client-paid amount
      commissionAmount,
      processingFee: PROCESSING_FEE,
      creditApplied,
      rewardDiscountAmount: discount,
      brief,
      briefData,
      deadline,
      razorpayOrderId,
      razorpayPaymentId,
    })
    .returning({ id: orders.id });

  createOrderEvent(order.id, session.user.userId!, "order_placed", { packageTitle: pkg.title });

  // Best-effort: link any of this client's still-unconverted pre-order questions
  // with this editor to the new order, for conversion analytics.
  db.update(preOrderQuestions)
    .set({ convertedOrderId: order.id })
    .where(and(
      eq(preOrderQuestions.clientId, session.user.userId!),
      eq(preOrderQuestions.editorId, editor.id),
      isNull(preOrderQuestions.convertedOrderId)
    ))
    .catch((err) => console.error("[pre-order-qa] convertedOrderId backfill failed", err));

  // Consume client credits (must happen before rewards so count is accurate)
  if (creditApplied > 0) {
    await consumeCredits(session.user.userId!, creditApplied, order.id);
  }

  // Rewards (fire-and-forget)
  onClientOrderPlaced(session.user.userId!, order.id).catch(() => {});
  onRepeatClientPair(session.user.userId!, editor.id).catch(() => {});
  maybeTriggerReferralReward(session.user.userId!, order.id).catch(() => {});

  // Fetch names + emails for notifications (fire-and-forget)
  const [clientUser, editorUser] = await Promise.all([
    db.select({ name: users.name, email: users.email }).from(users).where(eq(users.id, session.user.userId!)).limit(1).then((r) => r[0]),
    db.select({ name: users.name, email: users.email }).from(users).where(eq(users.id, editor.userId)).limit(1).then((r) => r[0]),
  ]);

  if (clientUser) {
    notifyOrderPlacedClient({
      clientEmail: clientUser.email,
      clientName: clientUser.name ?? "",
      editorName: editorUser?.name ?? "",
      packageTitle: pkg.title,
      totalAmount: discountedPrice + PROCESSING_FEE,
      orderId: order.id,
    });
  }

  if (editorUser) {
    notifyOrderPlacedEditor({
      editorId: editor.id,
      editorEmail: editorUser.email,
      editorName: editorUser.name ?? "",
      clientName: clientUser?.name ?? "",
      packageTitle: pkg.title,
      payout: discountedPrice - commissionAmount,
      deadline,
      brief,
      orderId: order.id,
    });
    if (await editorWantsNotif(editor.id, "newOrder")) {
      createInAppNotification({
        userId: editor.userId,
        type: "new_order",
        title: `New order: ${pkg.title}`,
        body: `You have a new order from ${clientUser?.name ?? "a client"}.`,
        link: `/editor/orders/${order.id}`,
      });
    }
  }

  return NextResponse.json({ orderId: order.id }, { status: 201 });
}
