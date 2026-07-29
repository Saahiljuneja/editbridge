export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { orders, packages, users } from "@/lib/db/schema";
import { and, eq, desc, sql, count } from "drizzle-orm";
import { formatCurrency, formatDate, displayNameFromFull } from "@/lib/utils";
import { cn } from "@/lib/utils";
import {
  ShoppingBag,
  ArrowRight,
  Clock,
  CheckCircle2,
  RotateCcw,
  XCircle,
  AlertTriangle,
  Banknote,
  ChevronLeft,
  ChevronRight,
  Loader,
} from "lucide-react";
import Link from "next/link";
import { DeadlineCountdown } from "@/components/orders/deadline-countdown";
import type { LucideIcon } from "lucide-react";

const PAGE_SIZE = 25;

const STATUS_TABS = [
  { value: "",                   label: "All" },
  { value: "pending",            label: "Pending" },
  { value: "in_progress",        label: "In Progress" },
  { value: "revision_requested", label: "Revision" },
  { value: "delivered",          label: "Delivered" },
  { value: "completed",          label: "Completed" },
  { value: "cancelled",          label: "Cancelled" },
];

const STATUS_CONFIG: Record<
  string,
  { label: string; stripe: string; badge: string; icon: LucideIcon }
> = {
  pending:            { label: "Pending",      stripe: "bg-amber-400",   badge: "bg-amber-50 text-amber-700 border border-amber-200",     icon: Clock },
  in_progress:        { label: "In Progress",  stripe: "bg-[#0EA5E9]",   badge: "bg-sky-50 text-sky-700 border border-sky-200",           icon: Loader },
  revision_requested: { label: "Revision",     stripe: "bg-orange-400",  badge: "bg-orange-50 text-orange-700 border border-orange-200",  icon: RotateCcw },
  delivered:          { label: "Delivered",    stripe: "bg-emerald-400", badge: "bg-emerald-50 text-emerald-700 border border-emerald-200",icon: CheckCircle2 },
  completed:          { label: "Completed",    stripe: "bg-emerald-600", badge: "bg-emerald-50 text-emerald-700 border border-emerald-200",icon: CheckCircle2 },
  cancelled:          { label: "Cancelled",    stripe: "bg-gray-300",    badge: "bg-gray-50 text-gray-500 border border-gray-200",         icon: XCircle },
  disputed:           { label: "Disputed",     stripe: "bg-red-400",     badge: "bg-red-50 text-red-600 border border-red-200",            icon: AlertTriangle },
};

const TIER_LABELS: Record<string, string> = {
  basic: "Basic",
  standard: "Standard",
  premium: "Premium",
};

const STAT_CONFIG = [
  { label: "Total Orders", iconCls: "text-gray-500", iconBg: "bg-gray-100",    topBorder: "border-t-2 border-gray-300",      icon: ShoppingBag,   numCls: "text-gray-900" },
  { label: "Active",       iconCls: "text-[#0EA5E9]",iconBg: "bg-sky-50",      topBorder: "border-t-2 border-[#0EA5E9]",     icon: Loader,        numCls: "text-[#0EA5E9]" },
  { label: "Completed",    iconCls: "text-emerald-600",iconBg:"bg-emerald-50", topBorder: "border-t-2 border-emerald-500",   icon: CheckCircle2,  numCls: "text-emerald-700" },
  { label: "Total Earned", iconCls: "text-amber-600", iconBg: "bg-amber-50",   topBorder: "border-t-2 border-amber-400",     icon: Banknote,      numCls: "text-amber-700" },
];

export default async function EditorOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; page?: string }>;
}) {
  const session = await auth();
  if (!session || session.user?.role !== "editor") redirect("/login");

  const editorId = session.user.editorId;
  if (!editorId) redirect("/editor/kyc");

  const params = await searchParams;
  const statusFilter = params.status ?? "";
  const page = Math.max(1, parseInt(params.page ?? "1", 10));

  const whereClause = and(
    eq(orders.editorId, editorId),
    statusFilter ? sql`${orders.status} = ${statusFilter}` : undefined
  );

  const [rows, filteredTotal, allCounts] = await Promise.all([
    db
      .select({
        id: orders.id,
        status: orders.status,
        totalAmount: orders.totalAmount,
        commissionAmount: orders.commissionAmount,
        deadline: orders.deadline,
        createdAt: orders.createdAt,
        packageTitle: packages.title,
        packageTier: packages.tier,
        clientName: users.name,
      })
      .from(orders)
      .leftJoin(packages, eq(packages.id, orders.packageId))
      .innerJoin(users, eq(users.id, orders.clientId))
      .where(whereClause)
      .orderBy(desc(orders.createdAt))
      .limit(PAGE_SIZE)
      .offset((page - 1) * PAGE_SIZE),

    db
      .select({ v: count() })
      .from(orders)
      .leftJoin(packages, eq(packages.id, orders.packageId))
      .innerJoin(users, eq(users.id, orders.clientId))
      .where(whereClause)
      .then((r) => r[0].v),

    Promise.all([
      db.select({ v: count() }).from(orders).where(eq(orders.editorId, editorId)).then((r) => r[0].v),
      db.select({ v: count() }).from(orders).where(and(eq(orders.editorId, editorId), sql`${orders.status} IN ('pending','in_progress','delivered','revision_requested')`)).then((r) => r[0].v),
      db.select({ v: count() }).from(orders).where(and(eq(orders.editorId, editorId), sql`${orders.status} = 'completed'`)).then((r) => r[0].v),
      db.select({ v: sql<number>`COALESCE(SUM(${orders.totalAmount} - ${orders.commissionAmount}),0)::int` }).from(orders).where(and(eq(orders.editorId, editorId), sql`${orders.status} = 'completed'`)).then((r) => r[0].v),
    ]),
  ]);

  const [totalOrders, activeOrders, completedOrders, totalEarned] = allCounts;
  const totalPages = Math.ceil(filteredTotal / PAGE_SIZE);
  const statValues = [totalOrders, activeOrders, completedOrders, formatCurrency(totalEarned as number)];

  function pageHref(p: number) {
    const q = new URLSearchParams();
    if (statusFilter) q.set("status", statusFilter);
    if (p > 1) q.set("page", String(p));
    const qs = q.toString();
    return `/editor/orders${qs ? `?${qs}` : ""}`;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-100">
        <div className="max-w-4xl mx-auto px-6 py-5 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Orders</h1>
            <p className="text-sm text-gray-400 mt-0.5">Manage and fulfil your client work</p>
          </div>
          <span className="text-xs text-gray-400 font-medium tabular-nums">
            {filteredTotal === 0
              ? "No orders"
              : `${(page - 1) * PAGE_SIZE + 1}–${Math.min(page * PAGE_SIZE, filteredTotal)} of ${filteredTotal}`}
          </span>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-6 space-y-6">
        {/* Stat cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {STAT_CONFIG.map(({ label, icon: Icon, iconCls, iconBg, topBorder, numCls }, i) => (
            <div
              key={label}
              className={cn("rounded-2xl border border-gray-100 bg-white p-4 shadow-sm", topBorder)}
            >
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs text-gray-500">{label}</p>
                <div className={cn("w-7 h-7 rounded-lg flex items-center justify-center", iconBg)}>
                  <Icon className={cn("w-3.5 h-3.5", iconCls)} />
                </div>
              </div>
              <p className={cn("text-xl font-bold tabular-nums", numCls)}>{statValues[i]}</p>
            </div>
          ))}
        </div>

        {/* Status tabs */}
        <div
          className="flex gap-1.5 overflow-x-auto pb-0.5"
          style={{ scrollbarWidth: "none" }}
        >
          {STATUS_TABS.map((tab) => (
            <Link
              key={tab.value}
              href={tab.value ? `/editor/orders?status=${tab.value}` : "/editor/orders"}
              className={cn(
                "px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-colors shrink-0",
                statusFilter === tab.value
                  ? "bg-[#0EA5E9] text-white"
                  : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"
              )}
            >
              {tab.label}
            </Link>
          ))}
        </div>

        {/* Order cards */}
        {rows.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-gray-200 bg-white flex flex-col items-center justify-center py-16 text-center">
            <div className="w-12 h-12 rounded-2xl bg-sky-50 flex items-center justify-center mb-3">
              <ShoppingBag className="w-6 h-6 text-[#0EA5E9]" />
            </div>
            <p className="font-semibold text-gray-800 text-sm">No orders found</p>
            <p className="text-xs text-gray-400 mt-1">
              {statusFilter
                ? `No ${statusFilter.replace("_", " ")} orders yet.`
                : "Orders from clients will appear here."}
            </p>
            {!statusFilter && (
              <Link
                href="/editor/profile"
                className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#0EA5E9] text-white text-xs font-semibold hover:bg-sky-600 transition-colors"
              >
                Share your profile <ArrowRight className="w-3 h-3" />
              </Link>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {rows.map((order) => {
              const cfg = STATUS_CONFIG[order.status] ?? STATUS_CONFIG.pending;
              const Icon = cfg.icon;
              const payout = order.totalAmount - order.commissionAmount;
              const clientName = displayNameFromFull(order.clientName);
              const clientInitials = (order.clientName ?? "")
                .split(" ")
                .filter(Boolean)
                .map((n) => n[0])
                .slice(0, 2)
                .join("")
                .toUpperCase();
              const isDone = ["completed", "cancelled"].includes(order.status);

              return (
                <div
                  key={order.id}
                  className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden flex"
                >
                  {/* Status stripe */}
                  <div className={cn("w-1 shrink-0", cfg.stripe)} />

                  <div className="flex-1 min-w-0">
                    {/* Card header */}
                    <div className="px-5 pt-4 pb-3 border-b border-gray-50 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        {/* Client avatar */}
                        <div className="w-8 h-8 rounded-full bg-[#0EA5E9]/10 flex items-center justify-center text-xs font-bold text-[#0EA5E9] shrink-0 uppercase select-none">
                          {clientInitials || "?"}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-gray-900 truncate">
                            {clientName}
                          </p>
                        </div>
                        <span
                          className={cn(
                            "inline-flex items-center gap-1.5 text-[10px] font-semibold px-2.5 py-1 rounded-full shrink-0",
                            cfg.badge
                          )}
                        >
                          <Icon className="w-3 h-3" />
                          {cfg.label}
                        </span>
                      </div>
                      <span className="text-xs text-gray-400 shrink-0 tabular-nums">
                        {formatDate(order.createdAt)}
                      </span>
                    </div>

                    {/* Card body */}
                    <div className="px-5 py-3.5 flex items-center justify-between gap-4">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-800 truncate">
                          {order.packageTitle ?? "Custom Quote Order"}
                        </p>
                        {order.packageTier && (
                          <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
                            {TIER_LABELS[order.packageTier] ?? order.packageTier}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-5 shrink-0">
                        {/* Deadline */}
                        <div className="text-right hidden sm:block">
                          {order.deadline && !isDone ? (
                            <DeadlineCountdown deadline={order.deadline.toISOString()} />
                          ) : (
                            <span className="text-xs text-gray-400">
                              {order.deadline ? formatDate(order.deadline) : "—"}
                            </span>
                          )}
                        </div>

                        {/* Payout */}
                        <p className="text-base font-bold text-[#0EA5E9] tabular-nums">
                          {formatCurrency(payout)}
                        </p>

                        {/* View */}
                        <Link
                          href={`/editor/orders/${order.id}`}
                          className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center text-gray-500 hover:bg-gray-50 transition-colors"
                        >
                          <ArrowRight className="w-3.5 h-3.5" />
                        </Link>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between">
            <p className="text-xs text-gray-400 tabular-nums">
              Page {page} of {totalPages}
            </p>
            <div className="flex items-center gap-2">
              <Link
                href={pageHref(page - 1)}
                aria-disabled={page <= 1}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-2 rounded-xl border text-xs font-medium transition-colors",
                  page <= 1
                    ? "border-gray-100 text-gray-300 pointer-events-none"
                    : "border-gray-200 text-gray-600 hover:bg-gray-50"
                )}
              >
                <ChevronLeft className="w-3.5 h-3.5" /> Previous
              </Link>
              <Link
                href={pageHref(page + 1)}
                aria-disabled={page >= totalPages}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-2 rounded-xl border text-xs font-medium transition-colors",
                  page >= totalPages
                    ? "border-gray-100 text-gray-300 pointer-events-none"
                    : "border-gray-200 text-gray-600 hover:bg-gray-50"
                )}
              >
                Next <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
