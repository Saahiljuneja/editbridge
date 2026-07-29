export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { orders, packages, editors, users } from "@/lib/db/schema";
import { and, eq, desc, sql } from "drizzle-orm";
import { ShoppingBag, Clock, CheckCircle2, Search, Download, ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { OrdersListClient } from "./orders-list-client";

const STATUS_TABS = [
  { value: "",                   label: "All" },
  { value: "pending",            label: "Pending" },
  { value: "in_progress",        label: "In Progress" },
  { value: "delivered",          label: "Delivered" },
  { value: "revision_requested", label: "Revision" },
  { value: "completed",          label: "Completed" },
  { value: "cancelled",          label: "Cancelled" },
];

const PAGE_SIZE = 20;

export default async function ClientOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; page?: string }>;
}) {
  const session = await auth();
  if (!session) redirect("/login");

  const params = await searchParams;
  const statusFilter = params.status ?? "";
  const page = Math.max(1, Number(params.page ?? "1"));
  const userId = session.user.userId!;

  const conditions = [eq(orders.clientId, userId)];
  if (statusFilter) conditions.push(sql`${orders.status} = ${statusFilter}`);

  const [rows, statsRow, countRow] = await Promise.all([
    db
      .select({
        id: orders.id,
        status: orders.status,
        totalAmount: orders.totalAmount,
        deadline: orders.deadline,
        createdAt: orders.createdAt,
        packageTitle: packages.title,
        packageTier: packages.tier,
        editorName: users.name,
      })
      .from(orders)
      .leftJoin(packages, eq(packages.id, orders.packageId))
      .innerJoin(editors, eq(editors.id, orders.editorId))
      .innerJoin(users, eq(users.id, editors.userId))
      .where(and(...conditions))
      .orderBy(desc(orders.createdAt))
      .limit(PAGE_SIZE)
      .offset((page - 1) * PAGE_SIZE),

    db
      .select({
        total:     sql<number>`COUNT(*)::int`,
        active:    sql<number>`COUNT(*) FILTER (WHERE ${orders.status} NOT IN ('completed','cancelled'))::int`,
        completed: sql<number>`COUNT(*) FILTER (WHERE ${orders.status} = 'completed')::int`,
      })
      .from(orders)
      .where(eq(orders.clientId, userId))
      .then((r) => r[0]),

    db
      .select({ count: sql<number>`COUNT(*)::int` })
      .from(orders)
      .where(and(...conditions))
      .then((r) => r[0]),
  ]);

  const totalPages = Math.ceil((countRow?.count ?? 0) / PAGE_SIZE);

  function pageHref(p: number) {
    const qs = new URLSearchParams();
    if (statusFilter) qs.set("status", statusFilter);
    if (p > 1) qs.set("page", String(p));
    return `/client/orders${qs.toString() ? `?${qs}` : ""}`;
  }

  const STAT_CONFIG = [
    {
      label: "Total Orders",
      value: statsRow?.total ?? 0,
      icon: ShoppingBag,
      iconCls: "text-gray-500",
      iconBg: "bg-gray-100",
      topBorder: "border-t-gray-300",
      numCls: "text-gray-900",
    },
    {
      label: "Active",
      value: statsRow?.active ?? 0,
      icon: Clock,
      iconCls: "text-[#0EA5E9]",
      iconBg: "bg-sky-50",
      topBorder: "border-t-[#0EA5E9]",
      numCls: "text-[#0EA5E9]",
    },
    {
      label: "Completed",
      value: statsRow?.completed ?? 0,
      icon: CheckCircle2,
      iconCls: "text-emerald-600",
      iconBg: "bg-emerald-50",
      topBorder: "border-t-emerald-500",
      numCls: "text-emerald-700",
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-100">
        <div className="max-w-4xl mx-auto px-6 py-5 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">My Orders</h1>
            <p className="text-sm text-gray-400 mt-0.5">Track and manage all your orders</p>
          </div>
          <div className="flex items-center gap-2">
            <a
              href="/api/client/orders/export"
              download
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
            >
              <Download className="w-3.5 h-3.5" /> Export CSV
            </a>
            <Link
              href="/browse"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white bg-[#0EA5E9] hover:bg-sky-600 transition-colors"
            >
              <Search className="w-3.5 h-3.5" /> Browse editors
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-6 space-y-5">
        {/* Stat cards */}
        <div className="grid grid-cols-3 gap-4">
          {STAT_CONFIG.map(({ label, value, icon: Icon, iconCls, iconBg, topBorder, numCls }) => (
            <div
              key={label}
              className={cn(
                "bg-white rounded-2xl border border-gray-100 border-t-2 shadow-sm px-5 py-4",
                topBorder
              )}
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className={cn("text-2xl font-bold tabular-nums", numCls)}>{value}</p>
                  <p className="text-xs text-gray-400 mt-0.5 font-medium">{label}</p>
                </div>
                <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center", iconBg)}>
                  <Icon className={cn("w-5 h-5", iconCls)} />
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Status filter tabs */}
        <div
          className="flex gap-1.5 overflow-x-auto pb-0.5"
          style={{ scrollbarWidth: "none" }}
        >
          {STATUS_TABS.map((tab) => (
            <Link
              key={tab.value}
              href={tab.value ? `/client/orders?status=${tab.value}` : "/client/orders"}
              className={cn(
                "px-3.5 py-1.5 rounded-full text-sm font-medium transition-colors whitespace-nowrap shrink-0",
                statusFilter === tab.value
                  ? "bg-[#0EA5E9] text-white shadow-sm"
                  : "bg-white border border-gray-200 text-gray-600 hover:border-sky-300 hover:text-[#0EA5E9]"
              )}
            >
              {tab.label}
            </Link>
          ))}
        </div>

        {/* Result count */}
        {countRow && countRow.count > 0 && (
          <p className="text-xs text-gray-400">
            Showing {(page - 1) * PAGE_SIZE + 1}–
            {Math.min(page * PAGE_SIZE, countRow.count)} of {countRow.count} orders
          </p>
        )}

        {/* Orders list — animated client component */}
        <OrdersListClient rows={rows} hasFilter={!!statusFilter} />

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between pt-2">
            <p className="text-xs text-gray-400">
              Page {page} of {totalPages}
            </p>
            <div className="flex items-center gap-2">
              <Link
                href={pageHref(page - 1)}
                aria-disabled={page <= 1}
                className={cn(
                  "flex items-center gap-1 px-3 py-1.5 rounded-xl border text-xs font-medium transition-colors",
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
                  "flex items-center gap-1 px-3 py-1.5 rounded-xl border text-xs font-medium transition-colors",
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
