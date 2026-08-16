"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { DollarSign, Plus, Minus, History, Calendar } from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils";

type CreditTx = {
  id: string;
  amount: number;
  reason: string;
  expiresAt: string | null;
  usedAt: string | null;
  orderId: string | null;
  createdAt: string;
};

export function WalletCreditsWidget({
  userId,
  currentBalance,
  transactions,
}: {
  userId: string;
  currentBalance: number;
  transactions: CreditTx[];
}) {
  const router = useRouter();
  const [activeForm, setActiveForm] = useState<"grant" | "deduct" | null>(null);
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  async function handleAction(type: "grant" | "deduct") {
    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }
    setSubmitting(true);
    try {
      const endpoint = type === "grant" ? "credits" : "deduct-credits";
      const res = await fetch(`/api/admin/users/${userId}/${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amountInr: Number(amount),
          reason: reason || (type === "grant" ? "Admin grant" : "Admin deduction"),
          expiresAt: expiresAt ? new Date(expiresAt).toISOString() : undefined,
        }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        toast.error(d.error ?? "Action failed");
        return;
      }
      toast.success(`${type === "grant" ? "Granted" : "Deducted"} ₹${amount} successfully.`);
      setActiveForm(null);
      setAmount("");
      setReason("");
      setExpiresAt("");
      router.refresh();
    } catch {
      toast.error("Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm space-y-4 w-full">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <DollarSign className="w-5 h-5 text-emerald-500" />
          <div>
            <h3 className="font-semibold text-sm text-gray-900">Wallet & Credits</h3>
            <p className="text-xs text-gray-400">Current Balance: <span className="font-bold text-emerald-600">{formatCurrency(currentBalance)}</span></p>
          </div>
        </div>
        <div className="flex gap-1.5">
          <button
            onClick={() => setActiveForm(activeForm === "grant" ? null : "grant")}
            className="p-1.5 rounded-lg border border-emerald-100 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition-colors cursor-pointer"
            title="Grant Credits"
          >
            <Plus className="w-4 h-4" />
          </button>
          <button
            onClick={() => setActiveForm(activeForm === "deduct" ? null : "deduct")}
            className="p-1.5 rounded-lg border border-red-100 bg-red-50 text-red-700 hover:bg-red-100 transition-colors cursor-pointer"
            title="Deduct Credits"
          >
            <Minus className="w-4 h-4" />
          </button>
          <button
            onClick={() => setShowHistory(!showHistory)}
            className="p-1.5 rounded-lg border border-gray-100 bg-gray-50 text-gray-700 hover:bg-gray-100 transition-colors cursor-pointer"
            title="Transaction History"
          >
            <History className="w-4 h-4" />
          </button>
        </div>
      </div>

      {activeForm && (
        <div className="rounded-xl p-4 border border-blue-100 bg-blue-50/50 space-y-3">
          <p className="font-semibold text-xs text-blue-800 capitalize">{activeForm} Wallet Credits</p>
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-semibold text-gray-500 mb-1">Amount (₹)</label>
              <input
                type="number"
                min={0}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="e.g. 500"
                className="w-full rounded-lg border border-gray-200 px-3 py-1.5 text-xs bg-white focus:outline-none"
              />
            </div>
            {activeForm === "grant" && (
              <div>
                <label className="block text-[10px] font-semibold text-gray-500 mb-1">Expiry Date (Optional)</label>
                <input
                  type="date"
                  value={expiresAt}
                  onChange={(e) => setExpiresAt(e.target.value)}
                  className="w-full rounded-lg border border-gray-200 px-3 py-1.5 text-xs bg-white focus:outline-none"
                />
              </div>
            )}
          </div>
          <div>
            <label className="block text-[10px] font-semibold text-gray-500 mb-1">Reason</label>
            <input
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Refund, goodwill gesture, adjustment"
              className="w-full rounded-lg border border-gray-200 px-3 py-1.5 text-xs bg-white focus:outline-none"
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => activeForm && handleAction(activeForm)}
              disabled={submitting || !amount}
              className="px-3 py-1.5 rounded-lg bg-brand-primary hover:bg-brand-primary-hover text-white text-xs font-semibold disabled:opacity-50 transition-colors cursor-pointer"
            >
              {submitting ? "Processing…" : "Confirm"}
            </button>
            <button
              onClick={() => setActiveForm(null)}
              className="px-3 py-1.5 rounded-lg border border-gray-200 bg-white text-xs text-gray-600 hover:bg-gray-50 transition-colors cursor-pointer"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {showHistory && (
        <div className="rounded-xl border border-gray-150 overflow-hidden">
          <p className="bg-gray-50 text-[10px] font-bold text-gray-550 px-3 py-2 uppercase tracking-wider">Transaction History</p>
          {transactions.length === 0 ? (
            <p className="text-[11px] text-gray-400 py-3 text-center bg-white">No credit transactions recorded.</p>
          ) : (
            <div className="max-h-60 overflow-y-auto bg-white text-[11px]">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-gray-100 bg-neutral-50 font-medium text-gray-500">
                    <th className="px-3 py-1.5">Date</th>
                    <th className="px-3 py-1.5">Description</th>
                    <th className="px-3 py-1.5 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {transactions.map((tx) => {
                    const isDebit = tx.usedAt !== null;
                    return (
                      <tr key={tx.id} className="hover:bg-neutral-50/30">
                        <td className="px-3 py-1.5 text-gray-400 whitespace-nowrap">{formatDate(new Date(tx.createdAt))}</td>
                        <td className="px-3 py-1.5 font-medium">
                          {tx.reason}
                          {tx.expiresAt && (
                            <span className="text-[9px] text-amber-600 font-semibold block flex items-center gap-0.5 mt-0.5">
                              <Calendar className="w-2.5 h-2.5" /> Expires {formatDate(new Date(tx.expiresAt))}
                            </span>
                          )}
                          {tx.orderId && (
                            <span className="text-[9px] text-gray-400 block font-normal mt-0.5">Linked Order: #{tx.orderId.slice(0, 8)}</span>
                          )}
                        </td>
                        <td className={`px-3 py-1.5 text-right font-semibold tabular-nums ${isDebit ? "text-red-600" : "text-emerald-600"}`}>
                          {isDebit ? "-" : "+"}{formatCurrency(tx.amount)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
