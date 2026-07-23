import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { editors, users, orders, reviews, packages, disputes, revisionRequests, payouts } from "@/lib/db/schema";
import { eq, count, sql, desc } from "drizzle-orm";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Star, ShoppingBag, DollarSign, Clock, AlertTriangle, CheckCircle2, Hourglass } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { OrderStatusBadge } from "@/components/orders/order-status-badge";
import type { UserRole } from "@/types";

export const dynamic = "force-dynamic";

const ALLOWED: UserRole[] = ["admin", "staff_kyc", "staff_support", "staff_dispute"];

export default async function AdminEditorDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session || !ALLOWED.includes(session.user.role as UserRole)) redirect("/admin/dashboard");

  const { id } = await params;

  const [editor] = await db.select().from(editors).where(eq(editors.id, id)).limit(1);
  if (!editor) notFound();

  const [user] = await db.select().from(users).where(eq(users.id, editor.userId)).limit(1);

  const [
    totalOrdersRow, completedOrdersRow, cancelledOrdersRow,
    totalEarnings, avgRating, reviewCount,
    revisionRate, disputeCount, recentOrders, recentPayouts,
  ] = await Promise.all([
    db.select({ value: count() }).from(orders).where(eq(orders.editorId, id)).then(r => r[0].value),
    db.select({ value: count() }).from(orders).where(sql`${orders.editorId} = ${id} AND ${orders.status} = 'completed'`).then(r => r[0].value),
    db.select({ value: count() }).from(orders).where(sql`${orders.editorId} = ${id} AND ${orders.status} = 'cancelled'`).then(r => r[0].value),
    db.select({ value: sql<number>`COALESCE(SUM(${orders.totalAmount} - ${orders.commissionAmount}),0)::int` })
      .from(orders).where(sql`${orders.editorId} = ${id} AND ${orders.status} = 'completed'`).then(r => r[0].value),
    db.select({ value: sql<number>`ROUND(AVG(${reviews.rating}),1)` })
      .from(reviews).where(sql`${reviews.revieweeId} = ${editor.userId} AND ${reviews.role} = 'client'`).then(r => r[0].value),
    db.select({ value: count() }).from(reviews).where(sql`${reviews.revieweeId} = ${editor.userId}`).then(r => r[0].value),
    db.select({ value: count() }).from(revisionRequests)
      .innerJoin(orders, eq(orders.id, revisionRequests.orderId))
      .where(eq(orders.editorId, id)).then(r => r[0].value),
    db.select({ value: count() }).from(disputes)
      .innerJoin(orders, eq(orders.id, disputes.orderId))
      .where(eq(orders.editorId, id)).then(r => r[0].value),
    db.select({ id: orders.id, status: orders.status, totalAmount: orders.totalAmount, createdAt: orders.createdAt, packageTitle: packages.title })
      .from(orders).leftJoin(packages, eq(packages.id, orders.packageId))
      .where(eq(orders.editorId, id)).orderBy(desc(orders.createdAt)).limit(10),
    db.select({
      id: payouts.id,
      grossAmount: payouts.grossAmount,
      commissionAmount: payouts.commissionAmount,
      netAmount: payouts.netAmount,
      status: payouts.status,
      settledAt: payouts.settledAt,
      createdAt: payouts.createdAt,
    }).from(payouts).where(eq(payouts.editorId, id)).orderBy(desc(payouts.createdAt)).limit(20),
  ]);

  const completionRate = totalOrdersRow > 0 ? Math.round((completedOrdersRow / totalOrdersRow) * 100) : 0;

  return (
    <div className="max-w-4xl mx-auto px-6 py-10">
      <div className="mb-6">
        <Link href="/admin/users" className="text-sm text-gray-400 hover:text-gray-600">← Users</Link>
      </div>

      {/* Header */}
      <div className="flex items-start gap-4 mb-8">
        <div className="w-14 h-14 rounded-2xl bg-violet-100 flex items-center justify-center text-xl font-bold text-violet-700 shrink-0">
          {(user?.name ?? user?.email ?? "E").slice(0, 1).toUpperCase()}
        </div>
        <div className="flex-1">
          <h1 className="text-xl font-bold text-gray-900">{user?.name ?? "Unknown"}</h1>
          <p className="text-sm text-gray-400">{user?.email}</p>
          <div className="flex items-center gap-2 mt-2">
            <Badge className={cn("text-xs border-0", editor.kycStatus === "approved" ? "bg-green-100 text-green-700" : editor.kycStatus === "rejected" ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700")}>
              KYC {editor.kycStatus}
            </Badge>
            <Badge className={cn("text-xs border-0", editor.isAvailable ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-gray-500")}>
              {editor.isAvailable ? "Available" : "Unavailable"}
            </Badge>
          </div>
        </div>
        <Link href={`/admin/users/${editor.userId}`} className="text-xs font-semibold text-[#0EA5E9] hover:underline">
          Manage account →
        </Link>
      </div>

      {/* Stats */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[
          { label: "Total orders", value: totalOrdersRow, icon: ShoppingBag, color: "text-blue-600", bg: "bg-blue-50" },
          { label: "Total earned", value: formatCurrency(totalEarnings), icon: DollarSign, color: "text-emerald-600", bg: "bg-emerald-50" },
          { label: "Avg rating", value: avgRating ?? "—", icon: Star, color: "text-amber-600", bg: "bg-amber-50" },
          { label: "Completion rate", value: `${completionRate}%`, icon: Clock, color: "text-violet-600", bg: "bg-violet-50" },
        ].map(card => (
          <div key={card.label} className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
            <div className={`w-9 h-9 rounded-xl ${card.bg} flex items-center justify-center mb-3`}>
              <card.icon className={`w-4.5 h-4.5 ${card.color}`} />
            </div>
            <p className="text-2xl font-bold text-gray-900">{card.value}</p>
            <p className="text-xs text-gray-500 mt-0.5">{card.label}</p>
          </div>
        ))}
      </div>

      {/* Extra stats row */}
      <div className="grid sm:grid-cols-4 gap-4 mb-8">
        {[
          { label: "Reviews", value: reviewCount },
          { label: "Revisions requested", value: revisionRate },
          { label: "Disputes", value: disputeCount },
          { label: "Cancelled orders", value: cancelledOrdersRow },
        ].map(s => (
          <div key={s.label} className={cn("rounded-xl border border-gray-100 bg-white p-4 shadow-sm text-center", s.label === "Disputes" && disputeCount > 0 ? "border-red-100 bg-red-50" : "")}>
            <p className="text-xl font-bold text-gray-900">{s.value}</p>
            <p className="text-xs text-gray-500 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Recent orders */}
      <div className="rounded-2xl border border-gray-100 bg-white shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <p className="font-semibold text-gray-900 text-sm">Recent orders</p>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-50 bg-gray-50">
              <th className="text-left px-5 py-3 font-medium text-gray-500">Package</th>
              <th className="text-center px-4 py-3 font-medium text-gray-500">Status</th>
              <th className="text-right px-4 py-3 font-medium text-gray-500">Amount</th>
              <th className="text-right px-4 py-3 font-medium text-gray-500">Date</th>
              <th className="text-right px-4 py-3 font-medium text-gray-500" />
            </tr>
          </thead>
          <tbody>
            {recentOrders.map(order => (
              <tr key={order.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50">
                <td className="px-5 py-3 font-medium text-gray-900 truncate max-w-[200px]">{order.packageTitle}</td>
                <td className="px-4 py-3 text-center">
                  <OrderStatusBadge status={order.status as Parameters<typeof OrderStatusBadge>[0]["status"]} />
                </td>
                <td className="px-4 py-3 text-right tabular-nums">{formatCurrency(order.totalAmount)}</td>
                <td className="px-4 py-3 text-right text-gray-400 text-xs">{formatDate(order.createdAt)}</td>
                <td className="px-4 py-3 text-right">
                  <Link href={`/admin/orders/${order.id}`} className="text-xs font-semibold text-[#0EA5E9] hover:underline">View →</Link>
                </td>
              </tr>
            ))}
            {recentOrders.length === 0 && (
              <tr><td colSpan={5} className="px-5 py-8 text-center text-gray-400 text-sm">No orders yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Payout history */}
      <div className="rounded-2xl border border-gray-100 bg-white shadow-sm overflow-hidden mt-6">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <p className="font-semibold text-gray-900 text-sm">Payout history</p>
          <span className="text-xs text-gray-400">{recentPayouts.length} record{recentPayouts.length !== 1 ? "s" : ""}</span>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-50 bg-gray-50">
              <th className="text-left px-5 py-3 font-medium text-gray-500">Gross</th>
              <th className="text-left px-4 py-3 font-medium text-gray-500">Commission</th>
              <th className="text-left px-4 py-3 font-medium text-gray-500">Net payout</th>
              <th className="text-center px-4 py-3 font-medium text-gray-500">Status</th>
              <th className="text-right px-4 py-3 font-medium text-gray-500">Settled</th>
              <th className="text-right px-4 py-3 font-medium text-gray-500">Created</th>
            </tr>
          </thead>
          <tbody>
            {recentPayouts.map(p => (
              <tr key={p.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50">
                <td className="px-5 py-3 tabular-nums">{formatCurrency(p.grossAmount)}</td>
                <td className="px-4 py-3 tabular-nums text-red-500">−{formatCurrency(p.commissionAmount)}</td>
                <td className="px-4 py-3 tabular-nums font-semibold text-emerald-700">{formatCurrency(p.netAmount)}</td>
                <td className="px-4 py-3 text-center">
                  {p.status === "completed" ? (
                    <span className="inline-flex items-center gap-1 text-xs font-medium text-green-700 bg-green-50 px-2 py-0.5 rounded-full">
                      <CheckCircle2 className="w-3 h-3" /> Paid
                    </span>
                  ) : p.status === "processing" ? (
                    <span className="inline-flex items-center gap-1 text-xs font-medium text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full">
                      <Hourglass className="w-3 h-3" /> Processing
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full">
                      <Hourglass className="w-3 h-3" /> Pending
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 text-right text-gray-400 text-xs">
                  {p.settledAt ? formatDate(p.settledAt) : "—"}
                </td>
                <td className="px-4 py-3 text-right text-gray-400 text-xs">{formatDate(p.createdAt)}</td>
              </tr>
            ))}
            {recentPayouts.length === 0 && (
              <tr><td colSpan={6} className="px-5 py-8 text-center text-gray-400 text-sm">No payouts yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
