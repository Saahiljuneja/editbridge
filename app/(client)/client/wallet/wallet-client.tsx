"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  Wallet, Plus, ArrowUpRight, ArrowDownLeft, Gift, Clock,
  CreditCard, Coins, Sparkles, RefreshCw, AlertTriangle,
  CheckCircle2, X, Info
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
  const [showLoadModal, setShowLoadModal] = useState(false);
  const [loadAmount, setLoadAmount] = useState<string>("2000");
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  const fetchWalletData = async () => {
    try {
      const res = await fetch("/api/client/wallet");
      if (!res.ok) throw new Error();
      const data = await res.json();
      setBalance(data.balance);
      setTransactions(data.transactions);
    } catch (err) {
      console.error("Failed to load client wallet data", err);
      toast.error("Could not sync wallet data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWalletData();
  }, []);

  const handleTopUp = async () => {
    const amt = parseFloat(loadAmount);
    if (isNaN(amt) || amt <= 0) {
      toast.error("Please enter a valid amount.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/client/wallet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: amt }),
      });
      if (!res.ok) throw new Error();
      
      setSuccess(true);
      toast.success(`Successfully loaded ₹${amt.toLocaleString()} to wallet!`);
      setTimeout(() => {
        setSuccess(false);
        setShowLoadModal(false);
        fetchWalletData();
      }, 1500);
    } catch (err) {
      toast.error("Simulated transaction failed.");
    } finally {
      setSubmitting(false);
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };  // Compute lifetime spend, total refunds & promo/bonus credits
  const lifetimeSpent = transactions
    .filter(tx => tx.amount < 0 || tx.usedAt)
    .reduce((sum, tx) => sum + Math.abs(tx.amount), 0);

  const totalRefunded = transactions
    .filter(tx => tx.amount > 0 && tx.reason.toLowerCase().includes("refund"))
    .reduce((sum, tx) => sum + tx.amount, 0);

  const promoCredits = transactions
    .filter(tx => {
      const isUnused = !tx.usedAt;
      const isExpired = tx.expiresAt && new Date(tx.expiresAt) < new Date();
      const isPromo = !tx.reason.toLowerCase().includes("top-up") && !tx.reason.toLowerCase().includes("refund");
      return isUnused && !isExpired && isPromo;
    })
    .reduce((sum, tx) => sum + tx.amount, 0);

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto px-6 py-12 space-y-6 w-full flex flex-col justify-center items-center min-h-[400px]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 rounded-full border-4 border-blue-100 border-t-blue-600 animate-spin" />
          <p className="text-xs text-brand-primary font-extrabold tracking-widest uppercase animate-pulse">Syncing Wallet Balance...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-6 py-6 space-y-6 relative font-sans text-gray-900 bg-gray-50/20 rounded-3xl">
      
      {/* ── Page Header ── */}
      <div className="flex items-center justify-between gap-4 flex-wrap relative z-10">
        <div>
          <p className="text-[10px] font-extrabold uppercase tracking-[0.25em] text-brand-primary mb-1">Loyalty Portal</p>
          <h1 className="text-3xl font-black text-gray-900 tracking-tight leading-none">My Wallet</h1>
        </div>
        <button
          onClick={() => {
            setLoadAmount("2000");
            setShowLoadModal(true);
          }}
          className="flex items-center gap-1.5 px-4 py-2.5 rounded-2xl bg-gradient-to-r from-blue-800 to-blue-800 hover:from-blue-800 hover:to-blue-400 text-xs font-bold text-white transition-all shadow-md shadow-blue-800/15"
        >
          <Plus className="w-4 h-4" /> Add Money
        </button>
      </div>

      {/* ── Balance Cards Grid ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative z-10">
        
        {/* Main Wallet Balance Card */}
        <div className="bg-gradient-to-br from-blue-800 to-blue-800 rounded-3xl p-6 text-white shadow-xl shadow-blue-800/15 relative overflow-hidden flex flex-col justify-between min-h-[160px]">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl pointer-events-none" />
          <div className="flex justify-between items-start">
            <span className="text-xs font-bold uppercase tracking-wider opacity-90">Wallet Balance</span>
            <Wallet className="w-5 h-5 opacity-90" />
          </div>
          <div>
            <h2 className="text-4xl font-black tracking-tight leading-none">{formatCurrency(balance)}</h2>
            <p className="text-[10px] opacity-75 mt-1.5">Auto-applies at checkout for next orders</p>
          </div>
        </div>

        {/* Lifetime Spent Card */}
        <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-xl shadow-gray-100/40 hover:shadow-2xl transition-all flex flex-col justify-between min-h-[160px]">
          <div className="flex justify-between items-start">
            <span className="text-xs font-bold uppercase tracking-wider text-gray-400">Total Credits Used</span>
            <ArrowUpRight className="w-5 h-5 text-red-500 bg-red-50 rounded-lg p-0.5" />
          </div>
          <div>
            <h2 className="text-3xl font-black text-gray-900 leading-none">{formatCurrency(lifetimeSpent)}</h2>
            <p className="text-[10px] text-gray-400 mt-1.5">Spent on design & editing packages</p>
          </div>
        </div>

        {/* Refund Credits Card */}
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
            <CreditCard className="w-5 h-5 text-brand-primary" /> Transaction Ledger
          </h3>
          <span className="text-[10px] font-bold text-gray-400">{transactions.length} Transactions</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-gray-150 bg-gray-50/70 text-gray-550">
                <th className="py-3 px-6 font-bold">Transaction Info</th>
                <th className="py-3 px-6 font-bold">Status</th>
                <th className="py-3 px-6 font-bold">Date</th>
                <th className="py-3 px-6 font-bold text-right">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {transactions.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-16 text-center text-gray-400">
                    <Coins className="w-8 h-8 mx-auto text-gray-200 mb-2 animate-bounce" />
                    <p className="font-semibold text-sm">No wallet transactions recorded yet.</p>
                  </td>
                </tr>
              ) : (
                transactions.map((tx) => {
                  const isDebit = tx.amount < 0 || !!tx.usedAt;
                  const expired = !!(tx.expiresAt && new Date(tx.expiresAt) < new Date() && !tx.usedAt);
                  const isRefund = tx.reason.toLowerCase().includes("refund");

                  let statusLabel = "Active";
                  let statusColor = "bg-blue-50 text-brand-primary";
                  if (isDebit || tx.usedAt) {
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
                            isDebit ? "bg-red-50" : "bg-emerald-50"
                          )}>
                            {isDebit ? (
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
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-full inline-block", statusColor)}>
                          {statusLabel}
                        </span>
                      </td>
                      <td className="py-4 px-6 text-gray-400 font-semibold">{formatDate(tx.createdAt)}</td>
                      <td className={cn(
                        "py-4 px-6 text-right font-black tabular-nums text-sm",
                        isDebit ? "text-red-500" : "text-emerald-500"
                      )}>
                        {isDebit ? "-" : "+"}{formatCurrency(Math.abs(tx.amount))}
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
        <Info className="w-6 h-6 text-brand-primary shrink-0 mt-0.5" />
        <div className="space-y-1">
          <h4 className="text-sm font-bold text-blue-900">How do Wallet Credits work?</h4>
          <p className="text-xs text-brand-primary/90 leading-relaxed">
            Whenever you purchase a package, any available wallet credits are automatically applied to reduce your order total.
            Loaded funds do not expire. Issued promo/bonus credits may expire in 90 days.
          </p>
        </div>
      </div>

      {/* ── Add Money Modal ── */}
      {showLoadModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[999] backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white border border-gray-100 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-5 relative animate-in zoom-in-95 duration-200 text-gray-900">
            
            <button
              onClick={() => {
                if (!submitting) setShowLoadModal(false);
              }}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-650 text-2xl font-black leading-none transition-colors"
            >
              &times;
            </button>

            <div className="flex items-center gap-2">
              <Coins className="w-6 h-6 text-brand-primary animate-bounce" />
              <h3 className="text-lg font-bold text-gray-900">Top-up Wallet</h3>
            </div>

            {success ? (
              <div className="py-8 flex flex-col items-center justify-center space-y-3">
                <CheckCircle2 className="w-16 h-16 text-emerald-500 animate-bounce" />
                <p className="text-sm font-bold text-gray-900">Payment Simulated Successfully!</p>
                <p className="text-xs text-gray-400">Reloading wallet balance...</p>
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-xs text-gray-400 leading-relaxed">
                  Enter an amount to simulate adding funds directly into your wallet. Loaded funds can be used immediately during checkout.
                </p>

                {/* Amount input */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-extrabold uppercase tracking-wider text-gray-400">Amount (INR)</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold">₹</span>
                    <input
                      type="number"
                      value={loadAmount}
                      onChange={(e) => setLoadAmount(e.target.value)}
                      placeholder="Enter amount"
                      disabled={submitting}
                      className="w-full pl-8 pr-4 py-3 rounded-2xl border border-gray-150 focus:border-brand-primary outline-none font-bold text-lg disabled:opacity-50"
                    />
                  </div>
                </div>

                {/* Prefills */}
                <div className="grid grid-cols-4 gap-2">
                  {["1000", "2500", "5000", "10000"].map((val) => (
                    <button
                      key={val}
                      onClick={() => setLoadAmount(val)}
                      disabled={submitting}
                      className={cn(
                        "py-2 rounded-xl text-xs font-bold border transition-all",
                        loadAmount === val
                          ? "bg-blue-50 border-blue-400 text-brand-primary"
                          : "bg-gray-50 border-gray-150 text-gray-650 hover:bg-gray-100"
                      )}
                    >
                      +₹{parseInt(val).toLocaleString()}
                    </button>
                  ))}
                </div>

                {/* Submit button */}
                <button
                  onClick={handleTopUp}
                  disabled={submitting || !loadAmount}
                  className="w-full py-3 rounded-2xl bg-gradient-to-r from-blue-800 to-blue-800 hover:from-blue-800 hover:to-blue-400 text-sm font-bold text-white transition-all shadow-lg shadow-blue-800/10 flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {submitting ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" /> Processing Mock Payment...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" /> Load Money (Mock)
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  );
}
