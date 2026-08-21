import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { orders, editors, users, packages } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";
import { createRefund } from "@/lib/razorpay";
import { notifyOrderCancelled } from "@/lib/notifications";
import { createOrderEvent } from "@/lib/order-events";
import { notifications } from "@/lib/db/schema";

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
      razorpayPaymentId: orders.razorpayPaymentId,
    })
    .from(orders)
    .where(eq(orders.id, id))
    .limit(1);

  if (!order) return NextResponse.json({ error: "Order not found" }, { status: 404 });

  const isClient = session.user.userId === order.clientId;
  let isEditor = false;
  if (session.user.role === "editor" && session.user.editorId) {
    isEditor = session.user.editorId === order.editorId;
  }

  if (!isClient && !isEditor) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Item 4: editors must use /decline for pending orders (keeps reason structured)
  if (isEditor && order.status === "pending") {
    return NextResponse.json(
      { error: "Pending orders must be declined via POST /api/orders/:id/decline" },
      { status: 405 }
    );
  }

  const cancelledBy = isClient ? "client" : "editor";
  const cancellationReason = isClient ? "CLIENT_CANCELLED" : "EDITOR_CANCELLED";
  const now = new Date();

  // Item 1: atomic guard — only succeeds if still pending (race condition prevention)
  const updated = await db
    .update(orders)
    .set({
      status: "cancelled",
      cancelledAt: now,
      cancellationReason,
      cancelledBy,
      updatedAt: now,
    })
    .where(and(eq(orders.id, id), eq(orders.status, "pending")))
    .returning({ id: orders.id });

  if (updated.length === 0) {
    return NextResponse.json(
      { error: "Only pending orders can be cancelled" },
      { status: 409 }
    );
  }

  createOrderEvent(id, session.user.userId!, "order_cancelled", { cancelledBy, reason: cancellationReason });

  // Attempt full Razorpay refund
  if (order.razorpayPaymentId) {
    try {
      await createRefund(order.razorpayPaymentId, order.totalAmount);
      await db.update(orders).set({ refundStatus: "initiated" }).where(eq(orders.id, id));
    } catch (err) {
      console.error("[cancel] refund failed for order", id, err);
      await db.update(orders).set({ refundStatus: "failed" }).where(eq(orders.id, id));
      createOrderEvent(id, null, "refund_failed", {
        triggeredBy: `${cancelledBy}_cancel`,
        error: String(err),
        razorpayPaymentId: order.razorpayPaymentId,
        amount: order.totalAmount,
      });
      // Alert admin for manual refund
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
          body: `Order ${id} was cancelled by ${cancelledBy} but the Razorpay refund failed. Initiate refund manually.`,
          link: `/admin/orders/${id}`,
        });
      }
    }
  }

  // Notify both parties
  const [editorRow] = await db.select({ userId: editors.userId }).from(editors).where(eq(editors.id, order.editorId)).limit(1);
  const [[clientUser], [editorUser], [pkg]] = await Promise.all([
    db.select({ name: users.name, email: users.email }).from(users).where(eq(users.id, order.clientId)).limit(1),
    editorRow ? db.select({ name: users.name, email: users.email }).from(users).where(eq(users.id, editorRow.userId)).limit(1) : Promise.resolve([undefined]),
    db.select({ title: packages.title }).from(packages).innerJoin(orders, eq(orders.packageId, packages.id)).where(eq(orders.id, id)).limit(1),
  ]);

  if (clientUser && editorUser && pkg) {
    notifyOrderCancelled({
      clientEmail: clientUser.email,
      clientName: clientUser.name ?? "",
      editorEmail: editorUser.email,
      editorName: editorUser.name ?? "",
      packageTitle: pkg.title,
      totalAmount: order.totalAmount,
      cancelledBy,
      orderId: id,
    });
  }

  return NextResponse.json({ success: true });
}
