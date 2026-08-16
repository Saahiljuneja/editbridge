import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { orders, payouts, packages, users, editors, featuredPayments } from "@/lib/db/schema";
import { eq, desc, sql } from "drizzle-orm";
import { formatCurrency, formatDate } from "@/lib/utils";
import { DollarSign, TrendingUp, Wallet, Star, Landmark } from "lucide-react";
import { cn } from "@/lib/utils";
import { RevenueClient } from "./revenue-client";
import { GstExportButton } from "./gst-export-button";

export const dynamic = "force-dynamic";

export default async function AdminRevenuePage() {
  const session = await auth();
  if (!session || session.user.role !== "admin") redirect("/admin/dashboard");

  const [totalRevenue, totalGmv, totalPayouts, featuredRevenue, totalTdsCollected, recentPayouts] = await Promise.all([
    db.select({ value: sql<number>`COALESCE(SUM(${payouts.commissionAmount}),0)::int` })
      .from(payouts)
      .where(sql`${payouts.status} = 'completed'`)
      .then((r) => r[0].value),
    db.select({ value: sql<number>`COALESCE(SUM(${orders.totalAmount}),0)::int` })
      .from(orders)
      .where(sql`${orders.status} = 'completed'`)
      .then((r) => r[0].value),
    db.select({ value: sql<number>`COALESCE(SUM(${payouts.netAmount}),0)::int` })
      .from(payouts)
      .where(sql`${payouts.status} = 'completed'`)
      .then((r) => r[0].value),
    db.select({ value: sql<number>`COALESCE(SUM(${featuredPayments.amountPaid}),0)::int` })
      .from(featuredPayments)
      .then((r) => r[0].value),
    db.select({ value: sql<number>`COALESCE(SUM(${payouts.tdsAmount}),0)::int` })
      .from(payouts)
      .then((r) => r[0].value),
    db.select({
      id: payouts.id,
      netAmount: payouts.netAmount,
      commissionAmount: payouts.commissionAmount,
      tdsAmount: payouts.tdsAmount,
      grossAmount: payouts.grossAmount,
      status: payouts.status,
      createdAt: payouts.createdAt,
      packageTitle: packages.title,
      editorName: users.name,
    })
      .from(payouts)
      .innerJoin(orders, eq(orders.id, payouts.orderId))
      .leftJoin(packages, eq(packages.id, orders.packageId))
      .innerJoin(editors, eq(editors.id, payouts.editorId))
      .innerJoin(users, eq(users.id, editors.userId))
      .orderBy(desc(payouts.createdAt))
      .limit(50),
  ]);

  const STATUS_COLORS: Record<string, string> = {
    pending: "bg-amber-100 text-amber-700",
    processing: "bg-blue-100 text-blue-700",
    completed: "bg-green-100 text-green-700",
  };

  return (
    <div className="px-8 py-6 ">
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Revenue</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Platform financials and payout history.</p>
        </div>
        <div className="flex items-center gap-3">
          <GstExportButton />
          <a
            href="/api/admin/export/revenue"
            className="flex items-center gap-2 px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800/40 transition-colors"
          >
            &darr; Export CSV
          </a>
        </div>
      </div>

      <div className="grid sm:grid-cols-5 gap-5 mb-10">
        {[
          { label: "Platform Revenue", value: formatCurrency(totalRevenue), sub: "Commission collected (20%)", icon: DollarSign, color: "text-emerald-600", bg: "bg-emerald-50" },
          { label: "Gross GMV", value: formatCurrency(totalGmv), sub: "Total completed order value", icon: TrendingUp, color: "text-blue-600", bg: "bg-blue-50" },
          { label: "Editor Payouts", value: formatCurrency(totalPayouts), sub: "Total paid to editors", icon: Wallet, color: "text-purple-600", bg: "bg-purple-50" },
          { label: "TDS Collected", value: formatCurrency(totalTdsCollected), sub: "Sec. 194J - deposit with IT dept", icon: Landmark, color: "text-orange-600", bg: "bg-orange-50" },
          { label: "Featured Revenue", value: formatCurrency(featuredRevenue), sub: "Paid featured listings", icon: Star, color: "text-amber-600", bg: "bg-amber-50" },
        ].map((card) => (
          <div key={card.label} className="rounded-2xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 p-6 shadow-sm">
            <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center mb-4", card.bg)}>
              <card.icon className={cn("w-5 h-5", card.color)} />
            </div>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{card.value}</p>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{card.label}</p>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{card.sub}</p>
          </div>
        ))}
      </div>

      <h2 className="font-semibold text-gray-900 dark:text-white mb-4">Payout history</h2>
      <RevenueClient payouts={recentPayouts} />
    </div>
  );
}
