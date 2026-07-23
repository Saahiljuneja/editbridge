import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { orders, editors, orderEvents, users } from "@/lib/db/schema";
import { and, eq, asc, ne } from "drizzle-orm";
import { displayNameFromFull } from "@/lib/utils";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const [order] = await db
    .select({ clientId: orders.clientId, editorUserId: editors.userId })
    .from(orders)
    .innerJoin(editors, eq(editors.id, orders.editorId))
    .where(eq(orders.id, id))
    .limit(1);

  if (!order) return NextResponse.json({ error: "Order not found" }, { status: 404 });

  const isClient = session.user.userId === order.clientId;
  const isEditor = session.user.userId === order.editorUserId;
  const isStaff = ["admin", "staff_support", "staff_dispute"].includes(session.user.role ?? "");
  if (!isClient && !isEditor && !isStaff) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const rows = await db
    .select({
      id: orderEvents.id,
      eventType: orderEvents.eventType,
      metadata: orderEvents.metadata,
      createdAt: orderEvents.createdAt,
      actorName: users.name,
    })
    .from(orderEvents)
    .leftJoin(users, eq(users.id, orderEvents.actorId))
    .where(
      isStaff
        ? eq(orderEvents.orderId, id)
        : and(eq(orderEvents.orderId, id), ne(orderEvents.eventType, "message_flagged"))
    )
    .orderBy(asc(orderEvents.createdAt));

  return NextResponse.json({
    events: rows.map((r) => ({
      ...r,
      actorName: r.actorName ? displayNameFromFull(r.actorName) : null,
    })),
  });
}
