import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { messages, orders } from "@/lib/db/schema";
import { and, eq, asc, ne } from "drizzle-orm";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ orderId: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { orderId } = await params;

  const [order] = await db
    .select({ clientId: orders.clientId, editorId: orders.editorId })
    .from(orders)
    .where(eq(orders.id, orderId))
    .limit(1);

  if (!order) return NextResponse.json({ error: "Order not found" }, { status: 404 });

  const userId = session.user.userId!;
  const editorId = session.user.editorId;
  const isClient = order.clientId === userId;
  const isEditor = editorId === order.editorId;
  const isStaff = ["admin", "staff_support", "staff_dispute"].includes(session.user.role ?? "");

  if (!isClient && !isEditor && !isStaff) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (!isStaff) {
    await db
      .update(messages)
      .set({ isRead: true })
      .where(
        and(
          eq(messages.orderId, orderId),
          ne(messages.senderId, userId),
          eq(messages.isRead, false)
        )
      );
  }

  const rows = await db
    .select()
    .from(messages)
    .where(eq(messages.orderId, orderId))
    .orderBy(asc(messages.createdAt));

  return NextResponse.json(rows);
}
