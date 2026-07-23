import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { quoteRequests, editors, orders } from "@/lib/db/schema";
import { and, eq, sql } from "drizzle-orm";
import { createOrder } from "@/lib/razorpay";
import { getAvailableCredits } from "@/lib/rewards";
import { getPlatformSettings } from "@/lib/platform-settings";

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session || session.user?.role !== "client")
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const [quote] = await db.select({
    id: quoteRequests.id,
    status: quoteRequests.status,
    offeredPrice: quoteRequests.offeredPrice,
    editorId: quoteRequests.editorId,
    brief: quoteRequests.brief,
    expiresAt: quoteRequests.expiresAt,
  })
    .from(quoteRequests)
    .where(and(eq(quoteRequests.id, id), eq(quoteRequests.clientId, session.user.userId!)))
    .limit(1);

  if (!quote) return NextResponse.json({ error: "Quote not found" }, { status: 404 });
  if (quote.status !== "offered") return NextResponse.json({ error: "No offer to pay for" }, { status: 409 });
  if (!quote.offeredPrice) return NextResponse.json({ error: "No price set" }, { status: 409 });
  if (new Date() > quote.expiresAt) return NextResponse.json({ error: "Quote expired" }, { status: 410 });

  // Enforce editor capacity cap before charging
  const [editorRow] = await db
    .select({ maxActiveOrders: editors.maxActiveOrders })
    .from(editors)
    .where(eq(editors.id, quote.editorId))
    .limit(1);

  if (editorRow?.maxActiveOrders !== null && editorRow?.maxActiveOrders !== undefined) {
    const [{ count }] = await db
      .select({ count: sql<number>`COUNT(*)::int` })
      .from(orders)
      .where(and(
        eq(orders.editorId, quote.editorId),
        sql`${orders.status} IN ('pending','in_progress','delivered','revision_requested','disputed')`
      ));
    if (count >= editorRow.maxActiveOrders) {
      return NextResponse.json({ error: "Editor is not accepting new orders right now" }, { status: 409 });
    }
  }

  const { processingFeePct } = await getPlatformSettings();
  const PROCESSING_FEE = Math.round(quote.offeredPrice * (processingFeePct / 100));
  const totalAmount = quote.offeredPrice + PROCESSING_FEE;

  const { total: availableCredits } = await getAvailableCredits(session.user.userId!);
  const creditApplied = Math.min(availableCredits, totalAmount);
  const amountToCharge = Math.max(0, totalAmount - creditApplied);

  const razorpayOrder = await createOrder(amountToCharge, "INR", `quote_${quote.id}`);

  return NextResponse.json({
    razorpayOrderId: razorpayOrder.id,
    amount: amountToCharge,
    totalAmount,
    processingFee: PROCESSING_FEE,
    offeredPrice: quote.offeredPrice,
    creditApplied,
  });
}
