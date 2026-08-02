export const dynamic = "force-dynamic";

import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { orders, payouts, packages, users, editors } from "@/lib/db/schema";
import { eq, desc, sql } from "drizzle-orm";
import { formatCurrency, formatDate } from "@/lib/utils";
import { cn } from "@/lib/utils";
import {
  CreditCard, DollarSign, Clock, CheckCircle2, AlertCircle,
  Download, ArrowUpRight, Filter,
} from "lucide-react";
import Link from "next/link";

export default async function AdminPaymentsPage() {
  const session = await auth();
  if (!session || session.user.role !== "admin") redirect("/admin/dashboard");

  const [summaryRows, recentOrders, pendingPayouts, allPayouts] = await Promise.all([
    // Financial summary
    Promise.all([
      db.select({ v: sql<number>`COALESCE(SUM(${orders.totalAmount}),0)::int` }).from(orders).where(sql`${orders.status} = 'completed'`).then((r) => r[0].v),
      db.select({ v: sql<number>`COALESCE(SUM(${orders.processingFee}),0)::int` }).from(orders).where(sql`${orders.status} = 'completed'`).then((r) => r[0].v),
      db.select({ v: sql<number>`COALESCE(SUM(${payouts.commissionAmount}),0)::int` }).from(payouts).where(sql`${payouts.status} = 'completed'`).then((r) => r[0].v),
      db.select({ v: sql<number>`COALESCE(SUM(${payouts.netAmount}),0)::int` }).from(payouts).where(sql`${payouts.status} = 'pending'`).then((r) => r[0].v),
    ]),
    // Recent orders with payment info
    db
      .select({
        id: orders.id,
        status: orders.status,
        totalAmount: orders.totalAmount,
        processingFee: orders.processingFee,
        commissionAmount: orders.commissionAmount,
        razorpayOrderId: orders.razorpayOrderId,
        razorpayPaymentId: orders.razorpayPaymentId,
        createdAt: orders.createdAt,
        packageTitle: packages.title,
        clientName: users.name,
      })
      .from(orders)
      .leftJoin(packages, eq(packages.id, orders.packageId))
      .innerJoin(users, eq(users.id, orders.clientId))
      .orderBy(desc(orders.createdAt))
      .limit(50),
    // Pending payouts (due soon)
    db
      .select({
        id: payouts.id,
        netAmount: payouts.netAmount,
        commissionAmount: payouts.commissionAmount,
        grossAmount: payouts.grossAmount,
        scheduledPayoutAt: payouts.scheduledPayoutAt,
        orderId: payouts.orderId,
        editorName: users.name,
      })
      .from(payouts)
      .innerJoin(editors, eq(editors.id, payouts.editorId))
      .innerJoin(users, eq(users.id, editors.userId))
      .where(sql`${payouts.status} = 'pending'`)
      .orderBy(payouts.scheduledPayoutAt)
      .limit(20),
    // All payouts
    db
      .select({
        id: payouts.id,
        netAmount: payouts.netAmount,
        commissionAmount: payouts.commissionAmount,
        grossAmount: payouts.grossAmount,
        status: payouts.status,
        razorpayTransferId: payouts.razorpayTransferId,
        scheduledPayoutAt: payouts.scheduledPayoutAt,
        settledAt: payouts.settledAt,
        createdAt: payouts.createdAt,
        editorName: users.name,
      })
      .from(payouts)
      .innerJoin(editors, eq(editors.id, payouts.editorId))
      .innerJoin(users, eq(users.id, editors.userId))
      .orderBy(desc(payouts.createdAt))
      .limit(100),
  ]);

  const [totalGmv, totalProcessingFees, totalCommission, pendingPayoutTotal] = summaryRows;

  const STATUS_CONFIG: Record<string, { label: string; cls: string }> = {
    pending:     { label: "Pending",    cls: "bg-amber-100 text-amber-700" },
    processing:  { label: "Processing", cls: "bg-blue-100 text-blue-700" },
    completed:   { label: "Settled",    cls: "bg-green-100 text-green-700" },
    failed:      { label: "Failed",     cls: "bg-red-100 text-red-700" },
  };

  const ORDER_STATUS_CONFIG: Record<string, { label: string; cls: string }> = {
    pending:     { label: "Pending",     cls: "bg-amber-100 text-amber-700" },
    in_progress: { label: "In progress", cls: "bg-blue-100 text-blue-700" },
    delivered:   { label: "Delivered",   cls: "bg-indigo-100 text-indigo-700" },
    revision:    { label: "Revision",    cls: "bg-orange-100 text-orange-700" },
    completed:   { label: "Completed",   cls: "bg-green-100 text-green-700" },
    disputed:    { label: "Disputed",    cls: "bg-red-100 text-red-700" },
    cancelled:   { label: "Cancelled",   cls: "bg-gray-100 text-gray-600" },
  };

  const now = new Date();
  const dueSoonPayouts = pendingPayouts.filter(
    (p) => p.scheduledPayoutAt && p.scheduledPayoutAt <= new Date(now.getTime() + 24 * 60 * 60 * 1000)
  );

  return (
    <div className="px-8 py-6 ">
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Payments</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Razorpay transaction reconciliation and payout management.</p>
        </div>
        <div className="flex gap-2">
          <Link href="/admin/revenue" className="px-3 py-2 text-sm font-medium text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800/40 transition-colors">
            Revenue
          </Link>
          <Link href="/admin/analytics" className="px-3 py-2 text-sm font-medium text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800/40 transition-colors">
            Analytics
          </Link>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {[
          { label: "Total GMV (completed)", value: formatCurrency(totalGmv), icon: DollarSign, color: "var(--brand-teal)" },
          { label: "Processing fees collected", value: formatCurrency(totalProcessingFees), icon: CreditCard, color: "var(--brand-client)" },
          { label: "Commission earned", value: formatCurrency(totalCommission), icon: ArrowUpRight, color: "#2563eb" },
          { label: "Payouts pending release", value: formatCurrency(pendingPayoutTotal), icon: Clock, color: "#d97706" },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-5">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center mb-3" style={{ background: `${color}18` }}>
              <Icon className="w-4.5 h-4.5" style={{ color }} />
            </div>
            <p className="text-xl font-extrabold text-gray-900 dark:text-white mb-1">{value}</p>
            <p className="text-xs text-gray-400 dark:text-gray-500">{label}</p>
          </div>
        ))}
      </div>

      {/* Due-soon payouts alert */}
      {dueSoonPayouts.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 mb-8 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-amber-800">
              {dueSoonPayouts.length} payout{dueSoonPayouts.length !== 1 ? "s" : ""} due within 24 hours
            </p>
            <p className="text-xs text-amber-600 mt-0.5">
              Total: {formatCurrency(dueSoonPayouts.reduce((s, p) => s + p.netAmount, 0))} &mdash; process these via Razorpay dashboard or trigger transfers manually.
            </p>
          </div>
        </div>
      )}

      {/* Pending payouts table */}
      {pendingPayouts.length > 0 && (
        <section className="mb-8">
          <h2 className="text-sm font-bold text-gray-700 dark:text-gray-200 mb-4">Pending payouts ({pendingPayouts.length})</h2>
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/40">
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Editor</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Gross</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Commission</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Net payout</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Due</th>
                  <th className="px-5 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                {pendingPayouts.map((payout) => {
                  const isPastDue = payout.scheduledPayoutAt && payout.scheduledPayoutAt <= now;
                  return (
                    <tr key={payout.id} className={cn(isPastDue && "bg-red-50/30")}>
                      <td className="px-5 py-3.5">
                        <span className="font-medium text-gray-900 dark:text-white">{payout.editorName ?? "-"}</span>
                      </td>
                      <td className="px-5 py-3.5 text-gray-600 dark:text-gray-300">{formatCurrency(payout.grossAmount)}</td>
                      <td className="px-5 py-3.5 text-gray-500 dark:text-gray-400">-{formatCurrency(payout.commissionAmount)}</td>
                      <td className="px-5 py-3.5 font-semibold text-gray-900 dark:text-white">{formatCurrency(payout.netAmount)}</td>
                      <td className="px-5 py-3.5">
                        {payout.scheduledPayoutAt ? (
                          <span className={cn("text-xs font-medium", isPastDue ? "text-red-600 font-bold" : "text-amber-600")}>
                            {isPastDue ? "Overdue · " : ""}{formatDate(payout.scheduledPayoutAt)}
                          </span>
                        ) : (
                          <span className="text-gray-300 text-xs">Not scheduled</span>
                        )}
                      </td>
                      <td className="px-5 py-3.5">
                        <Link href={`/admin/orders/${payout.orderId}`} className="text-xs text-[var(--brand-client)] hover:underline">
                          Order
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* All orders with payment IDs */}
      <section className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-bold text-gray-700 dark:text-gray-200">Recent transactions</h2>
          <span className="text-xs text-gray-400 dark:text-gray-500">Last 50 orders</span>
        </div>
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/40">
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Date</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Client</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Package</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Amount</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Fee</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Razorpay ID</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
              {recentOrders.map((order) => {
                const sc = ORDER_STATUS_CONFIG[order.status] ?? { label: order.status, cls: "bg-gray-100 text-gray-600" };
                return (
                  <tr key={order.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/30 transition-colors">
                    <td className="px-5 py-3.5 text-gray-400 dark:text-gray-500 text-xs whitespace-nowrap">
                      {formatDate(order.createdAt)}
                    </td>
                    <td className="px-5 py-3.5 text-gray-700 dark:text-gray-200 font-medium truncate max-w-[120px]">
                      {order.clientName ?? "-"}
                    </td>
                    <td className="px-5 py-3.5 text-gray-500 dark:text-gray-400 truncate max-w-[140px]">
                      {order.packageTitle ?? "Custom order"}
                    </td>
                    <td className="px-5 py-3.5 font-semibold text-gray-900 dark:text-white whitespace-nowrap">
                      {formatCurrency(order.totalAmount)}
                    </td>
                    <td className="px-5 py-3.5 text-gray-400 dark:text-gray-500 text-xs whitespace-nowrap">
                      {order.processingFee ? `+${formatCurrency(order.processingFee)}` : "-"}
                    </td>
                    <td className="px-5 py-3.5">
                      {order.razorpayPaymentId ? (
                        <span className="font-mono text-xs text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-800 px-2 py-0.5 rounded">
                          {order.razorpayPaymentId.slice(0, 14)}&hellip;
                        </span>
                      ) : (
                        <span className="text-gray-200 dark:text-gray-700 text-xs">-</span>
                      )}
                    </td>
                    <td className="px-5 py-3.5">
                      <span className={cn("px-2 py-0.5 rounded-full text-xs font-semibold", sc.cls)}>
                        {sc.label}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <Link href={`/admin/orders/${order.id}`} className="text-xs text-[var(--brand-client)] hover:underline whitespace-nowrap">
                        View
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* Payout history */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-bold text-gray-700 dark:text-gray-200">Payout history</h2>
          <span className="text-xs text-gray-400 dark:text-gray-500">Last 100 payouts</span>
        </div>
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/40">
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Date</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Editor</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Gross</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Commission</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Net</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Transfer ID</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
              {allPayouts.map((payout) => {
                const sc = STATUS_CONFIG[payout.status] ?? { label: payout.status, cls: "bg-gray-100 text-gray-600" };
                return (
                  <tr key={payout.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/30 transition-colors">
                    <td className="px-5 py-3.5 text-gray-400 dark:text-gray-500 text-xs whitespace-nowrap">
                      {formatDate(payout.createdAt)}
                    </td>
                    <td className="px-5 py-3.5 text-gray-700 dark:text-gray-200 font-medium">
                      {payout.editorName ?? "-"}
                    </td>
                    <td className="px-5 py-3.5 text-gray-600 dark:text-gray-300">{formatCurrency(payout.grossAmount)}</td>
                    <td className="px-5 py-3.5 text-gray-400 dark:text-gray-500">-{formatCurrency(payout.commissionAmount)}</td>
                    <td className="px-5 py-3.5 font-semibold text-gray-900 dark:text-white">{formatCurrency(payout.netAmount)}</td>
                    <td className="px-5 py-3.5">
                      {payout.razorpayTransferId ? (
                        <span className="font-mono text-xs text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-800 px-2 py-0.5 rounded">
                          {payout.razorpayTransferId.slice(0, 14)}&hellip;
                        </span>
                      ) : (
                        <span className="text-gray-200 dark:text-gray-700 text-xs">-</span>
                      )}
                    </td>
                    <td className="px-5 py-3.5">
                      <span className={cn("px-2 py-0.5 rounded-full text-xs font-semibold", sc.cls)}>
                        {sc.label}
                      </span>
                    </td>
                  </tr>
                );
              })}
              {allPayouts.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-5 py-10 text-center text-sm text-gray-300 dark:text-gray-600">
                    No payouts yet
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
