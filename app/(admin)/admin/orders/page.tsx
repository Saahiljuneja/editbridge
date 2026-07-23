import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { orders, packages, users, editors } from "@/lib/db/schema";
import { eq, desc, sql, and, count, gte, lte } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { formatCurrency, formatDate } from "@/lib/utils";
import { OrderStatusBadge } from "@/components/orders/order-status-badge";
import Link from "next/link";
import { cn } from "@/lib/utils";
import type { UserRole } from "@/types";

export const dynamic = "force-dynamic";

const ALLOWED: UserRole[] = ["admin", "staff_support", "staff_dispute"];

const PAGE_SIZE = 25;

export default async function AdminOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{
    status?: string; q?: string; page?: string;
    orderId?: string; paymentId?: string;
    from?: string; to?: string;
    minAmount?: string; maxAmount?: string;
  }>;
}) {
  const session = await auth();
  if (!session || !ALLOWED.includes(session.user.role as UserRole)) redirect("/admin/dashboard");

  const { status, q, page: pageParam, orderId, paymentId, from, to, minAmount, maxAmount } = await searchParams;
  const page = Math.max(1, parseInt(pageParam ?? "1", 10));
  const offset = (page - 1) * PAGE_SIZE;

  const clientUsers = alias(users, "client_users");
  const editorUsers = alias(users, "editor_users");

  const whereClause = and(
    status ? sql`${orders.status} = ${status}` : undefined,
    q
      ? sql`(
          ${clientUsers.name} ILIKE ${"%" + q + "%"}
          OR ${clientUsers.email} ILIKE ${"%" + q + "%"}
          OR ${editorUsers.name} ILIKE ${"%" + q + "%"}
          OR ${packages.title} ILIKE ${"%" + q + "%"}
        )`
      : undefined,
    orderId ? sql`${orders.id}::text ILIKE ${"%" + orderId.trim() + "%"}` : undefined,
    paymentId ? sql`${orders.razorpayPaymentId} ILIKE ${"%" + paymentId.trim() + "%"}` : undefined,
    from ? gte(orders.createdAt, new Date(from)) : undefined,
    to ? lte(orders.createdAt, new Date(to + "T23:59:59")) : undefined,
    minAmount ? gte(orders.totalAmount, parseInt(minAmount) * 100) : undefined,
    maxAmount ? lte(orders.totalAmount, parseInt(maxAmount) * 100) : undefined,
  );

  const hasAdvancedFilter = !!(orderId || paymentId || from || to || minAmount || maxAmount);

  const [rows, [countRow]] = await Promise.all([
    db
      .select({
        id: orders.id,
        status: orders.status,
        totalAmount: orders.totalAmount,
        createdAt: orders.createdAt,
        packageTitle: packages.title,
        clientName: clientUsers.name,
        clientEmail: clientUsers.email,
        editorName: editorUsers.name,
        razorpayPaymentId: orders.razorpayPaymentId,
      })
      .from(orders)
      .leftJoin(packages, eq(packages.id, orders.packageId))
      .innerJoin(clientUsers, eq(clientUsers.id, orders.clientId))
      .leftJoin(editors, eq(editors.id, orders.editorId))
      .leftJoin(editorUsers, eq(editorUsers.id, editors.userId))
      .where(whereClause)
      .orderBy(desc(orders.createdAt))
      .limit(PAGE_SIZE)
      .offset(offset),
    db
      .select({ total: count() })
      .from(orders)
      .leftJoin(packages, eq(packages.id, orders.packageId))
      .innerJoin(clientUsers, eq(clientUsers.id, orders.clientId))
      .leftJoin(editors, eq(editors.id, orders.editorId))
      .leftJoin(editorUsers, eq(editorUsers.id, editors.userId))
      .where(whereClause),
  ]);
  const totalCount = countRow?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  const tabs = [
    { label: "All",       value: "" },
    { label: "Pending",   value: "pending" },
    { label: "Active",    value: "in_progress" },
    { label: "Delivered", value: "delivered" },
    { label: "Completed", value: "completed" },
    { label: "Disputed",  value: "disputed" },
    { label: "Cancelled", value: "cancelled" },
  ];

  return (
    <div className="px-8 py-6 ">
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Orders</h1>
          <p className="text-sm text-gray-500 mt-0.5">{totalCount} order{totalCount !== 1 ? "s" : ""}</p>
        </div>
        {session.user.role === "admin" && (
          <a href="/api/admin/export/orders"
            className="flex items-center gap-2 px-4 py-2 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors">
            Export CSV
          </a>
        )}
      </div>

      <form method="GET" className="mb-5 space-y-3">
        {status && <input type="hidden" name="status" value={status} />}
        {/* Primary search row */}
        <div className="flex gap-2">
          <input
            name="q"
            defaultValue={q}
            placeholder="Search by client, editor, or package title..."
            className="flex-1 rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0EA5E9]/30"
          />
          <button type="submit" className="px-4 py-2 rounded-xl bg-[#0EA5E9] text-white text-sm font-medium hover:opacity-90 transition-opacity">
            Search
          </button>
          {(q || hasAdvancedFilter) && (
            <Link href={`/admin/orders${status ? `?status=${status}` : ""}`}
              className="px-4 py-2 rounded-xl border border-gray-200 text-sm text-gray-500 hover:bg-gray-50 transition-colors">
              Clear
            </Link>
          )}
        </div>
        {/* Advanced filters row */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
          <input
            name="orderId"
            defaultValue={orderId}
            placeholder="Order ID (partial)"
            className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-[#0EA5E9]/20"
          />
          <input
            name="paymentId"
            defaultValue={paymentId}
            placeholder="Payment ID (Razorpay)"
            className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-[#0EA5E9]/20"
          />
          <input
            name="from"
            type="date"
            defaultValue={from}
            className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-[#0EA5E9]/20"
          />
          <input
            name="to"
            type="date"
            defaultValue={to}
            className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-[#0EA5E9]/20"
          />
          <input
            name="minAmount"
            type="number"
            defaultValue={minAmount}
            placeholder="Min â‚¹"
            min="0"
            className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-[#0EA5E9]/20"
          />
          <input
            name="maxAmount"
            type="number"
            defaultValue={maxAmount}
            placeholder="Max â‚¹"
            min="0"
            className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-[#0EA5E9]/20"
          />
        </div>
      </form>

      <div className="flex gap-1.5 mb-5 flex-wrap">
        {tabs.map((tab) => (
          <Link key={tab.value}
            href={tab.value ? `/admin/orders?status=${tab.value}${q ? `&q=${q}` : ""}` : `/admin/orders${q ? `?q=${q}` : ""}`}
            className={cn(
              "px-3 py-1.5 rounded-lg text-xs font-medium transition-colors",
              (status ?? "") === tab.value
                ? "bg-[#0EA5E9] text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            )}>
            {tab.label}
          </Link>
        ))}
      </div>

      <div className="rounded-2xl border border-gray-100 overflow-hidden bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50">
              <th className="text-left px-5 py-3 font-medium text-gray-500">Package</th>
              <th className="text-left px-4 py-3 font-medium text-gray-500">Client</th>
              <th className="text-left px-4 py-3 font-medium text-gray-500">Editor</th>
              <th className="text-right px-4 py-3 font-medium text-gray-500">Amount</th>
              <th className="text-center px-4 py-3 font-medium text-gray-500">Status</th>
              <th className="text-left px-4 py-3 font-medium text-gray-500">Date</th>
              <th className="text-right px-4 py-3 font-medium text-gray-500">Action</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50 transition-colors">
                <td className="px-5 py-3.5 font-medium text-gray-900 truncate max-w-[160px]">
                  {row.packageTitle ?? "Custom order"}
                </td>
                <td className="px-4 py-3.5">
                  <p className="text-gray-700">{row.clientName ?? "-"}</p>
                  <p className="text-xs text-gray-400">{row.clientEmail}</p>
                </td>
                <td className="px-4 py-3.5 text-gray-600">{row.editorName ?? "-"}</td>
                <td className="px-4 py-3.5 text-right tabular-nums font-medium">{formatCurrency(row.totalAmount)}</td>
                <td className="px-4 py-3.5 text-center">
                  <OrderStatusBadge status={row.status as Parameters<typeof OrderStatusBadge>[0]["status"]} />
                </td>
                <td className="px-4 py-3.5 text-gray-400 text-xs">
                  <p>{formatDate(row.createdAt)}</p>
                  {row.razorpayPaymentId && (
                    <p className="font-mono text-[10px] text-gray-300 truncate max-w-[100px]" title={row.razorpayPaymentId}>
                      {row.razorpayPaymentId}
                    </p>
                  )}
                </td>
                <td className="px-4 py-3.5 text-right">
                  <Link href={`/admin/orders/${row.id}`} className="text-xs font-semibold text-[#0EA5E9] hover:underline underline-offset-2">
                    View
                  </Link>
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={7} className="px-5 py-10 text-center text-gray-400 text-sm">
                  No orders found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (() => {
        const base = {
          ...(status ? { status } : {}), ...(q ? { q } : {}),
          ...(orderId ? { orderId } : {}), ...(paymentId ? { paymentId } : {}),
          ...(from ? { from } : {}), ...(to ? { to } : {}),
          ...(minAmount ? { minAmount } : {}), ...(maxAmount ? { maxAmount } : {}),
        };
        return (
          <div className="flex items-center justify-between mt-4 text-sm">
            <p className="text-gray-400">
              Page {page} of {totalPages} Â· showing {offset + 1}â€“{Math.min(offset + PAGE_SIZE, totalCount)} of {totalCount}
            </p>
            <div className="flex gap-2">
              {page > 1 && (
                <Link href={`/admin/orders?${new URLSearchParams({ ...base, page: String(page - 1) }).toString()}`}
                  className="px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors">
                  â† Prev
                </Link>
              )}
              {page < totalPages && (
                <Link href={`/admin/orders?${new URLSearchParams({ ...base, page: String(page + 1) }).toString()}`}
                  className="px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors">
                  Next â†’
                </Link>
              )}
            </div>
          </div>
        );
      })()}
    </div>
  );
}
