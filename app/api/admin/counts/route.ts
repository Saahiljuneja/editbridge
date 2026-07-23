import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { kycApplications, disputes, orders, users, payouts } from "@/lib/db/schema";
import { count, sql } from "drizzle-orm";

export async function GET() {
  const session = await auth();
  if (!session || (!session.user.role.startsWith("admin") && !session.user.role.startsWith("staff"))) {
    return NextResponse.json({ pendingKyc: 0, openDisputes: 0, pendingPayouts: 0, activeOrders: 0, todaySignups: 0 });
  }

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const [pendingKyc, openDisputes, pendingPayouts, activeOrders, todaySignups] = await Promise.all([
    db.select({ value: count() }).from(kycApplications).where(sql`${kycApplications.status} = 'pending'`).then(r => r[0].value),
    db.select({ value: count() }).from(disputes).where(sql`${disputes.status} = 'open'`).then(r => r[0].value),
    db.select({ value: count() }).from(payouts).where(sql`${payouts.status} = 'pending'`).then(r => r[0].value),
    db.select({ value: count() }).from(orders).where(sql`${orders.status} IN ('pending','in_progress','delivered','revision_requested')`).then(r => r[0].value),
    db.select({ value: count() }).from(users).where(sql`${users.createdAt} >= ${todayStart}`).then(r => r[0].value),
  ]);

  return NextResponse.json({ pendingKyc, openDisputes, pendingPayouts, activeOrders, todaySignups });
}
