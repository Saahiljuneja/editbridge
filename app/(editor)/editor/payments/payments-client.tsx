"use client";

import { useState, useMemo } from "react";
import {
  Search, SlidersHorizontal, ArrowUpDown, Download,
  Settings, HelpCircle, ArrowRight,
  ChevronLeft, ChevronRight as ChevronRightIcon,
  Clock, CheckCircle2, XCircle, TrendingUp, Banknote, Receipt,
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import Link from "next/link";

interface TransactionRow {
  id: string;
  totalAmount: number;
  commissionAmount: number;
  rewardDiscountAmount: number;
  status: string;
  createdAt: Date;
  completedAt: Date | null;
  packageTitle: string | null;
  clientName: string | null;
  clientEmail: string;
}

interface PayoutRow {
  id: string;
  orderId: string;
  grossAmount: number;
  commissionAmount: number;
  tdsAmount: number;
  tdsRatePct: number;
  netAmount: number;
  bonusCredits: number;
  razorpayTransferId: string | null;
  status: string;
  scheduledPayoutAt: Date | null;
  settledAt: Date | null;
  createdAt: Date;
  packageTitle: string | null;
}

interface Props {
  transactions: TransactionRow[];
  payouts: PayoutRow[];
  bankAccountName: string | null;
  bankAccountLastFour: string | null;
  bankIfsc: string | null;
  kycStatus: string;
}

function fmtDate(d: Date | string) {
  return new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}
function fmtTime(d: Date | string) {
  return new Date(d).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true });
}

function escapeCsvField(val: unknown): string {
  const s = String(val ?? "");
  const startsWithFormula = s.length > 0 && /^[=+\-@\t\r]/.test(s);
  const needsQuoting = startsWithFormula || s.includes(",") || s.includes('"') || s.includes("\n");
  if (!needsQuoting) return s;
  const safe = startsWithFormula ? `'${s}` : s;
  return `"${safe.replace(/"/g, '""')}"`;
}

function CustomTooltip({ active, payload }: { active?: boolean; payload?: Array<{ value: number; payload: { tooltipLabel: string } }> }) {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl px-4 py-3 shadow-[0_8px_30px_rgba(0,0,0,0.08)] text-xs">
        <p className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-1.5">
          {payload[0].payload.tooltipLabel}
        </p>
        <p className="font-black text-gray-900 dark:text-white flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-sky-400 shrink-0" />
          {new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", minimumFractionDigits: 0 }).format(payload[0].value)}
        </p>
      </div>
    );
  }
  return null;
}

export function PaymentsClient({
  transactions,
  payouts,
  bankAccountName,
  bankAccountLastFour,
  bankIfsc,
  kycStatus,
}: Props) {
  const [activeTab, setActiveTab] = useState<"transactions" | "payouts">("transactions");
  const [productFilter, setProductFilter] = useState("all");
  const [timeFilter, setTimeFilter] = useState("lifetime");
  const [searchQuery, setSearchQuery] = useState("");
  const [quickFilter, setQuickFilter] = useState<"successful" | "abandoned" | "all">("successful");
  const [sortAsc, setSortAsc] = useState(false);
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 10;

  const uniquePackages = useMemo(() => {
    const pkgs = new Set<string>();
    transactions.forEach(tx => { if (tx.packageTitle) pkgs.add(tx.packageTitle); });
    return Array.from(pkgs);
  }, [transactions]);

  const filteredTransactions = useMemo(() => {
    return transactions.filter(tx => {
      if (productFilter !== "all" && tx.packageTitle !== productFilter) return false;
      const txDate = new Date(tx.createdAt);
      const now = new Date();
      if (timeFilter === "month") {
        if (txDate.getMonth() !== now.getMonth() || txDate.getFullYear() !== now.getFullYear()) return false;
      } else if (timeFilter === "year") {
        if (txDate.getFullYear() !== now.getFullYear()) return false;
      }
      if (quickFilter === "successful" && tx.status === "cancelled") return false;
      if (quickFilter === "abandoned" && tx.status !== "cancelled") return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        if (
          !(tx.clientName ?? "").toLowerCase().includes(q) &&
          !(tx.clientEmail ?? "").toLowerCase().includes(q) &&
          !(tx.packageTitle ?? "").toLowerCase().includes(q)
        ) return false;
      }
      return true;
    });
  }, [transactions, productFilter, timeFilter, quickFilter, searchQuery]);

  const sortedTransactions = useMemo(() => {
    return [...filteredTransactions].sort((a, b) => {
      const diff = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      return sortAsc ? diff : -diff;
    });
  }, [filteredTransactions, sortAsc]);

  const paginatedTransactions = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return sortedTransactions.slice(start, start + PAGE_SIZE);
  }, [sortedTransactions, page]);

  const totalTxPages = Math.ceil(sortedTransactions.length / PAGE_SIZE);

  const filteredPayouts = useMemo(() => {
    return payouts.filter(p => {
      if (productFilter !== "all" && p.packageTitle !== productFilter) return false;
      const pDate = new Date(p.createdAt);
      const now = new Date();
      if (timeFilter === "month") {
        if (pDate.getMonth() !== now.getMonth() || pDate.getFullYear() !== now.getFullYear()) return false;
      } else if (timeFilter === "year") {
        if (pDate.getFullYear() !== now.getFullYear()) return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        if (
          !(p.packageTitle ?? "").toLowerCase().includes(q) &&
          !(p.razorpayTransferId ?? "").toLowerCase().includes(q)
        ) return false;
      }
      return true;
    });
  }, [payouts, productFilter, timeFilter, searchQuery]);

  const sortedPayouts = useMemo(() => {
    return [...filteredPayouts].sort((a, b) => {
      const diff = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      return sortAsc ? diff : -diff;
    });
  }, [filteredPayouts, sortAsc]);

  const paginatedPayouts = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return sortedPayouts.slice(start, start + PAGE_SIZE);
  }, [sortedPayouts, page]);

  const totalPayoutPages = Math.ceil(sortedPayouts.length / PAGE_SIZE);

  // Earnings: only product + time filters (never search)
  const earningsPayouts = useMemo(() => {
    return payouts.filter(p => {
      if (productFilter !== "all" && p.packageTitle !== productFilter) return false;
      const pDate = new Date(p.createdAt);
      const now = new Date();
      if (timeFilter === "month") {
        if (pDate.getMonth() !== now.getMonth() || pDate.getFullYear() !== now.getFullYear()) return false;
      } else if (timeFilter === "year") {
        if (pDate.getFullYear() !== now.getFullYear()) return false;
      }
      return true;
    });
  }, [payouts, productFilter, timeFilter]);

  const totalEarningsVal = useMemo(() =>
    earningsPayouts.filter(p => p.status === "completed").reduce((s, p) => s + p.netAmount, 0),
    [earningsPayouts]
  );

  // Lifetime stats (unfiltered)
  const settledPayoutsCount = useMemo(() => payouts.filter(p => p.status === "completed").length, [payouts]);
  const pendingPayoutAmount = useMemo(() =>
    payouts.filter(p => p.status !== "completed").reduce((s, p) => s + p.netAmount, 0),
    [payouts]
  );
  const pendingPayoutCount = useMemo(() => payouts.filter(p => p.status !== "completed").length, [payouts]);
  const completedTxCount = useMemo(() => transactions.filter(t => t.status !== "cancelled").length, [transactions]);

  const chartData = useMemo(() => {
    const completed = earningsPayouts
      .filter(p => p.status === "completed" && p.settledAt)
      .sort((a, b) => new Date(a.settledAt!).getTime() - new Date(b.settledAt!).getTime());

    let running = 0;
    const points = completed.map(p => {
      running += p.netAmount;
      const d = new Date(p.settledAt!);
      const tooltipLabel = d.toLocaleDateString("en-IN", {
        weekday: "short", day: "numeric", month: "short", year: "numeric",
      }) + " · " + fmtTime(d);

      let xLabel: string;
      if (timeFilter === "month") xLabel = d.getDate().toString();
      else if (timeFilter === "year") xLabel = d.toLocaleDateString("en-IN", { month: "short" });
      else xLabel = d.getFullYear().toString();

      return { tooltipLabel, ts: d.getTime(), xLabel, amount: running / 100 };
    });

    if (points.length === 0) {
      if (timeFilter === "month") {
        return [{ tooltipLabel: "", ts: 1, xLabel: "1", amount: 0 }, { tooltipLabel: "", ts: 15, xLabel: "15", amount: 0 }, { tooltipLabel: "", ts: 30, xLabel: "30", amount: 0 }];
      } else if (timeFilter === "year") {
        return [{ tooltipLabel: "", ts: 1, xLabel: "Jan", amount: 0 }, { tooltipLabel: "", ts: 6, xLabel: "Jun", amount: 0 }, { tooltipLabel: "", ts: 12, xLabel: "Dec", amount: 0 }];
      }
      return [{ tooltipLabel: "", ts: 2024, xLabel: "2024", amount: 0 }, { tooltipLabel: "", ts: 2025, xLabel: "2025", amount: 0 }, { tooltipLabel: "", ts: 2026, xLabel: "2026", amount: 0 }];
    }
    return points;
  }, [earningsPayouts, timeFilter]);

  function handleExport() {
    const list = activeTab === "transactions" ? sortedTransactions : sortedPayouts;
    const headers = activeTab === "transactions"
      ? ["Date", "Time", "Customer", "Email", "Product", "Amount", "Status"]
      : ["Date", "Payout ID", "Gross", "Commission", "TDS", "Net", "Status", "Settled At"];

    const rows = list.map(item => {
      if (activeTab === "transactions") {
        const tx = item as TransactionRow;
        return [
          fmtDate(tx.createdAt), fmtTime(tx.createdAt),
          tx.clientName, tx.clientEmail, tx.packageTitle,
          tx.totalAmount / 100, tx.status,
        ].map(escapeCsvField).join(",");
      } else {
        const po = item as PayoutRow;
        return [
          fmtDate(po.createdAt), po.razorpayTransferId,
          po.grossAmount / 100, po.commissionAmount / 100, po.tdsAmount / 100, po.netAmount / 100,
          po.status, po.settledAt ? fmtDate(po.settledAt) : "",
        ].map(escapeCsvField).join(",");
      }
    });

    const csv = "data:text/csv;charset=utf-8," + encodeURIComponent([headers.join(","), ...rows].join("\n"));
    const a = document.createElement("a");
    a.href = csv;
    a.download = `editor_${activeTab}_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }

  return (
    <div className="min-h-screen bg-gray-50/50 dark:bg-gray-950">
      {/* Header */}
      <div className="bg-white dark:bg-gray-900 px-8 py-6 border-b border-gray-200 dark:border-gray-800">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight">Payments</h1>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
              Your earnings, transactions &amp; payout history
            </p>
          </div>
          <div className="flex items-center gap-3">
            {/* Payment status badge */}
            {(() => {
              let label: string, bg: string, text: string, dot: string, pulse = false;
              if (kycStatus === "rejected") {
                label = "KYC Rejected"; bg = "bg-red-50 dark:bg-red-950/40"; text = "text-red-700 dark:text-red-400"; dot = "bg-red-500";
              } else if (kycStatus === "expired") {
                label = "KYC Expired"; bg = "bg-amber-50 dark:bg-amber-950/40"; text = "text-amber-700 dark:text-amber-400"; dot = "bg-amber-500"; pulse = true;
              } else if (kycStatus !== "approved") {
                label = "Pending KYC"; bg = "bg-amber-50 dark:bg-amber-950/40"; text = "text-amber-700 dark:text-amber-400"; dot = "bg-amber-500"; pulse = true;
              } else if (!bankAccountLastFour) {
                label = "Bank Account Required"; bg = "bg-amber-50 dark:bg-amber-950/40"; text = "text-amber-700 dark:text-amber-400"; dot = "bg-amber-500"; pulse = true;
              } else {
                label = "Payouts Active"; bg = "bg-emerald-50 dark:bg-emerald-950/40"; text = "text-emerald-700 dark:text-emerald-400"; dot = "bg-emerald-500";
              }
              return (
                <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${bg} ${text}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${dot} ${pulse ? "animate-pulse" : ""}`} />
                  {label}
                </span>
              );
            })()}
            <Link
              href="/editor/settings?tab=payments"
              className="p-2 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-gray-600 dark:hover:text-gray-300 transition-all"
              title="Payment settings"
            >
              <Settings className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </div>

      <div className="px-8 py-7 space-y-6">
        {/* Earnings Chart Card */}
        <div className="rounded-3xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-6 shadow-sm">
          <div className="flex items-start justify-between mb-6">
            <div>
              <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500">
                <TrendingUp className="w-3.5 h-3.5" />
                Net Earned
                <HelpCircle className="w-3.5 h-3.5 text-gray-300 dark:text-gray-600 cursor-pointer" />
              </div>
              <p className="text-4xl font-black text-gray-900 dark:text-white tracking-tight mt-1.5 tabular-nums">
                {new Intl.NumberFormat("en-IN", {
                  style: "currency", currency: "INR",
                  minimumFractionDigits: 0, maximumFractionDigits: 2,
                }).format(totalEarningsVal / 100)}
              </p>
              <p className="text-xs text-gray-400 mt-1">
                {timeFilter === "month" ? "This month" : timeFilter === "year" ? "This year" : "All time"} · {settledPayoutsCount} payout{settledPayoutsCount !== 1 ? "s" : ""} settled
              </p>
            </div>
            <div className="flex items-center gap-2">
              <select
                value={productFilter}
                onChange={e => { setProductFilter(e.target.value); setPage(1); }}
                className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 px-3 py-1.5 text-xs font-semibold text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-sky-500/20"
              >
                <option value="all">All Products</option>
                {uniquePackages.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
              <select
                value={timeFilter}
                onChange={e => { setTimeFilter(e.target.value); setPage(1); }}
                className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 px-3 py-1.5 text-xs font-semibold text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-sky-500/20"
              >
                <option value="lifetime">All time</option>
                <option value="year">This year</option>
                <option value="month">This month</option>
              </select>
            </div>
          </div>

          <div className="h-[180px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="earningsGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#38bdf8" stopOpacity={0.22} />
                    <stop offset="95%" stopColor="#38bdf8" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" className="stroke-gray-100 dark:stroke-gray-800" />
                <XAxis
                  dataKey="ts"
                  type="number"
                  domain={["dataMin", "dataMax"]}
                  tickCount={4}
                  tickFormatter={(ts) => {
                    const pt = chartData.find(p => p.ts === ts);
                    return pt ? pt.xLabel : "";
                  }}
                  tick={{ fontSize: 10, fill: "#9ca3af" }}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  tick={{ fontSize: 10, fill: "#9ca3af" }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v) => `₹${v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}`}
                />
                <Tooltip content={<CustomTooltip />} />
                <Area
                  type="monotone"
                  dataKey="amount"
                  stroke="#38bdf8"
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#earningsGrad)"
                  activeDot={{ r: 5, fill: "#38bdf8", strokeWidth: 0 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-3 gap-4">
          <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 px-5 py-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-7 h-7 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              </div>
              <p className="text-xs font-semibold text-gray-500 dark:text-gray-400">Settled</p>
            </div>
            <p className="text-xl font-black text-gray-900 dark:text-white tabular-nums">
              {settledPayoutsCount}
            </p>
            <p className="text-xs text-gray-400 mt-0.5">payouts transferred</p>
          </div>

          <div className={`rounded-2xl border px-5 py-4 ${
            pendingPayoutCount > 0
              ? "border-amber-200 dark:border-amber-800/50 bg-amber-50 dark:bg-amber-950/20"
              : "border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900"
          }`}>
            <div className="flex items-center gap-2 mb-2">
              <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                pendingPayoutCount > 0 ? "bg-amber-100 dark:bg-amber-950/60" : "bg-gray-100 dark:bg-gray-800"
              }`}>
                <Clock className={`w-3.5 h-3.5 ${pendingPayoutCount > 0 ? "text-amber-600 dark:text-amber-400" : "text-gray-400"}`} />
              </div>
              <p className={`text-xs font-semibold ${pendingPayoutCount > 0 ? "text-amber-700 dark:text-amber-400" : "text-gray-500 dark:text-gray-400"}`}>
                Pending
              </p>
            </div>
            <p className={`text-xl font-black tabular-nums ${pendingPayoutCount > 0 ? "text-amber-900 dark:text-amber-200" : "text-gray-900 dark:text-white"}`}>
              {new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", minimumFractionDigits: 0 }).format(pendingPayoutAmount / 100)}
            </p>
            <p className={`text-xs mt-0.5 ${pendingPayoutCount > 0 ? "text-amber-600 dark:text-amber-500" : "text-gray-400"}`}>
              {pendingPayoutCount} payout{pendingPayoutCount !== 1 ? "s" : ""} in queue
            </p>
          </div>

          <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 px-5 py-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-7 h-7 rounded-lg bg-sky-50 dark:bg-sky-950/40 flex items-center justify-center shrink-0">
                <Receipt className="w-3.5 h-3.5 text-sky-500" />
              </div>
              <p className="text-xs font-semibold text-gray-500 dark:text-gray-400">Orders</p>
            </div>
            <p className="text-xl font-black text-gray-900 dark:text-white tabular-nums">
              {completedTxCount}
            </p>
            <p className="text-xs text-gray-400 mt-0.5">completed orders</p>
          </div>
        </div>

        {/* Tabs + Controls */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center bg-gray-100 dark:bg-gray-900 p-1.5 rounded-2xl w-fit">
            {(["transactions", "payouts"] as const).map(tab => (
              <button
                key={tab}
                onClick={() => { setActiveTab(tab); setPage(1); }}
                className={`px-5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                  activeTab === tab
                    ? "bg-neutral-950 dark:bg-white text-white dark:text-neutral-950 shadow-sm"
                    : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
                }`}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
                <span className={`text-[10px] font-extrabold px-1.5 py-0.5 rounded-full ${
                  activeTab === tab
                    ? "bg-white/20 dark:bg-black/20"
                    : "bg-gray-200 dark:bg-gray-800 text-gray-500 dark:text-gray-400"
                }`}>
                  {tab === "transactions" ? transactions.length : payouts.length}
                </span>
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
            <div className="relative flex-1 min-w-[180px] sm:flex-initial">
              <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder={activeTab === "transactions" ? "Search client or product…" : "Search product or transfer ID…"}
                value={searchQuery}
                onChange={e => { setSearchQuery(e.target.value); setPage(1); }}
                className="w-full rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 pl-9 pr-4 py-2 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-sky-500/20 text-gray-900 dark:text-white placeholder:text-gray-400"
              />
            </div>
            <button
              onClick={() => { setQuickFilter("all"); setProductFilter("all"); setTimeFilter("lifetime"); setSearchQuery(""); setPage(1); }}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 text-xs font-semibold text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              <SlidersHorizontal className="w-3.5 h-3.5" /> Clear
            </button>
            <button
              onClick={() => { setSortAsc(!sortAsc); setPage(1); }}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 text-xs font-semibold text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              <ArrowUpDown className="w-3.5 h-3.5" /> {sortAsc ? "Oldest first" : "Newest first"}
            </button>
            <button
              onClick={handleExport}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 text-xs font-semibold text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              <Download className="w-3.5 h-3.5" /> Export
            </button>
          </div>
        </div>

        {/* Quick Filters row (transactions only) */}
        {activeTab === "transactions" && (
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <p className="text-xs text-gray-400 mr-0.5">Quick filters:</p>
              {(["successful", "abandoned"] as const).map(f => (
                <button
                  key={f}
                  onClick={() => { setQuickFilter(f); setPage(1); }}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-medium transition-all ${
                    quickFilter === f
                      ? "bg-white dark:bg-gray-900 border border-[#0EA5E9] text-[#0EA5E9]"
                      : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 border border-transparent hover:border-gray-200 dark:hover:border-gray-700"
                  }`}
                >
                  {f.charAt(0).toUpperCase() + f.slice(1)}
                </button>
              ))}
              {quickFilter !== "all" && (
                <button
                  onClick={() => { setQuickFilter("all"); setPage(1); }}
                  className="text-xs text-gray-400 hover:text-gray-600 underline underline-offset-2 transition-colors"
                >
                  Clear
                </button>
              )}
            </div>
            <p className="text-xs text-gray-400 dark:text-gray-500 tabular-nums">
              {sortedTransactions.length} result{sortedTransactions.length !== 1 ? "s" : ""}
            </p>
          </div>
        )}

        {/* Table */}
        <div className="rounded-3xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 overflow-hidden shadow-sm">
          {activeTab === "transactions" ? (
            sortedTransactions.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <div className="w-12 h-12 rounded-2xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-3">
                  <Receipt className="w-5 h-5 text-gray-400" />
                </div>
                <p className="text-sm font-semibold text-gray-500 dark:text-gray-400">No transactions found</p>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Try adjusting your filters</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead>
                    <tr className="border-b border-gray-100 dark:border-gray-800 bg-gray-50/60 dark:bg-gray-900/60">
                      <th className="px-6 py-3.5 text-[10.5px] font-bold text-gray-400 uppercase tracking-wider">Date</th>
                      <th className="px-6 py-3.5 text-[10.5px] font-bold text-gray-400 uppercase tracking-wider">Customer</th>
                      <th className="px-6 py-3.5 text-[10.5px] font-bold text-gray-400 uppercase tracking-wider">Product</th>
                      <th className="px-6 py-3.5 text-[10.5px] font-bold text-gray-400 uppercase tracking-wider">Status</th>
                      <th className="px-6 py-3.5 text-[10.5px] font-bold text-gray-400 uppercase tracking-wider text-right">Amount</th>
                      <th className="w-14" />
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedTransactions.map(tx => {
                      const cancelled = tx.status === "cancelled";
                      return (
                        <tr key={tx.id} className="border-b border-gray-50 dark:border-gray-800/50 last:border-0 hover:bg-gray-50/50 dark:hover:bg-gray-800/20 transition-colors">
                          {/* Date */}
                          <td className="px-6 py-4">
                            <p className="text-xs font-semibold text-gray-800 dark:text-gray-200 tabular-nums">
                              {fmtDate(tx.createdAt)}
                            </p>
                            <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-0.5 tabular-nums">
                              {fmtTime(tx.createdAt)}
                            </p>
                          </td>
                          {/* Customer */}
                          <td className="px-6 py-4">
                            <p className="font-semibold text-gray-900 dark:text-white text-sm">{tx.clientName || "Client"}</p>
                            <p className="text-[11px] text-gray-400 mt-0.5">{tx.clientEmail}</p>
                          </td>
                          {/* Product */}
                          <td className="px-6 py-4">
                            <p className="text-sm font-medium text-gray-700 dark:text-gray-300 max-w-[220px] truncate">
                              {tx.packageTitle || "Custom Quote"}
                            </p>
                          </td>
                          {/* Status */}
                          <td className="px-6 py-4">
                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10.5px] font-bold ${
                              cancelled
                                ? "bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400"
                                : "bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400"
                            }`}>
                              {cancelled
                                ? <XCircle className="w-3 h-3" />
                                : <CheckCircle2 className="w-3 h-3" />
                              }
                              {cancelled ? "Cancelled" : "Completed"}
                            </span>
                          </td>
                          {/* Amount */}
                          <td className="px-6 py-4 text-right">
                            <p className={`text-sm font-black tabular-nums ${cancelled ? "text-red-500" : "text-emerald-600 dark:text-emerald-500"}`}>
                              {cancelled ? "−" : "+"}{formatCurrency(tx.totalAmount)}
                            </p>
                            {!cancelled && tx.commissionAmount > 0 && (
                              <p className="text-[10.5px] text-gray-400 mt-0.5 tabular-nums">
                                −{formatCurrency(tx.commissionAmount)} platform fee
                              </p>
                            )}
                          </td>
                          {/* Link */}
                          <td className="pr-5 py-4 text-right">
                            <Link
                              href={`/editor/orders/${tx.id}`}
                              className="w-7 h-7 rounded-full border border-gray-200 dark:border-gray-700 flex items-center justify-center hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-400 transition-colors ml-auto"
                            >
                              <ArrowRight className="w-3 h-3 -rotate-45" />
                            </Link>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )
          ) : (
            sortedPayouts.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <div className="w-12 h-12 rounded-2xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-3">
                  <Banknote className="w-5 h-5 text-gray-400" />
                </div>
                <p className="text-sm font-semibold text-gray-500 dark:text-gray-400">No payouts found</p>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Payouts are initiated 7 days after order completion</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead>
                    <tr className="border-b border-gray-100 dark:border-gray-800 bg-gray-50/60 dark:bg-gray-900/60">
                      <th className="px-6 py-3.5 text-[10.5px] font-bold text-gray-400 uppercase tracking-wider">Transfer</th>
                      <th className="px-6 py-3.5 text-[10.5px] font-bold text-gray-400 uppercase tracking-wider text-right">Gross</th>
                      <th className="px-6 py-3.5 text-[10.5px] font-bold text-gray-400 uppercase tracking-wider text-right">Platform Fee</th>
                      <th className="px-6 py-3.5 text-[10.5px] font-bold text-gray-400 uppercase tracking-wider text-right">TDS</th>
                      <th className="px-6 py-3.5 text-[10.5px] font-bold text-gray-400 uppercase tracking-wider text-right">You Receive</th>
                      <th className="px-6 py-3.5 text-[10.5px] font-bold text-gray-400 uppercase tracking-wider text-center">Status</th>
                      <th className="px-6 py-3.5 text-[10.5px] font-bold text-gray-400 uppercase tracking-wider text-right">Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedPayouts.map(po => (
                      <tr key={po.id} className="border-b border-gray-50 dark:border-gray-800/50 last:border-0 hover:bg-gray-50/50 dark:hover:bg-gray-800/20 transition-colors">
                        {/* Transfer ID + Product */}
                        <td className="px-6 py-4">
                          <p className="text-[11px] font-mono text-gray-500 dark:text-gray-400 truncate max-w-[160px]">
                            {po.razorpayTransferId || po.id.slice(0, 16) + "…"}
                          </p>
                          <p className="text-xs text-gray-700 dark:text-gray-300 font-medium mt-0.5 max-w-[160px] truncate">
                            {po.packageTitle || "Project"}
                          </p>
                        </td>
                        {/* Gross */}
                        <td className="px-6 py-4 text-right tabular-nums font-semibold text-gray-700 dark:text-gray-300">
                          {formatCurrency(po.grossAmount)}
                        </td>
                        {/* Commission */}
                        <td className="px-6 py-4 text-right tabular-nums text-red-500 dark:text-red-400 font-semibold">
                          −{formatCurrency(po.commissionAmount)}
                        </td>
                        {/* TDS */}
                        <td className="px-6 py-4 text-right tabular-nums">
                          {po.tdsAmount > 0 ? (
                            <span className="text-amber-600 dark:text-amber-400 font-semibold">
                              −{formatCurrency(po.tdsAmount)}
                              <span className="block text-[10px] text-amber-400 dark:text-amber-500 font-normal">@ {po.tdsRatePct}%</span>
                            </span>
                          ) : (
                            <span className="text-gray-300 dark:text-gray-700">—</span>
                          )}
                        </td>
                        {/* Net */}
                        <td className="px-6 py-4 text-right tabular-nums font-black text-emerald-600 dark:text-emerald-400">
                          {formatCurrency(po.netAmount)}
                        </td>
                        {/* Status */}
                        <td className="px-6 py-4 text-center">
                          <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10.5px] font-bold ${
                            po.status === "completed"
                              ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400"
                              : po.status === "processing"
                                ? "bg-sky-50 dark:bg-sky-950/40 text-sky-700 dark:text-sky-400"
                                : "bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400"
                          }`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${
                              po.status === "completed" ? "bg-emerald-500" : po.status === "processing" ? "bg-sky-500 animate-pulse" : "bg-amber-500 animate-pulse"
                            }`} />
                            {po.status === "completed" ? "Settled" : po.status === "processing" ? "Processing" : "Pending"}
                          </span>
                        </td>
                        {/* Date */}
                        <td className="px-6 py-4 text-right">
                          {po.settledAt ? (
                            <>
                              <p className="text-xs font-semibold text-gray-700 dark:text-gray-200 tabular-nums">{fmtDate(po.settledAt)}</p>
                              <p className="text-[11px] text-gray-400 mt-0.5 tabular-nums">{fmtTime(po.settledAt)}</p>
                            </>
                          ) : po.scheduledPayoutAt ? (
                            <>
                              <p className="text-xs font-semibold text-amber-600 dark:text-amber-400 tabular-nums">{fmtDate(po.scheduledPayoutAt)}</p>
                              <p className="text-[11px] text-amber-400 mt-0.5 flex items-center justify-end gap-1">
                                <Clock className="w-3 h-3" /> Scheduled
                              </p>
                            </>
                          ) : (
                            <>
                              <p className="text-xs font-semibold text-gray-700 dark:text-gray-200 tabular-nums">{fmtDate(po.createdAt)}</p>
                              <p className="text-[11px] text-gray-400 mt-0.5">Created</p>
                            </>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          )}

          {/* Pagination */}
          {((activeTab === "transactions" ? totalTxPages : totalPayoutPages) > 1) && (
            <div className="px-6 py-4 border-t border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/50 flex items-center justify-between gap-4">
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Page <span className="font-bold text-gray-700 dark:text-white">{page}</span> of{" "}
                <span className="font-bold text-gray-700 dark:text-white">
                  {activeTab === "transactions" ? totalTxPages : totalPayoutPages}
                </span>
              </p>
              <div className="flex items-center gap-2">
                <button
                  disabled={page <= 1}
                  onClick={() => setPage(page - 1)}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 text-xs font-semibold text-gray-700 dark:text-gray-300 disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                >
                  <ChevronLeft className="w-3.5 h-3.5" /> Previous
                </button>
                <button
                  disabled={page >= (activeTab === "transactions" ? totalTxPages : totalPayoutPages)}
                  onClick={() => setPage(page + 1)}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 text-xs font-semibold text-gray-700 dark:text-gray-300 disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                >
                  Next <ChevronRightIcon className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
