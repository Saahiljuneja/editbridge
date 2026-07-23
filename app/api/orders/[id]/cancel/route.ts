import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { orders, editors, users, packages } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { createRefund } from "@/lib/razorpay";
import { notifyOrderCancelled } from "@/lib/notifications";
import { createOrderEvent } from "@/lib/order-events";

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
  if (order.status !== "pending") {
    return NextResponse.json(
      { error: "Only pending orders can be cancelled" },
      { status: 409 }
    );
  }

  await db
    .update(orders)
    .set({ status: "cancelled", updatedAt: new Date() })
    .where(eq(orders.id, id));

  createOrderEvent(id, session.user.userId!, "order_cancelled", { cancelledBy: isClient ? "client" : "editor" });

  // Attempt full Razorpay refund
  if (order.razorpayPaymentId) {
    try {
      await createRefund(order.razorpayPaymentId, order.totalAmount);
    } catch (err) {
      console.error("[cancel] refund failed for order", id, err);
      // Order is cancelled in DB — flag for manual refund by admin
      // Don't block the response; client will see cancelled status
    }
  }

  // Notify both parties (fire-and-forget)
  const cancelledBy = isClient ? "client" : "editor";
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
