"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  Wallet, ArrowUpRight, ArrowDownLeft, Gift, Clock,
  CreditCard, Coins, Info
} from "lucide-react";
import { cn, formatCurrency } from "@/lib/utils";

type Transaction = {
  id: string;
  amount: number; // in paise
  reason: string;
  expiresAt: string | null;
  usedAt: string | null;
  createdAt: string;
};

export function ClientWalletClient() {
  const [balance, setBalance] = useState<number>(0);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/client/wallet")
      .then((res) => {
        if (!res.ok) throw new Error();
        return res.json();
      })
      .then((data) => {
        setBalance(data.balance);
        setTransactions(data.transactions);
      })
      .catch((err) => {
        console.error("Failed to load client wallet data", err);
        toast.error("Could not load wallet data.");
      })
      .finally(() => setLoading(false));
  }, []);

  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });

  const lifetimeSpent = transactions
    .filter((tx) => !!tx.usedAt)
    .reduce((sum, tx) => sum + tx.amount, 0);

  const totalRefunded = transactions
    .filter((tx) => tx.reason.toLowerCase().includes("refund"))
    .reduce((sum, tx) => sum + tx.amount, 0);

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto px-6 py-12 space-y-6 w-full flex flex-col justify-center items-center min-h-[400px]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 rounded-full border-4 border-blue-100 border-t-[#1e40af] animate-spin" />
          <p className="text-xs text-[#1e40af] font-extrabold tracking-widest uppercase animate-pulse">Loading Wallet...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-6 py-6 space-y-6 relative font-sans text-gray-900 bg-gray-50/20 rounded-3xl">

      {/* ── Page Header ── */}
      <div className="flex items-center justify-between gap-4 flex-wrap relative z-10">
        <div>
          <h1 className="text-3xl font-black text-gray-900 tracking-tight leading-none">My Wallet</h1>
          <p className="text-xs text-gray-400 font-semibold mt-1">Available credits and credit history</p>
        </div>
      </div>

      {/* ── Balance Cards Grid ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative z-10">

        {/* Main Wallet Balance Card */}
        <div className="bg-gradient-to-br from-[#1e40af] to-blue-800 rounded-3xl p-6 text-white shadow-xl shadow-blue-800/15 relative overflow-hidden flex flex-col justify-between min-h-[160px]">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl pointer-events-none" />
          <div className="flex justify-between items-start">
            <span className="text-xs font-bold uppercase tracking-wider opacity-90">Available Balance</span>
            <Wallet className="w-5 h-5 opacity-90" />
          </div>
          <div>
            <h2 className="text-4xl font-black tracking-tight leading-none">{formatCurrency(balance)}</h2>
            <p className="text-[10px] opacity-75 mt-1.5">Auto-applies at checkout</p>
          </div>
        </div>

        {/* Total Credits Used Card */}
        <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-xl shadow-gray-100/40 hover:shadow-2xl transition-all flex flex-col justify-between min-h-[160px]">
          <div className="flex justify-between items-start">
            <span className="text-xs font-bold uppercase tracking-wider text-gray-400">Total Credits Used</span>
            <ArrowUpRight className="w-5 h-5 text-red-500 bg-red-50 rounded-lg p-0.5" />
          </div>
          <div>
            <h2 className="text-3xl font-black text-gray-900 leading-none">{formatCurrency(lifetimeSpent)}</h2>
            <p className="text-[10px] text-gray-400 mt-1.5">Applied across your orders</p>
          </div>
        </div>

        {/* Refunds Received Card */}
        <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-xl shadow-gray-100/40 hover:shadow-2xl transition-all flex flex-col justify-between min-h-[160px]">
          <div className="flex justify-between items-start">
            <span className="text-xs font-bold uppercase tracking-wider text-gray-400">Refunds Received</span>
            <ArrowDownLeft className="w-5 h-5 text-emerald-500 bg-emerald-50 rounded-lg p-0.5" />
          </div>
          <div>
            <h2 className="text-3xl font-black text-gray-900 leading-none">{formatCurrency(totalRefunded)}</h2>
            <p className="text-[10px] text-gray-400 mt-1.5">Credited back as store credit</p>
          </div>
        </div>
      </div>

      {/* ── Transaction Ledger ── */}
      <div className="bg-white rounded-3xl border border-gray-100 overflow-hidden shadow-xl shadow-gray-100/40 relative z-10">
        <div className="px-6 py-5 border-b border-gray-100 flex justify-between items-center">
          <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-[#1e40af]" /> Credit History
          </h3>
          <span className="text-[10px] font-bold text-gray-400">{transactions.length} records</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/70 text-gray-500">
                <th className="py-3 px-6 font-bold">Credit Info</th>
                <th className="py-3 px-6 font-bold">Status</th>
                <th className="py-3 px-6 font-bold">Date</th>
                <th className="py-3 px-6 font-bold text-right">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {transactions.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-16 text-center text-gray-400">
                    <Coins className="w-8 h-8 mx-auto text-gray-200 mb-2" />
                    <p className="font-semibold text-sm">No credits yet.</p>
                    <p className="text-xs text-gray-300 mt-1">Credits earned through EditBridge activities will appear here.</p>
                  </td>
                </tr>
              ) : (
                transactions.map((tx) => {
                  const isSpent = !!tx.usedAt;
                  const expired = !!(tx.expiresAt && new Date(tx.expiresAt) < new Date() && !tx.usedAt);
                  const isRefund = tx.reason.toLowerCase().includes("refund");

                  let statusLabel = "Active";
                  let statusColor = "bg-blue-50 text-[#1e40af]";
                  if (isSpent) {
                    statusLabel = "Spent";
                    statusColor = "bg-gray-100 text-gray-500";
                  } else if (expired) {
                    statusLabel = "Expired";
                    statusColor = "bg-red-50 text-red-500";
                  } else if (isRefund) {
                    statusLabel = "Refund";
                    statusColor = "bg-emerald-50 text-emerald-600";
                  }

                  return (
                    <tr key={tx.id} className="hover:bg-gray-50/30 transition-colors">
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-3">
                          <div className={cn(
                            "w-8 h-8 rounded-lg flex items-center justify-center shrink-0",
                            isSpent ? "bg-red-50" : "bg-emerald-50"
                          )}>
                            {isSpent ? (
                              <ArrowUpRight className="w-4 h-4 text-red-500" />
                            ) : isRefund ? (
                              <Gift className="w-4 h-4 text-emerald-500" />
                            ) : (
                              <ArrowDownLeft className="w-4 h-4 text-emerald-500" />
                            )}
                          </div>
                          <div>
                            <p className="font-semibold text-gray-900">{tx.reason}</p>
                            {tx.expiresAt && !tx.usedAt && !expired && (
                              <p className="text-[10px] text-amber-600 flex items-center gap-1 mt-0.5">
                                <Clock className="w-3 h-3" /> Expires {formatDate(tx.expiresAt)}
                              </p>
                            )}
                            {expired && (
                              <p className="text-[10px] text-red-400 mt-0.5">
                                Expired {formatDate(tx.expiresAt!)}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-full inline-block", statusColor)}>
                          {statusLabel}
                        </span>
                      </td>
                      <td className="py-4 px-6 text-gray-400 font-semibold whitespace-nowrap">{formatDate(tx.createdAt)}</td>
                      <td className={cn(
                        "py-4 px-6 text-right font-black tabular-nums text-sm whitespace-nowrap",
                        isSpent ? "text-red-500" : "text-emerald-500"
                      )}>
                        {isSpent ? "−" : "+"}{formatCurrency(tx.amount)}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Info Box ── */}
      <div className="rounded-3xl border border-blue-100 bg-blue-50/50 p-5 flex items-start gap-4 shadow-md shadow-blue-100/10 relative z-10">
        <Info className="w-6 h-6 text-[#1e40af] shrink-0 mt-0.5" />
        <div className="space-y-1">
          <h4 className="text-sm font-bold text-blue-900">How do Wallet Credits work?</h4>
          <p className="text-xs text-[#1e40af]/90 leading-relaxed">
            Credits earned through eligible EditBridge activities are automatically applied to reduce your order total at checkout.
            Promotional credits expire on the date shown — check each record for its expiry date.
          </p>
        </div>
      </div>

    </div>
  );
}
