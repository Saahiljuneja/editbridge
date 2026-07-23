import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { orders, packages, users } from "@/lib/db/schema";
import { and, eq, desc, sql, count } from "drizzle-orm";
import { OrderStatusBadge } from "@/components/orders/order-status-badge";
import { formatCurrency, formatDate, displayNameFromFull } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { ShoppingBag, ArrowRight, Clock, CheckCircle2, Loader2, ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import { DeadlineCountdown } from "@/components/orders/deadline-countdown";

const PAGE_SIZE = 25;

export const dynamic = "force-dynamic";


const STATUS_TABS = [
  { value: "",                   label: "All" },
  { value: "pending",            label: "Pending" },
  { value: "in_progress",        label: "In Progress" },
  { value: "revision_requested", label: "Revision" },
  { value: "delivered",          label: "Delivered" },
  { value: "completed",          label: "Completed" },
  { value: "cancelled",          label: "Cancelled" },
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

    db.select({ v: count() }).from(orders)
      .leftJoin(packages, eq(packages.id, orders.packageId))
      .innerJoin(users, eq(users.id, orders.clientId))
      .where(whereClause)
      .then((r) => r[0].v),

    // Counts for stat cards
    Promise.all([
      db.select({ v: count() }).from(orders).where(eq(orders.editorId, editorId)).then(r => r[0].v),
      db.select({ v: count() }).from(orders).where(and(eq(orders.editorId, editorId), sql`${orders.status} IN ('pending','in_progress','delivered','revision_requested')`)).then(r => r[0].v),
      db.select({ v: count() }).from(orders).where(and(eq(orders.editorId, editorId), sql`${orders.status} = 'completed'`)).then(r => r[0].v),
      db.select({ v: sql<number>`COALESCE(SUM(${orders.totalAmount} - ${orders.commissionAmount}),0)::int` }).from(orders).where(and(eq(orders.editorId, editorId), sql`${orders.status} = 'completed'`)).then(r => r[0].v),
    ]),
  ]);

  const [totalOrders, activeOrders, completedOrders, totalEarned] = allCounts;
  const totalPages = Math.ceil(filteredTotal / PAGE_SIZE);

  function pageHref(p: number) {
    const q = new URLSearchParams();
    if (statusFilter) q.set("status", statusFilter);
    if (p > 1) q.set("page", String(p));
    const qs = q.toString();
    return `/editor/orders${qs ? `?${qs}` : ""}`;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top bar */}
      <div className="bg-white border-b border-gray-100 px-6 py-5">
        <div className="px-8 py-6 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Orders</h1>
            <p className="text-sm text-gray-400 mt-0.5">Manage and fulfil your client work</p>
          </div>
          <span className="text-sm text-gray-400 font-medium">
            {filteredTotal === 0 ? "No orders" : `${(page - 1) * PAGE_SIZE + 1}–${Math.min(page * PAGE_SIZE, filteredTotal)} of ${filteredTotal}`}
          </span>
        </div>
      </div>

      <div className="px-8 py-6 space-y-6">

        {/* Stat cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: "Total Orders",    value: totalOrders,              icon: ShoppingBag,  color: "#0EA5E9", bg: "#0EA5E908" },
            { label: "Active",          value: activeOrders,             icon: Loader2,      color: "#0EA5E9", bg: "#0EA5E908" },
            { label: "Completed",       value: completedOrders,          icon: CheckCircle2, color: "#059669", bg: "#05966908" },
            { label: "Total Earned",    value: formatCurrency(totalEarned as number), icon: Clock, color: "#D97706", bg: "#D9770608" },
          ].map(({ label, value, icon: Icon, color, bg }) => (
            <div key={label} className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs text-gray-500">{label}</p>
                <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: bg }}>
                  <Icon className="w-3.5 h-3.5" style={{ color }} />
                </div>
              </div>
              <p className="text-xl font-bold text-gray-900">{value}</p>
            </div>
          ))}
        </div>

        {/* Status tabs */}
        <div className="flex gap-1.5 flex-wrap">
          {STATUS_TABS.map(tab => (
            <Link
              key={tab.value}
              href={tab.value ? `/editor/orders?status=${tab.value}` : "/editor/orders"}
              className={cn(
                "px-3 py-1.5 rounded-lg text-xs font-medium transition-colors",
                statusFilter === tab.value
                  ? "bg-[#0EA5E9] text-white"
                  : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"
              )}
            >
              {tab.label}
            </Link>
          ))}
        </div>

        {/* Orders table */}
        {rows.length === 0 ? (
          <div className="rounded-2xl border border-gray-100 bg-white shadow-sm flex flex-col items-center justify-center py-16 text-center">
            <div className="w-12 h-12 rounded-2xl bg-gray-100 flex items-center justify-center mb-3">
              <ShoppingBag className="w-6 h-6 text-gray-400" />
            </div>
            <p className="font-medium text-gray-700 text-sm">No orders found</p>
            <p className="text-xs text-gray-400 mt-1">
              {statusFilter ? `No ${statusFilter.replace("_", " ")} orders yet.` : "Orders from clients will appear here."}
            </p>
          </div>
        ) : (
          <div className="rounded-2xl border border-gray-100 overflow-hidden bg-white shadow-sm">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="text-left px-5 py-3 font-medium text-gray-500">Package</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500">Client</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500">Deadline</th>
                  <th className="text-center px-4 py-3 font-medium text-gray-500">Status</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-500">Payout</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-500"></th>
                </tr>
              </thead>
              <tbody>
                {rows.map(order => {
                  const payout = order.totalAmount - order.commissionAmount;
                  const isDone = ["completed", "cancelled"].includes(order.status);
                  return (
                    <tr key={order.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/60 transition-colors">
                      <td className="px-5 py-3.5">
                        <p className="font-medium text-gray-900 truncate max-w-[180px]">{order.packageTitle ?? "Custom order"}</p>
                      </td>
                      <td className="px-4 py-3.5 text-gray-600 text-sm">
                        {displayNameFromFull(order.clientName)}
                      </td>
                      <td className="px-4 py-3.5">
                        {order.deadline && !isDone
                          ? <DeadlineCountdown deadline={order.deadline.toISOString()} />
                          : <span className="text-xs text-gray-400">{order.deadline ? formatDate(order.deadline) : "No deadline"}</span>}
                      </td>
                      <td className="px-4 py-3.5 text-center">
                        <OrderStatusBadge status={order.status as Parameters<typeof OrderStatusBadge>[0]["status"]} />
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        <span className="font-bold text-[#0EA5E9]">{formatCurrency(payout)}</span>
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        <Link
                          href={`/editor/orders/${order.id}`}
                          className="inline-flex items-center gap-1 text-xs font-semibold text-[#0EA5E9] hover:underline"
                        >
                          View <ArrowRight className="w-3 h-3" />
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between">
            <p className="text-xs text-gray-400">Page {page} of {totalPages}</p>
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
