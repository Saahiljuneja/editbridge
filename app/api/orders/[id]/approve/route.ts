import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { orders, payouts, editors, users, packages } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { notifyOrderCompleted, notifyInvoiceReady } from "@/lib/notifications";
import { onEditorOrderCompleted, onClientOrderCompleted, onRepeatClientPair, getAvailableCredits, consumeCredits } from "@/lib/rewards";
import { maybeTriggerReferralReward } from "@/lib/referrals";
import { createOrderEvent } from "@/lib/order-events";
import { computeTdsForEditor } from "@/lib/tds";
import { persistEditorHealth } from "@/lib/health";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const [order] = await db
    .select({
      id: orders.id,
      clientId: orders.clientId,
      editorId: orders.editorId,
      status: orders.status,
      totalAmount: orders.totalAmount,
      commissionAmount: orders.commissionAmount,
      processingFee: orders.processingFee,
      razorpayPaymentId: orders.razorpayPaymentId,
      deadline: orders.deadline,
    })
    .from(orders)
    .where(eq(orders.id, id))
    .limit(1);

  if (!order) return NextResponse.json({ error: "Order not found" }, { status: 404 });
  if (order.clientId !== session.user.userId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (order.status !== "delivered") {
    return NextResponse.json({ error: "Can only approve a delivered order" }, { status: 409 });
  }

  // Net = total − processing fee − commission
  const packagePrice = order.totalAmount - (order.processingFee ?? 0);
  const preCommissionNet = packagePrice - order.commissionAmount;

  // Calculate TDS (Section 194J) — deducted from editor's share
  const { tdsAmount, tdsRatePct } = await computeTdsForEditor(order.editorId, preCommissionNet);
  const netAmount = preCommissionNet - tdsAmount;

  // Mark order completed
  await db
    .update(orders)
    .set({ status: "completed", completedAt: new Date(), updatedAt: new Date() })
    .where(eq(orders.id, id));

  createOrderEvent(id, session.user.userId!, "order_completed");

  // Payout scheduled for 7 days after approval
  const scheduledPayoutAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  await db
    .insert(payouts)
    .values({
      editorId: order.editorId,
      orderId: order.id,
      grossAmount: packagePrice,
      commissionAmount: order.commissionAmount,
      tdsAmount,
      tdsRatePct,
      netAmount,
      status: "pending",
      scheduledPayoutAt,
    });

  createOrderEvent(id, null, "payout_scheduled", { scheduledPayoutAt: scheduledPayoutAt.toISOString(), netAmount });

  // Fetch editor + package for notifications
  const [[editor], [pkg]] = await Promise.all([
    db.select({ userId: editors.userId }).from(editors).where(eq(editors.id, order.editorId)).limit(1),
    db.select({ title: packages.title }).from(packages).innerJoin(orders, eq(orders.packageId, packages.id)).where(eq(orders.id, id)).limit(1),
  ]);

  // Apply editor reward credits to this payout
  let bonusCredits = 0;
  if (editor?.userId) {
    const { total: editorCredits } = await getAvailableCredits(editor.userId);
    if (editorCredits > 0) {
      bonusCredits = editorCredits;
      await consumeCredits(editor.userId, editorCredits, id);
      // Add bonus to payout record
      await db.update(payouts).set({ bonusCredits, netAmount: netAmount + bonusCredits }).where(eq(payouts.orderId, id));
    }
  }

  // Rewards: fire-and-forget
  if (editor?.userId) {
    const deliveredBeforeDeadline = order.deadline ? new Date() < new Date(order.deadline) : false;
    onEditorOrderCompleted(editor.userId, order.editorId, id, deliveredBeforeDeadline).catch(() => {});
  }
  onClientOrderCompleted(order.clientId, id).catch(() => {});
  onRepeatClientPair(order.clientId, order.editorId).catch(() => {});
  maybeTriggerReferralReward(order.clientId, id).catch(() => {});

  // Notify editor of approval + scheduled payout date; also send invoice to both parties
  if (editor?.userId && pkg) {
    db.select({ name: users.name, email: users.email }).from(users).where(eq(users.id, editor.userId)).limit(1).then(async ([editorUser]) => {
      if (!editorUser) return;

      notifyOrderCompleted({
        editorEmail: editorUser.email,
        editorName: editorUser.name ?? "",
        clientName: session.user.name ?? "",
        packageTitle: pkg.title,
        payout: netAmount,
        orderId: id,
      });

      // Build invoice number (same formula as the PDF route)
      const invoiceSuffix = String(parseInt(id.replace(/-/g, "").slice(-8), 16) % 100000).padStart(4, "0");
      const invoiceYear = new Date().getFullYear();

      // Fetch client email for invoice notification
      const [clientUser] = await db.select({ email: users.email }).from(users).where(eq(users.id, order.clientId)).limit(1);

      notifyInvoiceReady({
        clientEmail: clientUser?.email ?? "",
        clientName: session.user.name ?? "",
        editorEmail: editorUser.email,
        editorName: editorUser.name ?? "",
        packageTitle: pkg.title,
        orderId: id,
        invoiceNumber: `EB-INV-${invoiceYear}-${invoiceSuffix}`,
        totalPaid: order.totalAmount,
      });
    }).catch(() => {});
  }

  // Recalculate health async (order completion affects quality and reliability categories)
  persistEditorHealth(order.editorId).catch(() => {});

  return NextResponse.json({ success: true });
}
