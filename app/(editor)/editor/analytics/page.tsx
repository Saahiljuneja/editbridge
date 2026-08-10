export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { orders, packages, reviews, portfolioItems } from "@/lib/db/schema";
import { eq, sql, and, count, sum } from "drizzle-orm";
import { formatCurrency } from "@/lib/utils";
import { TrendingUp, ShoppingBag, Star, IndianRupee, BarChart3, Target, Heart, Eye, MessageCircle } from "lucide-react";
import { AnalyticsCharts } from "./analytics-charts";
import { ProfileAnalyticsSection } from "@/components/editor/profile-analytics-section";

export default async function EditorAnalyticsPage() {
  const session = await auth();
  if (!session || session.user?.role !== "editor") redirect("/login");

  const editorId = session.user.editorId!;
  if (!editorId) redirect("/editor/kyc");

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);

  // Feed stats
  const feedStats = await db
    .select({
      totalLikes: sum(portfolioItems.likesCount),
      totalComments: sum(portfolioItems.commentsCount),
      totalViews: sum(portfolioItems.viewsCount),
      itemCount: count(),
      featuredCount: sql<number>`COUNT(*) FILTER (WHERE ${portfolioItems.isFeatured} = true)`,
    })
    .from(portfolioItems)
    .where(eq(portfolioItems.editorId, editorId))
    .then(r => r[0]);

  // Core stats
  const [totalRow, completedRow, thisMonthRow, lastMonthRow, avgRatingRow, reviewCountRow] = await Promise.all([
    db.select({ v: count() }).from(orders).where(eq(orders.editorId, editorId)).then(r => r[0].v),
    db.select({ v: count() }).from(orders).where(and(eq(orders.editorId, editorId), sql`${orders.status} = 'completed'`)).then(r => r[0].v),
    db.select({ v: sql<number>`COALESCE(SUM(${orders.totalAmount} - ${orders.commissionAmount}),0)::int` }).from(orders).where(and(eq(orders.editorId, editorId), sql`${orders.status} = 'completed' AND ${orders.updatedAt} >= ${monthStart}`)).then(r => r[0].v),
    db.select({ v: sql<number>`COALESCE(SUM(${orders.totalAmount} - ${orders.commissionAmount}),0)::int` }).from(orders).where(and(eq(orders.editorId, editorId), sql`${orders.status} = 'completed' AND ${orders.updatedAt} >= ${lastMonthStart} AND ${orders.updatedAt} < ${monthStart}`)).then(r => r[0].v),
    db.select({ v: sql<number>`ROUND(AVG(${reviews.rating}),1)` }).from(reviews).where(and(eq(reviews.revieweeId, session.user.userId!), eq(reviews.role, "client"))).then(r => r[0].v),
    db.select({ v: count() }).from(reviews).where(and(eq(reviews.revieweeId, session.user.userId!), eq(reviews.role, "client"))).then(r => r[0].v),
  ]);

  // Monthly earnings — last 6 months
  const monthlyEarnings = await db.execute<{ month: string; earnings: number; orders: number }>(sql`
    SELECT
      TO_CHAR(DATE_TRUNC('month', updated_at), 'Mon YY') AS month,
      COALESCE(SUM(total_amount - commission_amount), 0)::int AS earnings,
      COUNT(*)::int AS orders
    FROM orders
    WHERE editor_id = ${editorId}::uuid
      AND status = 'completed'
      AND updated_at >= NOW() - INTERVAL '6 months'
    GROUP BY DATE_TRUNC('month', updated_at)
    ORDER BY DATE_TRUNC('month', updated_at)
  `);

  // Per-package stats
  const packageStats = await db.execute<{ title: string; orderCount: number; earnings: number; completionRate: number }>(sql`
    SELECT
      p.title,
      COUNT(o.id)::int AS "orderCount",
      COALESCE(SUM(CASE WHEN o.status = 'completed' THEN o.total_amount - o.commission_amount ELSE 0 END), 0)::int AS earnings,
      CASE WHEN COUNT(o.id) > 0 THEN ROUND(COUNT(CASE WHEN o.status = 'completed' THEN 1 END) * 100.0 / COUNT(o.id))::int ELSE 0 END AS "completionRate"
    FROM packages p
    LEFT JOIN orders o ON o.package_id = p.id AND o.editor_id = ${editorId}::uuid
    WHERE p.editor_id = ${editorId}::uuid
    GROUP BY p.id, p.title
    ORDER BY earnings DESC
  `);

  // Order status breakdown
  const statusBreakdown = await db.execute<{ status: string; count: number }>(sql`
    SELECT status, COUNT(*)::int AS count
    FROM orders WHERE editor_id = ${editorId}::uuid
    GROUP BY status
  `);

  const totalOrders = Number(totalRow) || 0;
  const completedOrders = Number(completedRow) || 0;
  const completionRate = totalOrders > 0 ? Math.round((completedOrders / totalOrders) * 100) : 0;
  const thisMonth = Number(thisMonthRow) || 0;
  const lastMonth = Number(lastMonthRow) || 0;
  const momChange = lastMonth > 0 ? Math.round(((thisMonth - lastMonth) / lastMonth) * 100) : null;

  const chartData = monthlyEarnings.rows.map(r => ({
    month: String(r.month),
    earnings: Number(r.earnings),
    orders: Number(r.orders),
  }));

  const pkgData = packageStats.rows.map(r => ({
    title: String(r.title),
    orderCount: Number(r.orderCount),
    earnings: Number(r.earnings),
    completionRate: Number(r.completionRate),
  }));

  const statusData = statusBreakdown.rows.map(r => ({
    status: String(r.status),
    count: Number(r.count),
  }));

  return (
    <div className="min-h-screen bg-white">
      <div className="bg-white border-b border-neutral-200/60">
        <div className="px-6 py-5 flex items-center justify-between">
          <div>
            <h1 className="text-sm font-black text-black uppercase tracking-wider">Analytics</h1>
            <p className="text-xs text-neutral-400 font-semibold mt-0.5">Your performance at a glance</p>
          </div>
          <div className="w-9 h-9 rounded-xl bg-neutral-50 border border-neutral-200 flex items-center justify-center text-black">
            <BarChart3 className="w-4 h-4" />
          </div>
        </div>
      </div>

      <div className="px-6 py-6 space-y-8">

        <ProfileAnalyticsSection />

        <div>
          <h2 className="text-xs font-black text-neutral-800 uppercase tracking-wider mb-4">Order Performance</h2>

          {/* KPI cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              {
                label: "This Month",
                value: formatCurrency(thisMonth),
                sub: momChange !== null ? `${momChange >= 0 ? "+" : ""}${momChange}% vs last month` : "First month",
                subColor: momChange !== null && momChange >= 0 ? "text-emerald-600" : "text-red-500",
                icon: IndianRupee,
              },
              {
                label: "Total Orders",
                value: totalOrders,
                sub: `${completedOrders} completed`,
                subColor: "text-neutral-400 font-bold",
                icon: ShoppingBag,
              },
              {
                label: "Completion Rate",
                value: `${completionRate}%`,
                sub: completionRate >= 90 ? "Excellent" : completionRate >= 70 ? "Good" : "Needs work",
                subColor: completionRate >= 90 ? "text-emerald-600" : completionRate >= 70 ? "text-amber-600" : "text-red-500",
                icon: Target,
              },
              {
                label: "Avg Rating",
                value: avgRatingRow ? `${avgRatingRow} ★` : "N/A",
                sub: `${reviewCountRow} review${reviewCountRow !== 1 ? "s" : ""}`,
                subColor: "text-neutral-400 font-bold",
                icon: Star,
              },
            ].map(({ label, value, sub, subColor, icon: Icon }) => (
              <div key={label} className="eb-kpi-card shadow-none">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-[10px] font-black text-neutral-450 uppercase tracking-wider">{label}</p>
                  <div className="w-8 h-8 rounded-xl bg-neutral-50 border border-neutral-200/60 flex items-center justify-center text-black">
                    <Icon className="w-4 h-4" />
                  </div>
                </div>
                <p className="text-xl font-bold text-gray-900 mb-1">{value}</p>
                <p className={`text-[10px] font-bold ${subColor}`}>{sub}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Feed / Portfolio stats */}
        <div>
          <h2 className="text-xs font-black text-neutral-800 uppercase tracking-wider mb-4 flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-black" /> Feed Performance
          </h2>
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
            {[
              { label: "Portfolio Items", value: Number(feedStats?.itemCount ?? 0), icon: BarChart3 },
              { label: "Featured", value: Number(feedStats?.featuredCount ?? 0), icon: TrendingUp },
              { label: "Total Views", value: Number(feedStats?.totalViews ?? 0), icon: Eye },
              { label: "Total Likes", value: Number(feedStats?.totalLikes ?? 0), icon: Heart },
              { label: "Total Comments", value: Number(feedStats?.totalComments ?? 0), icon: MessageCircle },
            ].map(({ label, value, icon: Icon }) => (
              <div key={label} className="eb-kpi-card shadow-none">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-[10px] font-black text-neutral-450 uppercase tracking-wider">{label}</p>
                  <div className="w-8 h-8 rounded-xl bg-neutral-50 border border-neutral-200/60 flex items-center justify-center text-black">
                    <Icon className="w-4 h-4" />
                  </div>
                </div>
                <p className="text-xl font-bold text-gray-900">{value.toLocaleString()}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Charts */}
        <AnalyticsCharts
          chartData={chartData}
          pkgData={pkgData}
          statusData={statusData}
        />
      </div>
    </div>
  );
}
