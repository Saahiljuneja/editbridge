import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { messages, orders } from "@/lib/db/schema";
import { and, eq, ne, sql } from "drizzle-orm";

export async function GET() {
  const session = await auth();
  if (!session || session.user.role !== "client")
    return NextResponse.json({ count: 0 });

  const userId = session.user.userId!;

  const [row] = await db
    .select({ count: sql<number>`COUNT(*)::int` })
    .from(messages)
    .innerJoin(orders, eq(messages.orderId, orders.id))
    .where(
      and(
        eq(orders.clientId, userId),
        ne(messages.senderId, userId),
        sql`${orders.status} NOT IN ('completed','cancelled')`,
        eq(messages.isBlocked, false)
      )
    );

  return NextResponse.json({ count: row?.count ?? 0 });
}
