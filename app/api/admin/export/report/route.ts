import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { orders, users, payouts, editors } from "@/lib/db/schema";
import { sql, count } from "drizzle-orm";
import { getPlatformSettings } from "@/lib/platform-settings";

export async function GET(req: Request) {
  const session = await auth();
  if (!session || session.user.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const year = parseInt(searchParams.get("year") ?? String(new Date().getFullYear()));
  const month = parseInt(searchParams.get("month") ?? String(new Date().getMonth() + 1));

  const start = new Date(year, month - 1, 1);
  const end = new Date(year, month, 0, 23, 59, 59);

  const [
    totalOrders, completedOrders, newUsers, newEditors,
    gmv, commission, disputes,
  ] = await Promise.all([
    db.select({ value: count() }).from(orders).where(sql`${orders.createdAt} BETWEEN ${start} AND ${end}`).then(r => r[0].value),
    db.select({ value: count() }).from(orders).where(sql`${orders.createdAt} BETWEEN ${start} AND ${end} AND ${orders.status} = 'completed'`).then(r => r[0].value),
    db.select({ value: count() }).from(users).where(sql`${users.createdAt} BETWEEN ${start} AND ${end}`).then(r => r[0].value),
    db.select({ value: count() }).from(editors).where(sql`${editors.createdAt} BETWEEN ${start} AND ${end}`).then(r => r[0].value),
    db.select({ value: sql<number>`COALESCE(SUM(${orders.totalAmount}),0)::int` }).from(orders).where(sql`${orders.createdAt} BETWEEN ${start} AND ${end} AND ${orders.status} = 'completed'`).then(r => r[0].value),
    db.select({ value: sql<number>`COALESCE(SUM(${payouts.commissionAmount}),0)::int` }).from(payouts).where(sql`${payouts.createdAt} BETWEEN ${start} AND ${end} AND ${payouts.status} = 'completed'`).then(r => r[0].value),
    db.select({ value: count() }).from(orders).where(sql`${orders.createdAt} BETWEEN ${start} AND ${end} AND ${orders.status} = 'disputed'`).then(r => r[0].value),
  ]);

  const { name: platformName, commissionRatePct } = await getPlatformSettings();
  const formatPaise = (p: number) => `₹${(p / 100).toFixed(2)}`;

  const lines = [
    `${platformName} Monthly Report — ${start.toLocaleString("default", { month: "long" })} ${year}`,
    `Generated: ${new Date().toISOString()}`,
    "",
    "ORDERS",
    `Total orders placed,${totalOrders}`,
    `Completed orders,${completedOrders}`,
    `Disputed orders,${disputes}`,
    `Completion rate,${totalOrders > 0 ? Math.round((completedOrders / totalOrders) * 100) : 0}%`,
    "",
    "REVENUE",
    `Gross GMV,${formatPaise(gmv)}`,
    `Platform commission (${commissionRatePct}%),${formatPaise(commission)}`,
    `Editor payouts,${formatPaise(gmv - commission)}`,
    "",
    "USERS",
    `New users,${newUsers}`,
    `New editors,${newEditors}`,
  ].join("\n");

  const monthStr = String(month).padStart(2, "0");
  return new NextResponse(lines, {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": `attachment; filename="editbridge-report-${year}-${monthStr}.csv"`,
    },
  });
}
