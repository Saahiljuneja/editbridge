import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { editors, users, orders, disputes } from "@/lib/db/schema";
import { eq, sql, count } from "drizzle-orm";
import type { UserRole } from "@/types";

const ALLOWED: UserRole[] = ["admin", "staff_moderation", "staff_support"];

// Thresholds
const MIN_ORDERS = 3;         // ignore editors with fewer orders (not enough signal)
const MAX_COMPLETION_RATE = 60; // flag if below this %
const MAX_CANCELLATIONS = 3;    // flag if >= this many cancelled orders
const MAX_DISPUTES = 2;         // flag if >= this many disputes

export async function GET() {
  const session = await auth();
  if (!session || !ALLOWED.includes(session.user.role as UserRole))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const rows = await db.execute<{
    editor_id: string;
    user_id: string;
    name: string | null;
    email: string | null;
    kyc_status: string;
    total_orders: number;
    completed_orders: number;
    cancelled_orders: number;
    dispute_count: number;
    completion_rate: number;
  }>(sql`
    SELECT
      e.id AS editor_id,
      u.id AS user_id,
      u.name,
      u.email,
      e.kyc_status,
      COUNT(o.id)::int AS total_orders,
      COUNT(CASE WHEN o.status = 'completed' THEN 1 END)::int AS completed_orders,
      COUNT(CASE WHEN o.status = 'cancelled' THEN 1 END)::int AS cancelled_orders,
      COUNT(DISTINCT d.id)::int AS dispute_count,
      CASE
        WHEN COUNT(o.id) > 0
        THEN ROUND(COUNT(CASE WHEN o.status = 'completed' THEN 1 END) * 100.0 / COUNT(o.id))::int
        ELSE 0
      END AS completion_rate
    FROM editors e
    INNER JOIN users u ON u.id = e.user_id
    LEFT JOIN orders o ON o.editor_id = e.id
    LEFT JOIN disputes d ON d.order_id = o.id
    GROUP BY e.id, u.id, u.name, u.email, e.kyc_status
    HAVING
      COUNT(o.id) >= ${MIN_ORDERS}
      AND (
        ROUND(COUNT(CASE WHEN o.status = 'completed' THEN 1 END) * 100.0 / COUNT(o.id)) < ${MAX_COMPLETION_RATE}
        OR COUNT(CASE WHEN o.status = 'cancelled' THEN 1 END) >= ${MAX_CANCELLATIONS}
        OR COUNT(DISTINCT d.id) >= ${MAX_DISPUTES}
      )
    ORDER BY dispute_count DESC, cancelled_orders DESC, completion_rate ASC
  `);

  const flagged = rows.rows.map((r) => {
    const flags: string[] = [];
    if (Number(r.completion_rate) < MAX_COMPLETION_RATE)
      flags.push(`${r.completion_rate}% completion rate`);
    if (Number(r.cancelled_orders) >= MAX_CANCELLATIONS)
      flags.push(`${r.cancelled_orders} cancellations`);
    if (Number(r.dispute_count) >= MAX_DISPUTES)
      flags.push(`${r.dispute_count} disputes`);

    return {
      editorId: r.editor_id,
      userId: r.user_id,
      name: r.name,
      email: r.email,
      kycStatus: r.kyc_status,
      totalOrders: Number(r.total_orders),
      completedOrders: Number(r.completed_orders),
      cancelledOrders: Number(r.cancelled_orders),
      disputeCount: Number(r.dispute_count),
      completionRate: Number(r.completion_rate),
      flags,
    };
  });

  return NextResponse.json({ flagged, thresholds: { MIN_ORDERS, MAX_COMPLETION_RATE, MAX_CANCELLATIONS, MAX_DISPUTES } });
}
