export const dynamic = "force-dynamic";

import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { orders, users, editors, reviews, payouts } from "@/lib/db/schema";
import { sql, eq, and, desc } from "drizzle-orm";
import { formatCurrency, formatDate } from "@/lib/utils";
import {
  TrendingUp, Users, ShoppingBag, Star, Clock, BarChart2,
  ArrowUpRight, ArrowDownRight, Repeat, Award,
} from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

function pctChange(current: number, previous: number) {
  if (!previous) return null;
  const diff = ((current - previous) / previous) * 100;
  return { diff: Math.abs(Math.round(diff)), up: diff >= 0 };
}

export default async function AdminAnalyticsPage() {
  const session = await auth();
  if (!session || session.user.role !== "admin") redirect("/admin/dashboard");

  const now = new Date();
  const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lastMonthEnd = new Date(thisMonthStart.getTime() - 1);

  const [
    totalUsers,
    totalEditors,
    totalOrders,
    completedOrders,
    thisMonthOrders,
    lastMonthOrders,
    thisMonthUsers,
    lastMonthUsers,
    thisMonthRevenue,
    lastMonthRevenue,
    avgRatingRow,
    topEditors,
    ordersByStatus,
    dailyOrders30,
    avgOrderValue,
    repeatClientCount,
    totalClients,
  ] = await Promise.all([
    db.select({ c: sql<number>`COUNT(*)::int` }).from(users).then((r) => r[0].c),
    db.select({ c: sql<number>`COUNT(*)::int` }).from(editors).where(eq(editors.kycStatus, "approved")).then((r) => r[0].c),
    db.select({ c: sql<number>`COUNT(*)::int` }).from(orders).then((r) => r[0].c),
    db.select({ c: sql<number>`COUNT(*)::int` }).from(orders).where(sql`${orders.status} = 'completed'`).then((r) => r[0].c),
    db.select({ c: sql<number>`COUNT(*)::int` }).from(orders).where(sql`${orders.createdAt} >= ${thisMonthStart}`).then((r) => r[0].c),
    db.select({ c: sql<number>`COUNT(*)::int` }).from(orders).where(sql`${orders.createdAt} >= ${lastMonthStart} AND ${orders.createdAt} < ${thisMonthStart}`).then((r) => r[0].c),
    db.select({ c: sql<number>`COUNT(*)::int` }).from(users).where(sql`${users.createdAt} >= ${thisMonthStart}`).then((r) => r[0].c),
    db.select({ c: sql<number>`COUNT(*)::int` }).from(users).where(sql`${users.createdAt} >= ${lastMonthStart} AND ${users.createdAt} < ${thisMonthStart}`).then((r) => r[0].c),
    db.select({ v: sql<number>`COALESCE(SUM(${payouts.commissionAmount}),0)::int` }).from(payouts).where(sql`${payouts.status} = 'completed' AND ${payouts.createdAt} >= ${thisMonthStart}`).then((r) => r[0].v),
    db.select({ v: sql<number>`COALESCE(SUM(${payouts.commissionAmount}),0)::int` }).from(payouts).where(sql`${payouts.status} = 'completed' AND ${payouts.createdAt} >= ${lastMonthStart} AND ${payouts.createdAt} < ${thisMonthStart}`).then((r) => r[0].v),
    db.select({ avg: sql<number>`ROUND(AVG(${reviews.rating})::numeric, 2)` }).from(reviews).then((r) => r[0].avg),
    db.select({
      id: editors.id,
      name: users.name,
      totalOrders: editors.totalOrders,
      completionRate: editors.completionRate,
    })
      .from(editors)
      .innerJoin(users, eq(editors.userId, users.id))
      .where(eq(editors.kycStatus, "approved"))
      .orderBy(desc(editors.totalOrders))
      .limit(5),
    db.select({
      status: orders.status,
      count: sql<number>`COUNT(*)::int`,
    })
      .from(orders)
      .groupBy(orders.status),
    // Daily orders for last 30 days
    db.execute(sql`
      SELECT DATE(created_at) as day, COUNT(*)::int as count
      FROM orders
      WHERE created_at >= NOW() - INTERVAL '30 days'
      GROUP BY DATE(created_at)
      ORDER BY day
    `),
    db.select({ avg: sql<number>`ROUND(AVG(${orders.totalAmount}))::int` }).from(orders).where(sql`${orders.status} = 'completed'`).then((r) => r[0].avg),
    db.execute(sql`
      SELECT COUNT(*)::int as c FROM (
        SELECT client_id FROM orders GROUP BY client_id HAVING COUNT(*) > 1
      ) sub
    `).then((r: unknown) => (r as { rows: Array<{ c: number }> }).rows[0]?.c ?? 0),
    db.select({ c: sql<number>`COUNT(DISTINCT client_id)::int` }).from(orders).then((r) => r[0].c),
  ]);

  const dailyRows = (dailyOrders30 as unknown as { rows: Array<{ day: string; count: number }> }).rows;
  const maxDaily = Math.max(...dailyRows.map((r) => r.count), 1);

  const orderMap = Object.fromEntries(ordersByStatus.map((r) => [r.status, r.count]));
  const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
    pending:    { label: "Pending",    color: "bg-amber-400",  bg: "bg-amber-50 text-amber-700" },
    in_progress:{ label: "In progress",color: "bg-blue-400",   bg: "bg-blue-50 text-blue-700" },
    delivered:  { label: "Delivered",  color: "bg-indigo-400", bg: "bg-indigo-50 text-indigo-700" },
    revision:   { label: "Revision",   color: "bg-orange-400", bg: "bg-orange-50 text-orange-700" },
    completed:  { label: "Completed",  color: "bg-green-400",  bg: "bg-green-50 text-green-700" },
    disputed:   { label: "Disputed",   color: "bg-red-400",    bg: "bg-red-50 text-red-700" },
    cancelled:  { label: "Cancelled",  color: "bg-gray-300",   bg: "bg-gray-50 text-gray-600" },
  };

  const retentionRate = totalClients > 0 ? Math.round((Number(repeatClientCount) / totalClients) * 100) : 0;

  const kpiCards = [
    {
      label: "Orders this month",
      value: thisMonthOrders.toLocaleString(),
      sub: pctChange(thisMonthOrders, lastMonthOrders),
      icon: ShoppingBag,
      color: "#0EA5E9",
    },
    {
      label: "New signups this month",
      value: thisMonthUsers.toLocaleString(),
      sub: pctChange(thisMonthUsers, lastMonthUsers),
      icon: Users,
      color: "#0F6E56",
    },
    {
      label: "Revenue this month",
      value: formatCurrency(thisMonthRevenue),
      sub: pctChange(thisMonthRevenue, lastMonthRevenue),
      icon: TrendingUp,
      color: "#2563eb",
    },
    {
      label: "Platform avg rating",
      value: avgRatingRow ? `${avgRatingRow} / 5` : "—",
      sub: null,
      icon: Star,
      color: "#d97706",
    },
    {
      label: "Avg order value",
      value: avgOrderValue ? formatCurrency(avgOrderValue) : "—",
      sub: null,
      icon: BarChart2,
      color: "#7c3aed",
    },
    {
      label: "Client retention",
      value: `${retentionRate}%`,
      sub: null,
      icon: Repeat,
      color: "#0891b2",
    },
  ];

  return (
    <div className="px-8 py-6 ">
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Analytics</h1>
          <p className="text-sm text-gray-500 mt-0.5">Platform-wide performance metrics.</p>
        </div>
        <div className="flex gap-2">
          <Link href="/admin/revenue" className="px-3 py-2 text-sm font-medium text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors">
            Revenue →
          </Link>
          <Link href="/admin/payments" className="px-3 py-2 text-sm font-medium text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors">
            Payments →
          </Link>
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
        {kpiCards.map(({ label, value, sub, icon: Icon, color }) => (
          <div key={label} className="bg-white rounded-2xl border border-gray-100 p-5">
            <div className="flex items-start justify-between mb-3">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: `${color}18` }}>
                <Icon className="w-4.5 h-4.5" style={{ color }} />
              </div>
              {sub && (
                <span className={cn("inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full", sub.up ? "bg-green-50 text-green-700" : "bg-red-50 text-red-600")}>
                  {sub.up ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                  {sub.diff}%
                </span>
              )}
            </div>
            <p className="text-2xl font-extrabold text-gray-900 mb-1">{value}</p>
            <p className="text-xs text-gray-400">{label}</p>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-6 mb-6">
        {/* Daily orders chart */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 p-6">
          <h2 className="text-sm font-bold text-gray-700 mb-5">Orders — last 30 days</h2>
          {dailyRows.length === 0 ? (
            <div className="h-40 flex items-center justify-center text-sm text-gray-300">No data</div>
          ) : (
            <div className="flex items-end gap-1 h-40">
              {dailyRows.map((row) => (
                <div key={row.day} className="flex-1 flex flex-col items-center gap-1 group">
                  <div
                    className="w-full rounded-t bg-[#0EA5E9]/80 group-hover:bg-[#0EA5E9] transition-colors relative"
                    style={{ height: `${Math.max((row.count / maxDaily) * 100, 4)}%` }}
                    title={`${row.day}: ${row.count} orders`}
                  />
                </div>
              ))}
            </div>
          )}
          <div className="flex justify-between mt-2 text-xs text-gray-300">
            <span>{dailyRows[0]?.day ?? ""}</span>
            <span>{dailyRows[dailyRows.length - 1]?.day ?? ""}</span>
          </div>
        </div>

        {/* Order status breakdown */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6">
          <h2 className="text-sm font-bold text-gray-700 mb-5">Orders by status</h2>
          <div className="space-y-2.5">
            {Object.entries(STATUS_CONFIG).map(([key, cfg]) => {
              const count = orderMap[key] ?? 0;
              const pct = totalOrders > 0 ? Math.round((count / totalOrders) * 100) : 0;
              return (
                <div key={key}>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="text-gray-600 font-medium">{cfg.label}</span>
                    <span className="text-gray-400">{count} ({pct}%)</span>
                  </div>
                  <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div className={cn("h-full rounded-full", cfg.color)} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Platform totals */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6">
          <h2 className="text-sm font-bold text-gray-700 mb-5">Platform totals</h2>
          <div className="space-y-3">
            {[
              { label: "Total registered users", value: totalUsers.toLocaleString() },
              { label: "Approved editors", value: totalEditors.toLocaleString() },
              { label: "Total orders", value: totalOrders.toLocaleString() },
              { label: "Completed orders", value: completedOrders.toLocaleString() },
              { label: "Order completion rate", value: totalOrders > 0 ? `${Math.round((completedOrders / totalOrders) * 100)}%` : "—" },
              { label: "Clients who reordered", value: `${repeatClientCount} (${retentionRate}%)` },
            ].map(({ label, value }) => (
              <div key={label} className="flex items-center justify-between py-1.5 border-b border-gray-50 last:border-0">
                <span className="text-sm text-gray-500">{label}</span>
                <span className="text-sm font-semibold text-gray-900">{value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Top editors */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-sm font-bold text-gray-700">Top editors by orders</h2>
            <Link href="/admin/editors" className="text-xs text-[#0EA5E9] hover:underline">View all</Link>
          </div>
          <div className="space-y-3">
            {topEditors.map((editor, idx) => (
              <div key={editor.id} className="flex items-center gap-3">
                <span className="w-5 text-xs text-gray-300 font-bold text-right shrink-0">{idx + 1}</span>
                <div className="w-8 h-8 rounded-lg bg-[#0EA5E9]/10 flex items-center justify-center shrink-0">
                  <span className="text-[#0EA5E9] text-xs font-bold">
                    {(editor.name ?? "?").slice(0, 1)}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900 truncate">{editor.name ?? "—"}</p>
                  {editor.completionRate != null && (
                    <p className="text-xs text-gray-400">{editor.completionRate}% completion</p>
                  )}
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <Award className="w-3.5 h-3.5 text-amber-400" />
                  <span className="text-sm font-semibold text-gray-700">{editor.totalOrders}</span>
                </div>
                <Link href={`/admin/users/${editor.id}`} className="text-xs text-gray-300 hover:text-[#0EA5E9] transition-colors shrink-0">→</Link>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
