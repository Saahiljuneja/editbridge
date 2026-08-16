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
import { Search, X, Download, FileQuestion } from "lucide-react";

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
    <div className="px-8 py-8 relative min-h-screen">
      
      {/* Background ambient glowing gradient */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-blue-100/20 rounded-full blur-3xl pointer-events-none -z-10" />

      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <p className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-brand-primary mb-1">Operations Desk</p>
          <h1 className="text-3xl font-black text-gray-900 tracking-tight leading-none">Orders</h1>
          <p className="text-xs text-gray-400 mt-1.5 font-medium">{totalCount} total order{totalCount !== 1 ? "s" : ""}</p>
        </div>
        {session.user.role === "admin" && (
          <a
            href="/api/admin/export/orders"
            className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-white border border-gray-200 text-xs font-bold text-gray-700 hover:bg-gray-50 hover:border-gray-300 shadow-sm transition-all cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" /> Export CSV
          </a>
        )}
      </div>

      {/* Search and Advanced Filters Card */}
      <div className="bg-white rounded-3xl border border-gray-150 p-5 shadow-xl shadow-gray-100/20 mb-6 space-y-4">
        
        {/* Search row */}
        <form method="GET" className="space-y-3">
          {status && <input type="hidden" name="status" value={status} />}
          
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                name="q"
                defaultValue={q}
                placeholder="Search by client, editor, or package title…"
                className="w-full rounded-2xl border border-gray-200 pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary shadow-sm transition-all"
              />
            </div>
            
            <div className="flex gap-2">
              <button type="submit" className="px-5 py-2.5 rounded-2xl bg-brand-primary text-white text-sm font-bold hover:bg-brand-primary-hover transition-all shadow-md shadow-blue-800/15 cursor-pointer">
                Search
              </button>
              {(q || hasAdvancedFilter) && (
                <Link
                  href={`/admin/orders${status ? `?status=${status}` : ""}`}
                  className="px-4 py-2.5 rounded-2xl border border-gray-200 text-sm text-gray-500 hover:bg-gray-50 transition-all flex items-center justify-center gap-1.5"
                >
                  <X className="w-3.5 h-3.5" /> Clear
                </Link>
              )}
            </div>
          </div>

          {/* Advanced filters inputs row */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 pt-2 border-t border-gray-100">
            <input name="orderId" defaultValue={orderId} placeholder="Order ID (partial)" className="rounded-xl border border-gray-250 px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-brand-primary shadow-sm transition-all" />
            <input name="paymentId" defaultValue={paymentId} placeholder="Payment ID (Razorpay)" className="rounded-xl border border-gray-250 px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-brand-primary shadow-sm transition-all" />
            <input name="from" type="date" defaultValue={from} className="rounded-xl border border-gray-250 px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-brand-primary shadow-sm transition-all text-gray-500 font-bold" />
            <input name="to" type="date" defaultValue={to} className="rounded-xl border border-gray-250 px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-brand-primary shadow-sm transition-all text-gray-500 font-bold" />
            <input name="minAmount" type="number" defaultValue={minAmount} placeholder="Min ₹" min="0" className="rounded-xl border border-gray-250 px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-brand-primary shadow-sm transition-all" />
            <input name="maxAmount" type="number" defaultValue={maxAmount} placeholder="Max ₹" min="0" className="rounded-xl border border-gray-250 px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-brand-primary shadow-sm transition-all" />
          </div>
        </form>

        {/* Status Tab buttons segment */}
        <div className="flex items-center gap-3 border-t border-gray-100 pt-4 flex-wrap">
          <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Status filter:</span>
          <div className="inline-flex p-1 bg-gray-100/80 rounded-2xl gap-1 flex-wrap">
            {tabs.map((tab) => (
              <Link
                key={tab.value}
                href={tab.value ? `/admin/orders?status=${tab.value}${q ? `&q=${q}` : ""}` : `/admin/orders${q ? `?q=${q}` : ""}`}
                className={cn(
                  "px-4 py-2 rounded-xl text-xs font-bold transition-all duration-200 cursor-pointer",
                  (status ?? "") === tab.value
                    ? "bg-white text-brand-primary shadow-sm"
                    : "text-gray-500 hover:text-gray-900 hover:bg-white/50"
                )}
              >
                {tab.label}
              </Link>
            ))}
          </div>
        </div>

      </div>

      {/* Main Table or Empty state */}
      {rows.length === 0 ? (
        <div className="rounded-3xl border border-gray-100 bg-white p-16 text-center shadow-xl shadow-gray-100/30 flex flex-col items-center justify-center min-h-[340px]">
          <div className="w-16 h-16 rounded-full bg-blue-50 flex items-center justify-center mb-4 border border-blue-100 animate-pulse">
            <FileQuestion className="w-8 h-8 text-brand-primary" />
          </div>
          <h3 className="text-base font-bold text-gray-900">No orders found</h3>
          <p className="text-xs text-gray-455 max-w-sm mt-2 leading-relaxed">
            There are currently no orders registered on the platform matching your search criteria or selected status filters.
          </p>
          {(q || hasAdvancedFilter) && (
            <Link href="/admin/orders" className="mt-4 text-xs font-bold text-brand-primary bg-blue-50 hover:bg-blue-100 px-4 py-2 rounded-xl transition-all">
              Reset search & filters
            </Link>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          <div className="rounded-3xl border border-gray-150 overflow-hidden bg-white shadow-xl shadow-gray-100/25">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/70">
                  <th className="text-left px-5 py-4 font-bold text-gray-500 text-xs uppercase tracking-wider">Package</th>
                  <th className="text-left px-4 py-4 font-bold text-gray-500 text-xs uppercase tracking-wider">Client</th>
                  <th className="text-left px-4 py-4 font-bold text-gray-500 text-xs uppercase tracking-wider">Editor</th>
                  <th className="text-right px-4 py-4 font-bold text-gray-500 text-xs uppercase tracking-wider">Amount</th>
                  <th className="text-center px-4 py-4 font-bold text-gray-500 text-xs uppercase tracking-wider">Status</th>
                  <th className="text-left px-4 py-4 font-bold text-gray-500 text-xs uppercase tracking-wider">Date</th>
                  <th className="text-right px-5 py-4 font-bold text-gray-500 text-xs uppercase tracking-wider">Action</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50 transition-colors">
                    <td className="px-5 py-4.5 font-semibold text-gray-900 truncate max-w-[160px]">
                      {row.packageTitle ?? "Custom order"}
                    </td>
                    <td className="px-4 py-4.5">
                      <p className="text-gray-800 font-medium">{row.clientName ?? "-"}</p>
                      <p className="text-xs text-gray-400">{row.clientEmail}</p>
                    </td>
                    <td className="px-4 py-4.5 text-gray-600 font-medium">{row.editorName ?? "-"}</td>
                    <td className="px-4 py-4.5 text-right tabular-nums font-bold text-gray-900">{formatCurrency(row.totalAmount)}</td>
                    <td className="px-4 py-4.5 text-center">
                      <OrderStatusBadge status={row.status as Parameters<typeof OrderStatusBadge>[0]["status"]} />
                    </td>
                    <td className="px-4 py-4.5 text-gray-400 text-xs">
                      <p className="font-medium text-gray-650">{formatDate(row.createdAt)}</p>
                      {row.razorpayPaymentId && (
                        <p className="font-mono text-[9px] text-gray-350 truncate max-w-[110px] mt-0.5" title={row.razorpayPaymentId}>
                          {row.razorpayPaymentId}
                        </p>
                      )}
                    </td>
                    <td className="px-5 py-4.5 text-right">
                      <Link href={`/admin/orders/${row.id}`} className="text-xs font-bold text-brand-primary hover:underline bg-blue-50 hover:bg-blue-100 border border-blue-100 px-3 py-1.5 rounded-xl transition-all">
                        View
                      </Link>
                    </td>
                  </tr>
                ))}
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
              <div className="flex items-center justify-between px-1 py-2 text-sm">
                <p className="text-gray-400 font-medium">
                  Page {page} of {totalPages} · showing {offset + 1}–{Math.min(offset + PAGE_SIZE, totalCount)} of {totalCount}
                </p>
                <div className="flex gap-2">
                  {page > 1 && (
                    <Link href={`/admin/orders?${new URLSearchParams({ ...base, page: String(page - 1) }).toString()}`}
                      className="px-4 py-2 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors text-xs font-semibold">
                      ← Prev
                    </Link>
                  )}
                  {page < totalPages && (
                    <Link href={`/admin/orders?${new URLSearchParams({ ...base, page: String(page + 1) }).toString()}`}
                      className="px-4 py-2 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors text-xs font-semibold">
                      Next →
                    </Link>
                  )}
                </div>
              </div>
            );
          })()}
        </div>
      )}
    </div>
  );
}
