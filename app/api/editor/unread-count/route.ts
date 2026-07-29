import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { messages, orders, notifications } from "@/lib/db/schema";
import { and, eq, ne, sql } from "drizzle-orm";

export async function GET() {
  const session = await auth();
  if (!session || session.user.role !== "editor" || !session.user.editorId)
    return NextResponse.json({ count: 0, notifications: 0 });

  const [msgRow, notifRow] = await Promise.all([
    db
      .select({ count: sql<number>`COUNT(*)::int` })
      .from(messages)
      .innerJoin(orders, eq(messages.orderId, orders.id))
      .where(
        and(
          eq(orders.editorId, session.user.editorId),
          ne(messages.senderId, session.user.userId!),
          eq(messages.isRead, false),
          eq(messages.isBlocked, false)
        )
      )
      .then((r) => r[0]),

    db
      .select({ count: sql<number>`COUNT(*)::int` })
      .from(notifications)
      .where(and(eq(notifications.userId, session.user.userId!), eq(notifications.isRead, false)))
      .then((r) => r[0]),
  ]);

  return NextResponse.json({
    count: msgRow?.count ?? 0,
    notifications: notifRow?.count ?? 0,
  });
}
