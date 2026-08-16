"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  Wallet, Landmark, Clock, RefreshCw, CheckCircle2,
  TrendingUp, Hourglass, ArrowUpRight, ArrowDownLeft, ShieldAlert,
  Coins, Sparkles, X, Info
} from "lucide-react";
import { cn, formatCurrency } from "@/lib/utils";
import Link from "next/link";

type BankDetails = {
  verified: boolean;
  accountName: string | null;
  accountNumber: string | null;
  ifsc: string | null;
};

type Balances = {
  available: number;
  pending: number;
  lifetime: number;
  processing: number;
  bonus: number;
};

type Transaction = {
  id: string;
  orderId: string;
  grossAmount: number;
  commissionAmount: number;
  tdsAmount: number;
  tdsRatePct: number;
  netAmount: number;
  bonusCredits: number;
  status: "pending" | "processing" | "completed";
  scheduledPayoutAt: string | null;
  settledAt: string | null;
  createdAt: string;
  packageTitle: string | null;
};

export function EditorWalletClient() {
  const [bankDetails, setBankDetails] = useState<BankDetails | null>(null);
  const [balances, setBalances] = useState<Balances>({ available: 0, pending: 0, lifetime: 0, processing: 0, bonus: 0 });
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  const fetchWalletData = async () => {
    try {
      const res = await fetch("/api/editor/wallet");
      if (!res.ok) throw new Error();
      const data = await res.json();
      setBankDetails(data.bankDetails);
      setBalances(data.balances);
      setTransactions(data.transactions);
    } catch (err) {
      console.error("Failed to load editor wallet data", err);
      toast.error("Could not sync wallet details.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWalletData();
  }, []);

  const handleWithdraw = async () => {
    if (!bankDetails?.verified) {
      toast.error("Please add your bank account details in Settings first.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/editor/wallet", {
        method: "POST",
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error ?? "Withdrawal failed");
      }

      setSuccess(true);
      toast.success("Withdrawal initiated successfully!");
      setTimeout(() => {
        setSuccess(false);
        setShowWithdrawModal(false);
        fetchWalletData();
      }, 1500);
    } catch (err: any) {
      toast.error(err.message ?? "Failed to request withdrawal.");
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
  };

  const timeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    if (days === 0) return "today";
    if (days === 1) return "yesterday";
    return `${days} days ago`;
  };

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
          <p className="text-[10px] font-extrabold uppercase tracking-[0.25em] text-brand-primary mb-1">Editor Portal</p>
          <h1 className="text-3xl font-black text-gray-900 tracking-tight leading-none">Earnings Wallet</h1>
        </div>
        {balances.available > 0 && (
          <button
            onClick={() => {
              if (bankDetails?.verified) {
                setShowWithdrawModal(true);
              } else {
                toast.error("Add your payout bank details in settings before withdrawing.");
              }
            }}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-2xl bg-gradient-to-r from-blue-800 to-blue-900 hover:from-blue-800 hover:to-blue-400 text-xs font-bold text-white transition-all shadow-md shadow-blue-800/15"
          >
            <ArrowUpRight className="w-4 h-4" /> Withdraw Earnings
          </button>
        )}
      </div>

      {/* ── Balance Cards Grid ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6 relative z-10">
        
        {/* Available to Payout */}
        <div className="bg-gradient-to-br from-blue-800 to-blue-800 rounded-3xl p-6 text-white shadow-xl shadow-blue-800/15 relative overflow-hidden flex flex-col justify-between min-h-[160px]">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl pointer-events-none" />
          <div className="flex justify-between items-start">
            <span className="text-xs font-bold uppercase tracking-wider opacity-90">Available for Payout</span>
            <Wallet className="w-5 h-5 opacity-90" />
          </div>
          <div>
            <h2 className="text-4xl font-black tracking-tight leading-none">{formatCurrency(balances.available)}</h2>
            <p className="text-[10px] opacity-75 mt-1.5">Escrow period cleared · ready for withdrawal</p>
          </div>
        </div>

        {/* Pending Escrow */}
        <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-xl shadow-gray-100/40 hover:shadow-2xl transition-all flex flex-col justify-between min-h-[160px]">
          <div className="flex justify-between items-start">
            <span className="text-xs font-bold uppercase tracking-wider text-gray-400">Pending Clearance</span>
            <Hourglass className="w-5 h-5 text-amber-500 bg-amber-50 rounded-lg p-0.5" />
          </div>
          <div>
            <h2 className="text-3xl font-black text-gray-900 leading-none">{formatCurrency(balances.pending)}</h2>
            <p className="text-[10px] text-gray-400 mt-1.5">Escrowed for quality verification (7d)</p>
          </div>
        </div>

        {/* Payout Bonus Credits */}
        <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-xl shadow-gray-100/40 hover:shadow-2xl transition-all flex flex-col justify-between min-h-[160px]">
          <div className="flex justify-between items-start">
            <span className="text-xs font-bold uppercase tracking-wider text-gray-400">Payout Bonus Credits</span>
            <Sparkles className="w-5 h-5 text-brand-primary bg-blue-50 rounded-lg p-0.5 animate-pulse" />
          </div>
          <div>
            <h2 className="text-3xl font-black text-gray-900 leading-none">{formatCurrency(balances.bonus)}</h2>
            <p className="text-[10px] text-gray-450 mt-1.5">Applied to your next order payout as a bonus</p>
          </div>
        </div>

        {/* Lifetime Earnings */}
        <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-xl shadow-gray-100/40 hover:shadow-2xl transition-all flex flex-col justify-between min-h-[160px]">
          <div className="flex justify-between items-start">
            <span className="text-xs font-bold uppercase tracking-wider text-gray-400">Total Settled Earnings</span>
            <TrendingUp className="w-5 h-5 text-emerald-505 bg-emerald-50 rounded-lg p-0.5" />
          </div>
          <div>
            <h2 className="text-3xl font-black text-gray-900 leading-none">{formatCurrency(balances.lifetime)}</h2>
            <p className="text-[10px] text-gray-400 mt-1.5">Transferred successfully to bank details</p>
          </div>
        </div>
      </div>

      {/* ── Bank Payout Details Card ── */}
      <div className="bg-white rounded-3xl border border-gray-100 p-5 shadow-xl shadow-gray-100/40 relative z-10 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-gray-50 border border-gray-150 flex items-center justify-center shrink-0">
            <Landmark className="w-6 h-6 text-gray-450" />
          </div>
          <div>
            <p className="text-[10px] font-extrabold uppercase tracking-widest text-gray-400">Payout Credentials</p>
            {bankDetails?.verified ? (
              <div className="mt-1">
                <p className="text-sm font-bold text-gray-900">{bankDetails.accountName}</p>
                <p className="text-xs text-gray-500 font-mono">{bankDetails.accountNumber} · IFSC: {bankDetails.ifsc}</p>
              </div>
            ) : (
              <p className="text-xs font-bold text-red-500 mt-1 flex items-center gap-1.5">
                <ShieldAlert className="w-4 h-4" /> Bank credentials not configured
              </p>
            )}
          </div>
        </div>
        <Link
          href="/editor/settings"
          className="text-xs font-bold text-brand-primary bg-blue-50 hover:bg-blue-100/80 px-4 py-2.5 rounded-2xl border border-blue-100 transition-all shrink-0"
        >
          {bankDetails?.verified ? "Update bank info" : "Add bank details"}
        </Link>
      </div>

      {/* ── Earnings & Payouts Ledger ── */}
      <div className="bg-white rounded-3xl border border-gray-100 overflow-hidden shadow-xl shadow-gray-100/40 relative z-10">
        <div className="px-6 py-5 border-b border-gray-100 flex justify-between items-center">
          <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
            <Coins className="w-5 h-5 text-brand-primary" /> Earnings & Payouts Ledger
          </h3>
          <span className="text-[10px] font-bold text-gray-400">{transactions.length} Payout Records</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-gray-150 bg-gray-50/70 text-gray-550">
                <th className="py-3 px-6 font-bold">Payout Details</th>
                <th className="py-3 px-6 font-bold">Status</th>
                <th className="py-3 px-6 font-bold">Escrow Date</th>
                <th className="py-3 px-6 font-bold text-right">Deductions</th>
                <th className="py-3 px-6 font-bold text-right">Net Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {transactions.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-16 text-center text-gray-400">
                    <Hourglass className="w-8 h-8 mx-auto text-gray-200 mb-2 animate-spin" />
                    <p className="font-semibold text-sm">No payouts or earnings recorded yet.</p>
                  </td>
                </tr>
              ) : (
                transactions.map((tx) => {
                  const commission = tx.commissionAmount;
                  const tds = tx.tdsAmount;
                  const totalDeductions = commission + tds;

                  return (
                    <tr key={tx.id} className="hover:bg-gray-50/30 transition-colors">
                      <td className="py-4 px-6">
                        <p className="font-bold text-gray-900">{tx.packageTitle ?? "Custom Payout"}</p>
                        <p className="text-[10px] text-gray-400 mt-0.5">Order ID: {tx.orderId.slice(0, 8)} · Completed {timeAgo(tx.createdAt)}</p>
                      </td>
                      <td className="py-4 px-6">
                        <span className={cn(
                          "text-[10px] font-bold px-2 py-0.5 rounded-full inline-block",
                          tx.status === "completed" ? "bg-emerald-50 text-emerald-600" :
                          tx.status === "processing" ? "bg-blue-50 text-brand-primary animate-pulse" :
                                                      "bg-amber-50 text-amber-600"
                        )}>
                          {tx.status === "completed" ? "Settled" : tx.status === "processing" ? "Processing" : "Escrowed"}
                        </span>
                      </td>
                      <td className="py-4 px-6 text-gray-550 font-semibold">
                        {tx.settledAt ? (
                          <span className="text-emerald-600 font-bold">Paid {formatDate(tx.settledAt)}</span>
                        ) : tx.scheduledPayoutAt ? (
                          <span>Matures {formatDate(tx.scheduledPayoutAt)}</span>
                        ) : (
                          "-"
                        )}
                      </td>
                      <td className="py-4 px-6 text-right text-red-500 font-medium tabular-nums">
                        {totalDeductions > 0 ? `-${formatCurrency(totalDeductions)}` : "₹0"}
                        <p className="text-[9px] text-gray-400 mt-0.5">
                          TDS: {tx.tdsRatePct}% · Fee: {formatCurrency(commission)}
                        </p>
                      </td>
                      <td className="py-4 px-6 text-right font-black text-gray-900 tabular-nums text-sm">
                        {formatCurrency(tx.netAmount)}
                        {tx.bonusCredits > 0 && (
                          <p className="text-[9px] text-brand-primary font-bold mt-0.5">
                            +{formatCurrency(tx.bonusCredits)} Bonus Credits
                          </p>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Payout Policy Info Box ── */}
      <div className="rounded-3xl border border-blue-100 bg-blue-50/50 p-5 flex items-start gap-4 shadow-md shadow-blue-100/10 relative z-10">
        <Info className="w-6 h-6 text-blue-900 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <h4 className="text-sm font-bold text-blue-900">Payout & ESCROW Policy</h4>
          <p className="text-xs text-brand-primary leading-relaxed">
            Earnings from client order approvals are held in escrow for exactly 7 days before clearance.
            Once matured, you can request a manual payout transfer to your registered bank account. Bank settlements take up to 24–48 hours to reflect in your statement.
          </p>
        </div>
      </div>

      {/* ── Withdraw Modal ── */}
      {showWithdrawModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[999] backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white border border-gray-100 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-5 relative animate-in zoom-in-95 duration-200 text-gray-900">
            
            <button
              onClick={() => {
                if (!submitting) setShowWithdrawModal(false);
              }}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-650 text-2xl font-black leading-none transition-colors"
            >
              &times;
            </button>

            <div className="flex items-center gap-2">
              <Landmark className="w-6 h-6 text-brand-primary animate-bounce" />
              <h3 className="text-lg font-bold text-gray-900">Withdraw Earnings</h3>
            </div>

            {success ? (
              <div className="py-8 flex flex-col items-center justify-center space-y-3">
                <CheckCircle2 className="w-16 h-16 text-emerald-500 animate-bounce" />
                <p className="text-sm font-bold text-gray-900">Payout Transfer Dispatched!</p>
                <p className="text-xs text-gray-400">Funds have been simulated to transfer to your bank details.</p>
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-xs text-gray-400 leading-relaxed">
                  You are initiating a manual withdrawal for your matured payout balance. The funds will be transferred to:
                </p>

                <div className="bg-gray-50 border border-gray-150 p-4 rounded-2xl text-xs space-y-1.5">
                  <p className="font-extrabold text-gray-550 uppercase text-[9px] tracking-wider">Recipient Account</p>
                  <p className="font-bold text-gray-900">{bankDetails?.accountName}</p>
                  <p className="text-gray-500 font-mono">{bankDetails?.accountNumber}</p>
                  <p className="text-gray-500">IFSC: {bankDetails?.ifsc}</p>
                </div>

                <div className="flex justify-between items-center text-xs border-t border-gray-100 pt-3">
                  <span className="font-semibold text-gray-500">Withdrawal Amount:</span>
                  <span className="font-black text-lg text-gray-950 tabular-nums">{formatCurrency(balances.available)}</span>
                </div>

                {/* Submit button */}
                <button
                  onClick={handleWithdraw}
                  disabled={submitting}
                  className="w-full py-3 rounded-2xl bg-gradient-to-r from-blue-800 to-blue-900 hover:from-blue-800 hover:to-blue-400 text-sm font-bold text-white transition-all shadow-lg shadow-blue-800/10 flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {submitting ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" /> Simulating Transfer...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" /> Settle Earnings Now
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
