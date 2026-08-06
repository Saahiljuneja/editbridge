import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { orders, notifications, editors, kycApplications, disputes, payouts } from "@/lib/db/schema";
import { and, count, eq, gte, inArray } from "drizzle-orm";
import { sql } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ type: "unknown" });

  const role = session.user.role as string;
  const userId = session.user.userId!;

  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

  if (role === "client") {
    const [activeRow, notifRow] = await Promise.all([
      db
        .select({ c: count() })
        .from(orders)
        .where(
          and(
            eq(orders.clientId, userId),
            inArray(orders.status, ["pending", "in_progress", "delivered", "revision_requested"])
          )
        )
        .then((r) => r[0]),
      db
        .select({ c: count() })
        .from(notifications)
        .where(and(eq(notifications.userId, userId), eq(notifications.isRead, false)))
        .then((r) => r[0]),
    ]);
    return NextResponse.json({
      type: "client",
      activeOrders: activeRow?.c ?? 0,
      unreadNotifications: notifRow?.c ?? 0,
    });
  }

  if (role === "editor") {
    const editorId = session.user.editorId;
    if (!editorId) return NextResponse.json({ type: "unknown" });

    const [editorRow, earningsRow, notifRow] = await Promise.all([
      db
        .select({ isAvailable: editors.isAvailable })
        .from(editors)
        .where(eq(editors.id, editorId))
        .limit(1)
        .then((r) => r[0]),
      db
        .select({ total: sql<number>`COALESCE(SUM(${payouts.netAmount}), 0)::int` })
        .from(payouts)
        .where(
          and(
            eq(payouts.editorId, editorId),
            inArray(payouts.status, ["pending", "completed", "processing"]),
            gte(payouts.createdAt, monthStart)
          )
        )
        .then((r) => r[0]),
      db
        .select({ c: count() })
        .from(notifications)
        .where(and(eq(notifications.userId, userId), eq(notifications.isRead, false)))
        .then((r) => r[0]),
    ]);
    return NextResponse.json({
      type: "editor",
      isAvailable: editorRow?.isAvailable ?? true,
      monthEarnings: earningsRow?.total ?? 0,
      unreadNotifications: notifRow?.c ?? 0,
    });
  }

  if (role === "admin" || role?.startsWith("staff_")) {
    const [kycRow, disputeRow, notifRow] = await Promise.all([
      db
        .select({ c: count() })
        .from(kycApplications)
        .where(eq(kycApplications.status, "pending"))
        .then((r) => r[0]),
      db
        .select({ c: count() })
        .from(disputes)
        .where(eq(disputes.status, "open"))
        .then((r) => r[0]),
      db
        .select({ c: count() })
        .from(notifications)
        .where(and(eq(notifications.userId, userId), eq(notifications.isRead, false)))
        .then((r) => r[0]),
    ]);
    return NextResponse.json({
      type: "admin",
      pendingKyc: kycRow?.c ?? 0,
      openDisputes: disputeRow?.c ?? 0,
      unreadNotifications: notifRow?.c ?? 0,
    });
  }

  return NextResponse.json({ type: "unknown" });
}
