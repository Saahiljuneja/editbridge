import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { editors, users, orders, reviews, packages, disputes, revisionRequests, payouts } from "@/lib/db/schema";
import { eq, count, sql, desc } from "drizzle-orm";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import {
  Star, ShoppingBag, DollarSign, Clock, CheckCircle2, Hourglass, Settings2,
  AlertTriangle, CalendarDays, ArrowUpRight, Crown, RotateCcw, Layers, Palmtree,
} from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { OrderStatusBadge } from "@/components/orders/order-status-badge";
import { SetTierForm } from "./set-tier-form";
import { ToggleAvailabilityForm } from "./toggle-availability-form";
import { VacationForm } from "./vacation-form";
import { MaxOrdersForm } from "./max-orders-form";
import { ResetKycButton } from "./reset-kyc-button";
import { GrantCreditsForm } from "../../users/[id]/grant-credits-form";
import { AdjustXpForm } from "../../users/[id]/adjust-xp-form";
import { ImpersonateButton } from "../../users/[id]/impersonate-button";
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

  const KYC_COLORS: Record<string, string> = {
    approved: "bg-emerald-100 text-emerald-700",
    rejected: "bg-red-100 text-red-600",
    pending: "bg-amber-100 text-amber-700",
    expired: "bg-gray-100 text-gray-500",
  };

  const TIER_COLORS: Record<string, string> = {
    hobby: "bg-gray-100 text-gray-600",
    starter: "bg-blue-100 text-blue-700",
    pro: "bg-violet-100 text-violet-700",
    agency: "bg-amber-100 text-amber-700",
  };

  return (
    <div className="px-8 py-6">
      {/* Back */}
      <div className="mb-5">
        <Link href="/admin/editors" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
          ← Editors
        </Link>
      </div>

      {/* Hero header */}
      <div className="rounded-2xl border border-border bg-white p-6 mb-5">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-violet-100 flex items-center justify-center text-2xl font-black text-violet-700 shrink-0">
              {(user?.name ?? user?.email ?? "E").slice(0, 1).toUpperCase()}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-2xl font-bold text-gray-900">{user?.name ?? "Unknown"}</h1>
                <span className={cn("text-xs font-semibold px-2.5 py-0.5 rounded-full", KYC_COLORS[editor.kycStatus] ?? "bg-gray-100 text-gray-500")}>
                  KYC {editor.kycStatus}
                </span>
                <span className={cn("text-xs font-semibold px-2.5 py-0.5 rounded-full", editor.isAvailable ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-gray-500")}>
                  {editor.isAvailable ? "Available" : "Unavailable"}
                </span>
                <span className={cn("text-xs font-semibold px-2.5 py-0.5 rounded-full capitalize", TIER_COLORS[editor.membershipTier] ?? "bg-gray-100 text-gray-500")}>
                  {editor.membershipTier}
                </span>
              </div>
              <p className="text-sm text-muted-foreground mt-0.5">{user?.email}</p>
              <p className="text-xs text-muted-foreground mt-1.5">
                {editor.vacationUntil && editor.vacationUntil > new Date()
                  ? <span className="text-teal-600 font-medium">On vacation until {formatDate(editor.vacationUntil)}</span>
                  : null
                }
                {editor.membershipExpiresAt && (
                  <span className={editor.vacationUntil ? "ml-2 text-amber-600 font-medium" : "text-amber-600 font-medium"}>
                    Tier expires {formatDate(editor.membershipExpiresAt)}
                  </span>
                )}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0 flex-wrap">
            <Link
              href={`/admin/users/${editor.userId}`}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-xs font-medium text-gray-700 hover:bg-muted transition-colors"
            >
              User account <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
            {session.user.role === "admin" && (
              <ImpersonateButton userId={editor.userId} />
            )}
          </div>
        </div>
      </div>

      {/* Stats strip */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-5">
        {([
          { label: "Total Orders", value: String(totalOrdersRow), Icon: ShoppingBag, iconBg: "bg-blue-50", iconColor: "text-blue-600" },
          { label: "Total Earned", value: formatCurrency(totalEarnings), Icon: DollarSign, iconBg: "bg-emerald-50", iconColor: "text-emerald-600" },
          { label: "Avg Rating", value: avgRating ? String(avgRating) : "—", Icon: Star, iconBg: "bg-amber-50", iconColor: "text-amber-600" },
          { label: "Completion Rate", value: `${completionRate}%`, Icon: CheckCircle2, iconBg: "bg-green-50", iconColor: "text-green-600" },
          { label: "Reviews", value: String(reviewCount), Icon: Clock, iconBg: "bg-violet-50", iconColor: "text-violet-600" },
        ] as const).map((card) => (
          <div key={card.label} className="rounded-xl border border-border bg-white p-4">
            <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center mb-2.5", card.iconBg)}>
              <card.Icon className={cn("w-4 h-4", card.iconColor)} />
            </div>
            <p className="text-lg font-bold text-gray-900 tabular-nums leading-tight">{card.value}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{card.label}</p>
          </div>
        ))}
      </div>

      {/* Two-column body */}
      <div className="grid lg:grid-cols-[1fr_300px] gap-5 items-start">

        {/* Left — tables */}
        <div className="space-y-5">
          {/* Recent orders */}
          <div className="rounded-xl border border-border bg-white overflow-hidden">
            <div className="px-5 py-4 border-b border-border flex items-center justify-between">
              <p className="font-semibold text-sm text-gray-900">Recent Orders</p>
              <span className="text-xs text-muted-foreground">{recentOrders.length} shown</span>
            </div>
            {recentOrders.length === 0 ? (
              <div className="py-12 text-center">
                <ShoppingBag className="w-8 h-8 text-gray-200 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">No orders yet.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/30">
                      <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground">Package</th>
                      <th className="text-center px-4 py-2.5 text-xs font-semibold text-muted-foreground">Status</th>
                      <th className="text-right px-4 py-2.5 text-xs font-semibold text-muted-foreground">Amount</th>
                      <th className="text-right px-4 py-2.5 text-xs font-semibold text-muted-foreground">Date</th>
                      <th className="w-8" />
                    </tr>
                  </thead>
                  <tbody>
                    {recentOrders.map(order => (
                      <tr key={order.id} className="border-b border-border last:border-0 hover:bg-muted/20 transition-colors">
                        <td className="px-4 py-3 text-xs font-medium text-gray-800 truncate max-w-[180px]">{order.packageTitle ?? "—"}</td>
                        <td className="px-4 py-3 text-center">
                          <span className={cn(
                            "text-[10px] font-semibold px-2 py-0.5 rounded-full",
                            order.status === "completed"          ? "bg-emerald-100 text-emerald-700" :
                            order.status === "cancelled"          ? "bg-red-100 text-red-600" :
                            order.status === "in_progress"        ? "bg-blue-100 text-blue-700" :
                            order.status === "pending"            ? "bg-amber-100 text-amber-700" :
                            order.status === "revision_requested" ? "bg-orange-100 text-orange-700" :
                            "bg-gray-100 text-gray-600"
                          )}>
                            {order.status.replace(/_/g, " ")}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right text-xs tabular-nums">{formatCurrency(order.totalAmount)}</td>
                        <td className="px-4 py-3 text-right text-xs text-muted-foreground">{formatDate(order.createdAt)}</td>
                        <td className="px-4 py-3 text-right">
                          <Link href={`/admin/orders/${order.id}`} className="text-xs font-semibold text-[var(--brand-client)] hover:underline">→</Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Payout history */}
          <div className="rounded-xl border border-border bg-white overflow-hidden">
            <div className="px-5 py-4 border-b border-border flex items-center justify-between">
              <p className="font-semibold text-sm text-gray-900">Payout History</p>
              <span className="text-xs text-muted-foreground">{recentPayouts.length} records</span>
            </div>
            {recentPayouts.length === 0 ? (
              <div className="py-12 text-center">
                <DollarSign className="w-8 h-8 text-gray-200 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">No payouts yet.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/30">
                      <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground">Gross</th>
                      <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground">Commission</th>
                      <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground">Net</th>
                      <th className="text-center px-4 py-2.5 text-xs font-semibold text-muted-foreground">Status</th>
                      <th className="text-right px-4 py-2.5 text-xs font-semibold text-muted-foreground">Settled</th>
                      <th className="text-right px-4 py-2.5 text-xs font-semibold text-muted-foreground">Created</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentPayouts.map(p => (
                      <tr key={p.id} className="border-b border-border last:border-0 hover:bg-muted/20 transition-colors">
                        <td className="px-4 py-3 text-xs tabular-nums">{formatCurrency(p.grossAmount)}</td>
                        <td className="px-4 py-3 text-xs tabular-nums text-red-500">−{formatCurrency(p.commissionAmount)}</td>
                        <td className="px-4 py-3 text-xs tabular-nums font-semibold text-emerald-700">{formatCurrency(p.netAmount)}</td>
                        <td className="px-4 py-3 text-center">
                          {p.status === "completed" ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
                              <CheckCircle2 className="w-3 h-3" /> Paid
                            </span>
                          ) : p.status === "processing" ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full">
                              <Hourglass className="w-3 h-3" /> Processing
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full">
                              <Hourglass className="w-3 h-3" /> Pending
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right text-xs text-muted-foreground">{p.settledAt ? formatDate(p.settledAt) : "—"}</td>
                        <td className="px-4 py-3 text-right text-xs text-muted-foreground">{formatDate(p.createdAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Right sidebar */}
        <div className="space-y-4">

          {/* Dispute warning */}
          {disputeCount > 0 && (
            <div className={cn(
              "rounded-xl border px-4 py-3 flex items-start gap-2.5",
              disputeCount >= 3 ? "border-red-200 bg-red-50" : "border-amber-200 bg-amber-50"
            )}>
              <AlertTriangle className={cn("w-4 h-4 shrink-0 mt-0.5", disputeCount >= 3 ? "text-red-600" : "text-amber-600")} />
              <div>
                <p className={cn("text-sm font-semibold", disputeCount >= 3 ? "text-red-800" : "text-amber-800")}>
                  {disputeCount >= 3 ? "High dispute rate" : "Disputes recorded"}
                </p>
                <p className={cn("text-xs mt-0.5", disputeCount >= 3 ? "text-red-700" : "text-amber-700")}>
                  {disputeCount} dispute{disputeCount !== 1 ? "s" : ""} on this account.
                </p>
              </div>
            </div>
          )}

          {/* Editor status */}
          <div className="rounded-xl border border-border bg-white p-4 space-y-3">
            <p className="font-semibold text-sm text-gray-900">Editor Status</p>
            <div className="space-y-2.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground flex items-center gap-1.5">
                  <Crown className="w-3.5 h-3.5" /> Membership tier
                </span>
                <span className={cn("font-semibold px-2 py-0.5 rounded-full capitalize", TIER_COLORS[editor.membershipTier] ?? "bg-gray-100 text-gray-500")}>
                  {editor.membershipTier}
                </span>
              </div>
              {editor.membershipExpiresAt && (
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground flex items-center gap-1.5">
                    <CalendarDays className="w-3.5 h-3.5" /> Tier expires
                  </span>
                  <span className="font-medium text-amber-600">{formatDate(editor.membershipExpiresAt)}</span>
                </div>
              )}
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">KYC status</span>
                <span className={cn("font-semibold px-2 py-0.5 rounded-full capitalize", KYC_COLORS[editor.kycStatus] ?? "bg-gray-100 text-gray-500")}>
                  {editor.kycStatus}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Availability</span>
                <span className={cn(
                  "font-semibold px-2 py-0.5 rounded-full",
                  editor.isAvailable ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-gray-500"
                )}>
                  {editor.isAvailable ? "Available" : "Unavailable"}
                </span>
              </div>
              {editor.vacationUntil && editor.vacationUntil > new Date() && (
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground flex items-center gap-1.5">
                    <Palmtree className="w-3.5 h-3.5" /> Vacation until
                  </span>
                  <span className="font-medium text-teal-600">{formatDate(editor.vacationUntil)}</span>
                </div>
              )}
              {editor.maxActiveOrders !== null && (
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5" /> Max active orders
                  </span>
                  <span className="font-medium text-blue-600">{editor.maxActiveOrders}</span>
                </div>
              )}
            </div>

            {/* Secondary stats mini-grid */}
            <div className="pt-3 border-t border-border grid grid-cols-3 gap-2 text-center">
              {[
                { label: "Revisions", value: revisionRate, warn: revisionRate > 5 },
                { label: "Disputes", value: disputeCount, warn: disputeCount >= 3 },
                { label: "Cancelled", value: cancelledOrdersRow, warn: false },
              ].map(s => (
                <div key={s.label} className={cn("rounded-lg p-2", s.warn ? "bg-red-50" : "bg-muted/40")}>
                  <p className={cn("text-base font-bold", s.warn ? "text-red-600" : "text-gray-800")}>{s.value}</p>
                  <p className="text-[10px] text-muted-foreground">{s.label}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Admin controls */}
          <div className="rounded-xl border border-border bg-white p-4 space-y-3">
            <p className="font-semibold text-sm text-gray-900 flex items-center gap-1.5">
              <Settings2 className="w-4 h-4 text-gray-400" /> Admin Controls
            </p>
            <div className="space-y-2">
              <SetTierForm editorId={id} currentTier={editor.membershipTier} />
              <ToggleAvailabilityForm editorId={id} isAvailable={editor.isAvailable} />
              <VacationForm editorId={id} vacationUntil={editor.vacationUntil} />
              <MaxOrdersForm editorId={id} currentMax={editor.maxActiveOrders} />
              <GrantCreditsForm userId={editor.userId} />
              <AdjustXpForm userId={editor.userId} />
              {session.user.role === "admin" && (
                <>
                  <ResetKycButton editorId={id} />
                  <ImpersonateButton userId={editor.userId} />
                </>
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
