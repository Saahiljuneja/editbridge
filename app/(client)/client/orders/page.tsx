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
import { TopoBackground } from "@/components/common/topo-background";

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
    <div className="relative min-h-screen bg-[#ffffff] pb-12 overflow-hidden">
      {/* Topographic backdrop */}
      <TopoBackground background="#ffffff" strokeColor="#f3f4f6" opacity={0.6} />

      <div className="max-w-4xl mx-auto px-6 pt-6 space-y-6 relative z-10">
        {/* Header Card */}
        <div className="bg-[#ffffff] rounded-3xl border border-neutral-200/50 p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm relative z-10">
          <div>
            <h1 className="text-2xl font-black text-neutral-900 tracking-tight leading-none">My Orders</h1>
            <p className="text-xs text-neutral-400 font-semibold mt-1.5">Track and manage all your orders</p>
          </div>
          <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto">
            <a
              href="/api/client/orders/export"
              download
              className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl border border-neutral-200 bg-[#ffffff] hover:bg-neutral-50 text-xs font-bold text-neutral-700 transition-colors shadow-sm"
            >
              <Download className="w-3.5 h-3.5" /> Export CSV
            </a>
            <Link
              href="/browse"
              className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-4.5 py-2.5 rounded-xl text-xs font-bold text-white bg-black hover:bg-neutral-900 transition-colors shadow-sm"
            >
              <Search className="w-3.5 h-3.5" /> Browse editors
            </Link>
          </div>
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-3 gap-4">
          {STAT_CONFIG.map(({ label, value, icon: Icon, iconCls, iconBg, topBorder, numCls }) => (
            <div
              key={label}
              className={cn(
                "bg-[#ffffff] rounded-3xl border border-neutral-200/50 border-t-2 shadow-sm px-5 py-4",
                topBorder
              )}
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className={cn("text-2xl font-black tabular-nums", numCls)}>{value}</p>
                  <p className="text-[10px] text-neutral-400 mt-0.5 font-bold uppercase tracking-wider">{label}</p>
                </div>
                <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center", iconBg)}>
                  <Icon className={cn("w-5 h-5", iconCls)} />
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Status filter tabs (capsule layout) */}
        <div className="inline-flex items-center gap-1 bg-[#f3f4f6] rounded-[18px] border border-neutral-200/50 p-1 overflow-x-auto scrollbar-none max-w-full">
          {STATUS_TABS.map((tab) => (
            <Link
              key={tab.value}
              href={tab.value ? `/client/orders?status=${tab.value}` : "/client/orders"}
              className={cn(
                "text-[11px] font-bold px-3.5 py-1.5 rounded-[14px] transition-all whitespace-nowrap shrink-0",
                statusFilter === tab.value
                  ? "bg-[#000000] text-white shadow-sm"
                  : "text-neutral-500 hover:text-neutral-900"
              )}
            >
              {tab.label}
            </Link>
          ))}
        </div>

        {/* Result count */}
        {countRow && countRow.count > 0 && (
          <p className="text-xs text-neutral-400 font-semibold">
            Showing {(page - 1) * PAGE_SIZE + 1}–
            {Math.min(page * PAGE_SIZE, countRow.count)} of {countRow.count} orders
          </p>
        )}

        {/* Orders list — animated client component */}
        <OrdersListClient rows={rows} hasFilter={!!statusFilter} />

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between pt-2">
            <p className="text-xs text-neutral-400 font-semibold">
              Page {page} of {totalPages}
            </p>
            <div className="flex items-center gap-2">
              <Link
                href={pageHref(page - 1)}
                aria-disabled={page <= 1}
                className={cn(
                  "flex items-center gap-1 px-3 py-1.5 rounded-xl border border-neutral-200 text-xs font-bold text-neutral-700 bg-[#ffffff] transition-colors shadow-sm",
                  page <= 1
                    ? "opacity-40 pointer-events-none"
                    : "hover:bg-neutral-50"
                )}
              >
                <ChevronLeft className="w-3.5 h-3.5" /> Previous
              </Link>
              <Link
                href={pageHref(page + 1)}
                aria-disabled={page >= totalPages}
                className={cn(
                  "flex items-center gap-1 px-3 py-1.5 rounded-xl border border-neutral-200 text-xs font-bold text-neutral-700 bg-[#ffffff] transition-colors shadow-sm",
                  page >= totalPages
                    ? "opacity-40 pointer-events-none"
                    : "hover:bg-neutral-50"
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
