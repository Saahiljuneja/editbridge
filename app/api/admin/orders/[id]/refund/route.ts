import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { orders, userCredits, payouts } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { logAction } from "@/lib/audit";
import type { UserRole } from "@/types";

const ALLOWED: UserRole[] = ["admin"];

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session || !ALLOWED.includes(session.user.role as UserRole)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;

  const [order] = await db.select().from(orders).where(eq(orders.id, id)).limit(1);
  if (!order) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }

  if (order.status === "cancelled") {
    return NextResponse.json({ error: "Order is already cancelled / refunded." }, { status: 400 });
  }

  // 1. Update order status to cancelled
  await db
    .update(orders)
    .set({ status: "cancelled", updatedAt: new Date() })
    .where(eq(orders.id, id));

  // 2. Refund credits spent by client
  if (order.creditApplied > 0) {
    await db.insert(userCredits).values({
      userId: order.clientId,
      amount: order.creditApplied,
      reason: `Refund of credits for Order #${order.id.slice(0, 8)}`,
    });
  }

  // 3. Refund cash/card payments back to client wallet credits (store credit refund)
  const cashPaid = order.totalAmount - order.creditApplied;
  if (cashPaid > 0) {
    await db.insert(userCredits).values({
      userId: order.clientId,
      amount: cashPaid,
      reason: `Refund of payment for Order #${order.id.slice(0, 8)}`,
    });
  }

  // 4. Cancel/delete pending payouts for the editor
  await db
    .delete(payouts)
    .where(and(eq(payouts.orderId, id), eq(payouts.status, "pending")));

  logAction({
    actorId: session.user.userId!,
    actorRole: session.user.role as UserRole,
    action: "order.admin_refund",
    entityType: "order",
    entityId: id,
    metadata: { clientId: order.clientId, totalAmount: order.totalAmount, creditApplied: order.creditApplied, cashPaid },
  });

  return NextResponse.json({ ok: true });
}
