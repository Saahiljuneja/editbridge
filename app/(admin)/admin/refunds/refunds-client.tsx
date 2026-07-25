"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { cn, formatCurrency, formatDate } from "@/lib/utils";
import { Search, RotateCcw, AlertTriangle } from "lucide-react";
import Link from "next/link";

interface Order {
  id: string;
  status: string;
  totalAmount: number;
  commissionAmount: number;
  razorpayPaymentId: string | null;
  createdAt: string;
  completedAt: string | null;
  cancelledAt: string | null;
  clientName: string | null;
  clientEmail: string | null;
  packageTitle: string | null;
}

const STATUS_COLORS: Record<string, string> = {
  completed: "bg-green-100 text-green-700",
  cancelled: "bg-red-100 text-red-700",
  disputed: "bg-amber-100 text-amber-700",
};

export function RefundsClient() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Order | null>(null);
  const [refundAmount, setRefundAmount] = useState("");
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetch("/api/admin/refunds")
      .then((r) => r.json())
      .then(setOrders)
      .catch(() => toast.error("Failed to load orders."))
      .finally(() => setLoading(false));
  }, []);

  const filtered = orders.filter((o) => {
    const q = search.toLowerCase();
    return (
      !q ||
      o.id.includes(q) ||
      o.clientName?.toLowerCase().includes(q) ||
      o.clientEmail?.toLowerCase().includes(q) ||
      o.packageTitle?.toLowerCase().includes(q) ||
      (o.razorpayPaymentId?.toLowerCase().includes(q) ?? false)
    );
  });

  function openRefund(order: Order) {
    setSelected(order);
    setRefundAmount((order.totalAmount / 100).toFixed(2));
    setReason("");
  }

  async function handleRefund(e: React.FormEvent) {
    e.preventDefault();
    if (!selected) return;
    const amountPaise = Math.round(parseFloat(refundAmount) * 100);
    if (isNaN(amountPaise) || amountPaise < 100) {
      toast.error("Minimum refund amount is â‚¹1.");
      return;
    }
    if (amountPaise > selected.totalAmount) {
      toast.error("Refund cannot exceed order total.");
      return;
    }
    if (!confirm(`Issue â‚¹${(amountPaise / 100).toFixed(2)} refund to ${selected.clientName ?? "client"}?`)) return;

    setSubmitting(true);
    try {
      const res = await fetch("/api/admin/refunds", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId: selected.id, amount: amountPaise, reason }),
      });
      const data = await res.json();
      if (!res.ok) {
        const firstErr = Object.values(data.error ?? {}).flat()[0] as string | undefined;
        toast.error(firstErr ?? data.error ?? "Refund failed.");
        return;
      }
      toast.success("Refund issued via Razorpay. It will reflect in 5â€“7 business days.");
      setSelected(null);
    } catch { toast.error("Something went wrong."); }
    finally { setSubmitting(false); }
  }

  return (
    <div className="px-8 py-6 space-y-5">

      {/* Warning banner */}
      <div className=”rounded-2xl border border-amber-200 dark:border-amber-800/40 bg-amber-50 dark:bg-amber-900/20 px-5 py-3.5 flex items-center gap-3”>
        <AlertTriangle className=”w-4 h-4 text-amber-500 shrink-0” />
        <p className=”text-sm text-amber-800 dark:text-amber-300”>
          Refunds are irreversible and processed immediately via Razorpay. Double-check the amount before confirming.
        </p>
      </div>

      {/* Search */}
      <div className=”relative”>
        <Search className=”absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500” />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder=”Search by client, order ID, package, or payment ID…”
          className=”w-full pl-10 pr-4 py-2.5 a-input rounded-xl”
        />
      </div>

      {/* Orders table */}
      <div className=”a-card overflow-hidden”>
        <div className=”px-5 py-3.5 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between”>
          <p className=”font-semibold text-gray-900 dark:text-white text-sm”>Refundable orders</p>
          <span className=”text-xs text-gray-400 dark:text-gray-500”>{filtered.length} orders</span>
        </div>

        {loading ? (
          <div className=”py-12 text-center text-sm text-gray-400 dark:text-gray-500 animate-pulse”>Loading…</div>
        ) : filtered.length === 0 ? (
          <div className=”a-empty”>No orders found.</div>
        ) : (
          <table className=”w-full text-sm”>
            <thead>
              <tr className=”border-b border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50”>
                <th className=”text-left px-5 py-3 font-medium text-gray-500 dark:text-gray-400”>Client</th>
                <th className=”text-left px-4 py-3 font-medium text-gray-500 dark:text-gray-400”>Package</th>
                <th className=”text-right px-4 py-3 font-medium text-gray-500 dark:text-gray-400”>Amount</th>
                <th className=”text-center px-4 py-3 font-medium text-gray-500 dark:text-gray-400”>Status</th>
                <th className=”text-right px-4 py-3 font-medium text-gray-500 dark:text-gray-400”>Date</th>
                <th className=”px-4 py-3” />
              </tr>
            </thead>
            <tbody>
              {filtered.map((order) => (
                <tr key={order.id} className=”border-b border-gray-50 dark:border-gray-800/50 last:border-0 hover:bg-gray-50/60 dark:hover:bg-gray-800/40 transition-colors”>
                  <td className=”px-5 py-3.5”>
                    <p className=”font-medium text-gray-900 dark:text-white”>{order.clientName ?? “Unknown”}</p>
                    <p className=”text-xs text-gray-400 dark:text-gray-500”>{order.clientEmail}</p>
                  </td>
                  <td className=”px-4 py-3.5”>
                    <Link href={`/admin/orders/${order.id}`} className=”text-[#0EA5E9] hover:underline font-medium”>
                      {order.packageTitle ?? “Custom”}
                    </Link>
                    {order.razorpayPaymentId && (
                      <p className=”text-[10px] text-gray-400 dark:text-gray-600 font-mono mt-0.5 truncate max-w-[180px]”>
                        {order.razorpayPaymentId}
                      </p>
                    )}
                  </td>
                  <td className=”px-4 py-3.5 text-right font-bold tabular-nums text-gray-900 dark:text-white”>
                    {formatCurrency(order.totalAmount)}
                  </td>
                  <td className=”px-4 py-3.5 text-center”>
                    <span className={cn(“px-2 py-0.5 rounded-full text-xs font-medium”, STATUS_COLORS[order.status] ?? “bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300”)}>
                      {order.status}
                    </span>
                  </td>
                  <td className=”px-4 py-3.5 text-right text-gray-400 dark:text-gray-500 text-xs tabular-nums”>
                    {formatDate(new Date(order.createdAt))}
                  </td>
                  <td className=”px-4 py-3.5 text-right”>
                    <button
                      onClick={() => openRefund(order)}
                      className=”flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800/50 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors”
                    >
                      <RotateCcw className=”w-3 h-3” /> Refund
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Refund modal */}
      {selected && (
        <div className=”fixed inset-0 z-50 flex items-center justify-center bg-black/60”>
          <div className=”bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-100 dark:border-gray-800 w-full max-w-md p-6”>
            <p className=”font-bold text-gray-900 dark:text-white mb-1”>Issue refund</p>
            <p className=”text-xs text-gray-400 dark:text-gray-500 mb-5”>
              {selected.packageTitle ?? “Custom order”} · {selected.clientName}
            </p>

            <form onSubmit={handleRefund} className=”space-y-4”>
              <div>
                <label className=”block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1”>
                  Refund amount (₹) — full order is {formatCurrency(selected.totalAmount)}
                </label>
                <input
                  type=”number”
                  step=”0.01”
                  min=”1”
                  max={(selected.totalAmount / 100).toFixed(2)}
                  value={refundAmount}
                  onChange={(e) => setRefundAmount(e.target.value)}
                  className=”w-full a-input rounded-xl px-3.5 py-2.5 font-mono”
                  required
                />
              </div>
              <div>
                <label className=”block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1”>Reason <span className=”text-red-500”>*</span></label>
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  rows={3}
                  placeholder=”Why is this refund being issued?”
                  className=”w-full a-input rounded-xl px-3.5 py-2.5 resize-none”
                  required
                  minLength={5}
                />
              </div>
              <div className=”flex gap-3 pt-1”>
                <button
                  type=”submit”
                  disabled={submitting}
                  className=”flex-1 py-2.5 rounded-xl text-sm font-bold text-white bg-red-600 hover:bg-red-700 disabled:opacity-50 transition-colors”
                >
                  {submitting ? “Processing…” : “Confirm refund”}
                </button>
                <button
                  type=”button”
                  onClick={() => setSelected(null)}
                  className=”flex-1 py-2.5 rounded-xl text-sm font-semibold text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors”
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
