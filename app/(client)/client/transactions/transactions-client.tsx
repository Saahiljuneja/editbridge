"use client";

import { useState } from "react";
import { formatCurrency, formatDate } from "@/lib/utils";
import { downloadCSV } from "@/lib/csv";
import { Download, Search, ExternalLink } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

type TxnRow = {
  id: string;
  status: string;
  totalAmount: number;
  processingFee: number;
  creditApplied: number;
  razorpayOrderId: string | null;
  razorpayPaymentId: string | null;
  createdAt: string;
  completedAt: string | null;
  cancelledAt: string | null;
  packageTitle: string | null;
  editorName: string | null;
};

const STATUS_STYLES: Record<string, { label: string; cls: string }> = {
  completed:          { label: "Paid",        cls: "bg-emerald-100 text-emerald-700" },
  cancelled:          { label: "Cancelled",   cls: "bg-gray-100 text-gray-500" },
  pending:            { label: "Pending",     cls: "bg-amber-100 text-amber-700" },
  in_progress:        { label: "In Progress", cls: "bg-blue-100 text-blue-700" },
  delivered:          { label: "Delivered",   cls: "bg-violet-100 text-violet-700" },
  revision_requested: { label: "Revision",    cls: "bg-orange-100 text-orange-700" },
  disputed:           { label: "Disputed",    cls: "bg-red-100 text-red-700" },
};

export function TransactionsClient({ rows }: { rows: TxnRow[] }) {
  const [filter, setFilter] = useState<"all" | "completed" | "active" | "cancelled">("all");
  const [search, setSearch] = useState("");

  const filtered = rows.filter((r) => {
    if (filter === "completed" && r.status !== "completed") return false;
    if (filter === "cancelled" && r.status !== "cancelled") return false;
    if (filter === "active" && !["pending", "in_progress", "delivered", "revision_requested"].includes(r.status)) return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        (r.packageTitle ?? "").toLowerCase().includes(q) ||
        (r.editorName ?? "").toLowerCase().includes(q) ||
        (r.razorpayPaymentId ?? "").toLowerCase().includes(q)
      );
    }
    return true;
  });

  function exportCSV() {
    downloadCSV("transactions.csv", filtered.map((r) => ({
      "Date": formatDate(new Date(r.createdAt)),
      "Package": r.packageTitle ?? "",
      "Editor": r.editorName ?? "",
      "Status": STATUS_STYLES[r.status]?.label ?? r.status,
      "Amount (₹)": (r.totalAmount / 100).toFixed(2),
      "Platform fee (₹)": (r.processingFee / 100).toFixed(2),
      "Credit applied (₹)": (r.creditApplied / 100).toFixed(2),
      "Razorpay Order": r.razorpayOrderId ?? "",
      "Razorpay Payment": r.razorpayPaymentId ?? "",
    })));
  }

  return (
    <div className="rounded-2xl border border-gray-100 bg-white shadow-sm overflow-hidden">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 px-5 py-4 border-b border-gray-100">
        <div className="flex gap-1">
          {(["all", "completed", "active", "cancelled"] as const).map((f) => (
            <button key={f} onClick={() => setFilter(f)}
              className={cn("px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-colors",
                filter === f ? "bg-[var(--brand-client)] text-white" : "text-gray-500 hover:bg-gray-50")}>
              {f}
            </button>
          ))}
        </div>
        <div className="flex-1 flex items-center gap-2 sm:justify-end w-full sm:w-auto">
          <div className="relative flex-1 sm:flex-none sm:w-48">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-300" />
            <input value={search} onChange={(e) => setSearch(e.target.value)}
              placeholder="Search…"
              className="w-full rounded-lg border border-gray-200 pl-8 pr-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-[var(--brand-client)]/20" />
          </div>
          <button onClick={exportCSV}
            className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 hover:text-gray-800 border border-gray-200 px-3 py-2 rounded-lg transition-colors shrink-0">
            <Download className="w-3.5 h-3.5" /> Export
          </button>
        </div>
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-12">No transactions found.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left border-b border-gray-50">
                <th className="px-5 py-3 text-xs font-semibold text-gray-400 font-variant-numeric-tabular">Date</th>
                <th className="px-5 py-3 text-xs font-semibold text-gray-400">Package</th>
                <th className="px-5 py-3 text-xs font-semibold text-gray-400">Status</th>
                <th className="px-5 py-3 text-xs font-semibold text-gray-400 text-right">Amount</th>
                <th className="px-5 py-3 text-xs font-semibold text-gray-400">Payment ID</th>
                <th className="px-5 py-3 text-xs font-semibold text-gray-400"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map((row) => {
                const s = STATUS_STYLES[row.status];
                return (
                  <tr key={row.id} className="hover:bg-gray-50/60 transition-colors">
                    <td className="px-5 py-4 text-xs text-gray-500 whitespace-nowrap">
                      {formatDate(new Date(row.createdAt))}
                    </td>
                    <td className="px-5 py-4">
                      <p className="text-sm font-medium text-gray-900 truncate max-w-[160px]">{row.packageTitle ?? "Order"}</p>
                      <p className="text-xs text-gray-400 truncate max-w-[160px]">{row.editorName}</p>
                    </td>
                    <td className="px-5 py-4">
                      <span className={cn("text-[11px] font-semibold px-2 py-0.5 rounded-full", s?.cls ?? "bg-gray-100 text-gray-500")}>
                        {s?.label ?? row.status}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-sm font-bold text-gray-900 text-right whitespace-nowrap">
                      {formatCurrency(row.totalAmount)}
                      {row.creditApplied > 0 && (
                        <p className="text-[10px] text-emerald-600 font-normal">−{formatCurrency(row.creditApplied)} credit</p>
                      )}
                    </td>
                    <td className="px-5 py-4 text-xs text-gray-400 font-mono whitespace-nowrap max-w-[120px] truncate">
                      {row.razorpayPaymentId ?? "—"}
                    </td>
                    <td className="px-5 py-4">
                      <Link href={`/orders/${row.id}`}
                        className="text-xs font-semibold text-[var(--brand-client)] hover:underline flex items-center gap-1">
                        View <ExternalLink className="w-3 h-3" />
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
