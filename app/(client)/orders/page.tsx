export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { orders, packages, editors, users } from "@/lib/db/schema";
import { and, eq, desc, sql } from "drizzle-orm";
import { formatCurrency, formatDate } from "@/lib/utils";
import { ShoppingBag, Search, ArrowRight, ChevronLeft, ChevronRight, Download } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { DeadlineCountdown } from "@/components/orders/deadline-countdown";

const STATUS_STYLES: Record<string, { label: string; class: string }> = {
  pending:            { label: "Pending",            class: "bg-zinc-100 text-zinc-700" },
  in_progress:        { label: "In Progress",        class: "bg-blue-100 text-blue-700" },
  delivered:          { label: "Delivered",          class: "bg-purple-100 text-purple-700" },
  revision_requested: { label: "Revision Requested", class: "bg-amber-100 text-amber-700" },
  disputed:           { label: "Disputed",           class: "bg-red-100 text-red-700" },
  completed:          { label: "Completed",          class: "bg-green-100 text-green-700" },
  cancelled:          { label: "Cancelled",          class: "bg-gray-100 text-gray-500" },
};

const STATUS_TABS = [
  { value: "",                  label: "All" },
  { value: "pending",           label: "Pending" },
  { value: "in_progress",       label: "In Progress" },
  { value: "delivered",         label: "Delivered" },
  { value: "revision_requested",label: "Revision" },
  { value: "completed",         label: "Completed" },
  { value: "cancelled",         label: "Cancelled" },
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
    db.select({
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

    db.select({
      total:     sql<number>`COUNT(*)::int`,
      active:    sql<number>`COUNT(*) FILTER (WHERE ${orders.status} NOT IN ('completed','cancelled'))::int`,
      completed: sql<number>`COUNT(*) FILTER (WHERE ${orders.status} = 'completed')::int`,
    }).from(orders).where(eq(orders.clientId, userId)).then((r) => r[0]),

    db.select({ count: sql<number>`COUNT(*)::int` })
      .from(orders).where(and(...conditions)).then((r) => r[0]),
  ]);

  const totalPages = Math.ceil((countRow?.count ?? 0) / PAGE_SIZE);

  function pageHref(p: number) {
    const qs = new URLSearchParams();
    if (statusFilter) qs.set("status", statusFilter);
    if (p > 1) qs.set("page", String(p));
    return `/orders${qs.toString() ? `?${qs}` : ""}`;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top bar */}
      <div className="bg-white border-b border-gray-100 px-6 py-5">
        <div className="px-8 py-6 flex items-center justify-between">
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
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white transition-colors"
              style={{ background: "#0EA5E9" }}
            >
              <Search className="w-3.5 h-3.5" /> Browse editors
            </Link>
          </div>
        </div>
      </div>

      <div className="px-8 py-6 space-y-5">
        {/* Stat chips */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: "Total Orders", value: statsRow?.total ?? 0, color: "text-gray-900" },
            { label: "Active",       value: statsRow?.active ?? 0,  color: "text-blue-600" },
            { label: "Completed",    value: statsRow?.completed ?? 0, color: "text-green-600" },
          ].map(({ label, value, color }) => (
            <div key={label} className="bg-white rounded-2xl border border-gray-100 shadow-sm px-5 py-4 text-center">
              <p className={cn("text-2xl font-bold", color)}>{value}</p>
              <p className="text-xs text-gray-400 mt-0.5">{label}</p>
            </div>
          ))}
        </div>

        {/* Status tabs */}
        <div className="flex gap-1.5 flex-wrap">
          {STATUS_TABS.map((tab) => (
            <Link
              key={tab.value}
              href={tab.value ? `/orders?status=${tab.value}` : "/orders"}
              className={cn(
                "px-3.5 py-1.5 rounded-xl text-sm font-medium transition-colors",
                statusFilter === tab.value
                  ? "bg-[#0EA5E9] text-white"
                  : "bg-white border border-gray-200 text-gray-600 hover:border-[#0EA5E9]/30 hover:text-[#0EA5E9]"
              )}
            >
              {tab.label}
            </Link>
          ))}
        </div>

        {/* Result count */}
        {countRow && countRow.count > 0 && (
          <p className="text-xs text-gray-400">
            Showing {(page - 1) * PAGE_SIZE + 1}&ndash;{Math.min(page * PAGE_SIZE, countRow.count)} of {countRow.count} orders
          </p>
        )}

        {/* Orders list */}
        {rows.length === 0 ? (
          <div className="rounded-2xl border border-gray-100 bg-white shadow-sm flex flex-col items-center justify-center py-20 text-center">
            <div className="w-14 h-14 rounded-2xl bg-gray-100 flex items-center justify-center mb-4">
              <ShoppingBag className="w-7 h-7 text-gray-400" />
            </div>
            <p className="font-semibold text-gray-800">No orders found</p>
            <p className="text-sm text-gray-400 mt-1 mb-5">
              {statusFilter ? `No ${statusFilter.replace("_", " ")} orders.` : "You haven't placed any orders yet."}
            </p>
            {!statusFilter && (
              <Link
                href="/browse"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white"
                style={{ background: "#0EA5E9" }}
              >
                <Search className="w-3.5 h-3.5" /> Browse editors
              </Link>
            )}
          </div>
        ) : (
          <div className="rounded-2xl border border-gray-100 bg-white shadow-sm overflow-hidden">
            <div className="divide-y divide-gray-50">
              {rows.map((order) => {
                const s = STATUS_STYLES[order.status];
                const isActive = !["completed", "cancelled"].includes(order.status);
                return (
                  <Link
                    key={order.id}
                    href={`/orders/${order.id}`}
                    className="flex items-center justify-between px-6 py-4 hover:bg-gray-50 transition-colors group"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        {s && <Badge className={cn("text-xs border-0 font-medium shrink-0", s.class)}>{s.label}</Badge>}
                        <p className="text-sm font-medium text-gray-900 truncate">{order.packageTitle ?? "Custom order"}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <p className="text-xs text-gray-400">{order.editorName ?? "Editor"}</p>
                        <span className="text-gray-200">Â·</span>
                        {isActive && order.deadline
                          ? <DeadlineCountdown deadline={order.deadline.toISOString()} />
                          : <span className="text-xs text-gray-400">
                              {order.deadline ? formatDate(order.deadline) : formatDate(order.createdAt)}
                            </span>
                        }
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0 ml-3">
                      <span className="font-bold text-sm text-gray-900">{formatCurrency(order.totalAmount)}</span>
                      <ArrowRight className="w-3.5 h-3.5 text-gray-300 group-hover:text-gray-500 transition-colors" />
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between pt-2">
            <p className="text-xs text-gray-400">Page {page} of {totalPages}</p>
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
