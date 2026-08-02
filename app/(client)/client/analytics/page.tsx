export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { orders, packages, editors, users } from "@/lib/db/schema";
import { and, eq, sql, desc } from "drizzle-orm";
import { formatCurrency } from "@/lib/utils";
import { BarChart2 } from "lucide-react";
import nextDynamic from "next/dynamic";

const SpendingCharts = nextDynamic(
  () => import("./spending-charts").then((m) => m.SpendingCharts)
);

export default async function ClientAnalyticsPage() {
  const session = await auth();
  if (!session) redirect("/login");

  const userId = session.user.userId!;

  const [statsRow, monthlyRows, editorRows, statusRows] = await Promise.all([
    // Lifetime KPIs
    db.select({
      total:     sql<number>`COUNT(*)::int`,
      completed: sql<number>`COUNT(*) FILTER (WHERE ${orders.status} = 'completed')::int`,
      totalSpent: sql<number>`COALESCE(SUM(${orders.totalAmount}) FILTER (WHERE ${orders.status} = 'completed'),0)::int`,
      avgOrder:  sql<number>`COALESCE(AVG(${orders.totalAmount}) FILTER (WHERE ${orders.status} = 'completed'),0)::int`,
    }).from(orders).where(eq(orders.clientId, userId)).then((r) => r[0]),

    // Monthly spend — last 6 months
    db.execute(sql`
      SELECT
        TO_CHAR(DATE_TRUNC('month', updated_at), 'Mon YY') AS month,
        COALESCE(SUM(total_amount),0)::int AS spent
      FROM orders
      WHERE client_id = ${userId}
        AND status = 'completed'
        AND updated_at >= NOW() - INTERVAL '6 months'
      GROUP BY DATE_TRUNC('month', updated_at)
      ORDER BY DATE_TRUNC('month', updated_at)
    `).then((r) => r.rows as { month: string; spent: number }[]),

    // Top editors by spend
    db.execute(sql`
      SELECT
        u.name AS editor_name,
        COUNT(o.id)::int AS order_count,
        COALESCE(SUM(o.total_amount),0)::int AS total_spent
      FROM orders o
      JOIN editors e ON e.id = o.editor_id
      JOIN users u ON u.id = e.user_id
      WHERE o.client_id = ${userId} AND o.status = 'completed'
      GROUP BY u.name
      ORDER BY total_spent DESC
      LIMIT 5
    `).then((r) => r.rows as { editor_name: string; order_count: number; total_spent: number }[]),

    // Orders by status
    db.execute(sql`
      SELECT status, COUNT(*)::int AS count
      FROM orders
      WHERE client_id = ${userId}
      GROUP BY status
    `).then((r) => r.rows as { status: string; count: number }[]),
  ]);

  const kpis = [
    { label: "Total Spent",    value: formatCurrency(statsRow?.totalSpent ?? 0) },
    { label: "Orders Placed",  value: (statsRow?.total ?? 0).toString() },
    { label: "Completed",      value: (statsRow?.completed ?? 0).toString() },
    { label: "Avg Order Value",value: formatCurrency(statsRow?.avgOrder ?? 0) },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-100">
        <div className="px-6 py-5 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Spending Analytics</h1>
            <p className="text-sm text-gray-400 mt-0.5">Your EditBridge spending at a glance</p>
          </div>
          <div className="w-9 h-9 rounded-xl bg-[var(--brand-client)]/10 flex items-center justify-center">
            <BarChart2 className="w-4 h-4 text-[var(--brand-client)]" />
          </div>
        </div>
      </div>

      <div className="px-6 py-6 space-y-6">
        {/* KPI cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {kpis.map(({ label, value }) => (
            <div key={label} className="rounded-2xl border border-gray-100 bg-white shadow-sm p-5">
              <p className="text-xs text-gray-500 font-medium mb-1">{label}</p>
              <p className="text-2xl font-bold text-gray-900">{value}</p>
            </div>
          ))}
        </div>

        <SpendingCharts
          monthlyData={monthlyRows}
          editorData={editorRows}
          statusData={statusRows}
        />
      </div>
    </div>
  );
}
