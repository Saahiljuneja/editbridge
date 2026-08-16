import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { quoteRequests, orders, editors, users } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";
import { verifySignature } from "@/lib/razorpay";
import { createInAppNotification, notifyOrderPlacedEditor, editorWantsNotif } from "@/lib/notifications";
import { consumeCredits } from "@/lib/rewards";
import { getPlatformSettings, getClientProcessingFeeRate } from "@/lib/platform-settings";
import { getEditorCommissionRate } from "@/lib/membership";
import { z } from "zod";

const schema = z.object({
  razorpayOrderId: z.string().min(1),
  razorpayPaymentId: z.string().min(1),
  razorpaySignature: z.string().min(1),
  creditApplied: z.number().int().min(0).default(0),
});

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session || session.user?.role !== "client")
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const { razorpayOrderId, razorpayPaymentId, razorpaySignature, creditApplied } = parsed.data;

  const valid = verifySignature(razorpayOrderId, razorpayPaymentId, razorpaySignature);
  if (!valid) return NextResponse.json({ error: "Payment verification failed" }, { status: 400 });

  const [quote] = await db.select({
    id: quoteRequests.id,
    clientId: quoteRequests.clientId,
    editorId: quoteRequests.editorId,
    brief: quoteRequests.brief,
    videoType: quoteRequests.videoType,
    offeredPrice: quoteRequests.offeredPrice,
    status: quoteRequests.status,
    deadlinePreference: quoteRequests.deadlinePreference,
  })
    .from(quoteRequests)
    .where(and(eq(quoteRequests.id, id), eq(quoteRequests.clientId, session.user.userId!)))
    .limit(1);

  if (!quote || quote.status !== "offered" || !quote.offeredPrice)
    return NextResponse.json({ error: "Invalid quote state" }, { status: 409 });

  const processingFeePct = await getClientProcessingFeeRate(session.user.userId!);
  const commissionRatePct = await getEditorCommissionRate(quote.editorId);
  const PROCESSING_FEE = Math.round(quote.offeredPrice * (processingFeePct / 100));
  const commissionAmount = Math.round(quote.offeredPrice * (commissionRatePct / 100));
  const totalAmount = quote.offeredPrice + PROCESSING_FEE;

  // Deadline from preference
  const deadlineDays: Record<string, number> = { "1-3 days": 3, "1 week": 7, "2 weeks": 14, flexible: 14 };
  const days = deadlineDays[quote.deadlinePreference] ?? 14;
  const deadline = new Date(Date.now() + days * 24 * 60 * 60 * 1000);

  const [order] = await db.insert(orders).values({
    clientId: session.user.userId!,
    editorId: quote.editorId,
    packageId: null as unknown as string, // quote order — no package
    status: "pending",
    totalAmount,
    commissionAmount,
    processingFee: PROCESSING_FEE,
    creditApplied,
    brief: quote.brief,
    deadline,
    razorpayOrderId,
    razorpayPaymentId,
  }).returning({ id: orders.id });

  // Link order to quote
  await db.update(quoteRequests)
    .set({ status: "paid", orderId: order.id, updatedAt: new Date() })
    .where(eq(quoteRequests.id, id));

  if (creditApplied > 0) {
    await consumeCredits(session.user.userId!, creditApplied, order.id);
  }



  const [editor] = await db.select({ userId: editors.userId })
    .from(editors).where(eq(editors.id, quote.editorId)).limit(1);
  const [clientUser] = await db.select({ name: users.name })
    .from(users).where(eq(users.id, session.user.userId!)).limit(1);

  if (editor) {
    const [editorUser] = await db.select({ name: users.name, email: users.email })
      .from(users).where(eq(users.id, editor.userId)).limit(1);

    if (editorUser) {
      notifyOrderPlacedEditor({
        editorId: quote.editorId,
        editorEmail: editorUser.email,
        editorName: editorUser.name ?? "",
        clientName: clientUser?.name ?? "",
        packageTitle: `Custom ${quote.videoType} edit`,
        payout: quote.offeredPrice - commissionAmount,
        deadline,
        brief: quote.brief,
        orderId: order.id,
      });
      if (await editorWantsNotif(quote.editorId, "newOrder")) {
        createInAppNotification({
          userId: editor.userId,
          type: "new_order",
          title: "Quote accepted & paid",
          body: `${clientUser?.name ?? "A client"} accepted your quote and paid. Start working!`,
          link: `/editor/orders/${order.id}`,
        });
      }
    }
  }

  return NextResponse.json({ orderId: order.id }, { status: 201 });
}
