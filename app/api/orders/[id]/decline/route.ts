import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { orders, editors, notifications, users, packages } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { createRefund } from "@/lib/razorpay";
import { createOrderEvent } from "@/lib/order-events";
import { persistEditorHealth } from "@/lib/health";

const DECLINE_REASONS = [
  "I'm unavailable",
  "Deadline doesn't work",
  "Project isn't a good fit",
  "Price doesn't work for me",
  "Client requirements are unclear",
  "Other",
] as const;

const schema = z.object({
  reason: z.enum(DECLINE_REASONS),
  note: z.string().max(500).optional(),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session || session.user.role !== "editor") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = await request.json().catch(() => ({}));
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const { reason, note } = parsed.data;

  const [order] = await db
    .select({
      id: orders.id,
      status: orders.status,
      editorId: orders.editorId,
      clientId: orders.clientId,
      totalAmount: orders.totalAmount,
      razorpayPaymentId: orders.razorpayPaymentId,
    })
    .from(orders)
    .where(eq(orders.id, id))
    .limit(1);

  if (!order) return NextResponse.json({ error: "Order not found" }, { status: 404 });
  if (order.status !== "pending") {
    return NextResponse.json({ error: "Only pending orders can be declined" }, { status: 409 });
  }

  const [editorRow] = await db
    .select({ id: editors.id, userId: editors.userId })
    .from(editors)
    .where(and(eq(editors.id, order.editorId), eq(editors.userId, session.user.userId!)))
    .limit(1);

  if (!editorRow) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const now = new Date();

  // Atomic update: only succeeds if still pending (guard against simultaneous cron cancel)
  const updated = await db
    .update(orders)
    .set({
      status: "cancelled",
      cancelledAt: now,
      cancellationReason: "EDITOR_DECLINED",
      cancelledBy: "editor",
      updatedAt: now,
    })
    .where(and(eq(orders.id, id), eq(orders.status, "pending")))
    .returning({ id: orders.id });

  if (updated.length === 0) {
    return NextResponse.json({ error: "Order is no longer available to decline" }, { status: 409 });
  }

  createOrderEvent(id, session.user.userId!, "order_declined", {
    reason,
    ...(note ? { note } : {}),
  });

  // Initiate full refund
  if (order.razorpayPaymentId) {
    try {
      await createRefund(order.razorpayPaymentId, order.totalAmount);
    } catch (err) {
      console.error("[decline] refund failed for order", id, err);
      createOrderEvent(id, null, "refund_failed", {
        triggeredBy: "editor_decline",
        error: String(err),
        razorpayPaymentId: order.razorpayPaymentId,
        amount: order.totalAmount,
      });
      // Notify admin
      const [adminUser] = await db
        .select({ id: users.id })
        .from(users)
        .where(eq(users.role, "admin"))
        .limit(1);
      if (adminUser) {
        await db.insert(notifications).values({
          userId: adminUser.id,
          type: "order_cancelled",
          title: "Refund failed — manual action required",
          body: `Order ${id} was declined by editor but the Razorpay refund failed. Initiate refund manually.`,
          link: `/admin/orders/${id}`,
        });
      }
    }
  }

  // Notify client — do not expose the internal reason
  await db.insert(notifications).values({
    userId: order.clientId,
    type: "order_cancelled",
    title: "Order cancelled",
    body: "The editor was unable to take on your project. Your refund has been initiated and should arrive within 5–7 business days.",
    link: `/orders/${id}`,
  });

  // Recalculate health async (decline affects acceptance rate)
  persistEditorHealth(editorRow.id).catch(() => {});

  return NextResponse.json({ ok: true });
}
