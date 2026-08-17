"use client";

import { useState, useMemo } from "react";
import {
  Search, SlidersHorizontal, ArrowUpDown, Download,
  Settings, HelpCircle,
  ArrowRight,
  ChevronLeft, ChevronRight as ChevronRightIcon,
} from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import { BankAccountSection } from "./bank-account-section";
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

function formatTxDate(dateVal: Date | string) {
  const d = new Date(dateVal);
  return d.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric"
  }) + "; " + d.toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true
  });
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
    const value = payload[0].value;
    const label = payload[0].payload.tooltipLabel;
    return (
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl px-4 py-3 shadow-[0_8px_30px_rgba(0,0,0,0.06)] text-xs text-gray-900 dark:text-gray-100">
        <p className="font-extrabold text-[10px] text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-1">{label}</p>
        <p className="font-bold flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0" />
          Amount: <span className="text-gray-950 dark:text-white font-extrabold">₹{value.toLocaleString("en-IN", { minimumFractionDigits: 1 })}</span>
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
  const [showBankSettings, setShowBankSettings] = useState(false);
  const [productFilter, setProductFilter] = useState("all");
  const [timeFilter, setTimeFilter] = useState("lifetime");
  const [searchQuery, setSearchQuery] = useState("");
  const [quickFilter, setQuickFilter] = useState<"successful" | "abandoned" | "all">("successful");

  const [sortAsc, setSortAsc] = useState(false);

  const [page, setPage] = useState(1);
  const PAGE_SIZE = 10;

  const uniquePackages = useMemo(() => {
    const pkgs = new Set<string>();
    transactions.forEach(tx => {
      if (tx.packageTitle) pkgs.add(tx.packageTitle);
    });
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
        const clientName = (tx.clientName ?? "").toLowerCase();
        const clientEmail = (tx.clientEmail ?? "").toLowerCase();
        const title = (tx.packageTitle ?? "").toLowerCase();
        if (!clientName.includes(q) && !clientEmail.includes(q) && !title.includes(q)) return false;
      }

      return true;
    });
  }, [transactions, productFilter, timeFilter, quickFilter, searchQuery]);

  const sortedTransactions = useMemo(() => {
    const sorted = [...filteredTransactions];
    sorted.sort((a, b) => {
      const tA = new Date(a.createdAt).getTime();
      const tB = new Date(b.createdAt).getTime();
      return sortAsc ? tA - tB : tB - tA;
    });
    return sorted;
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
        const title = (p.packageTitle ?? "").toLowerCase();
        const transferId = (p.razorpayTransferId ?? "").toLowerCase();
        if (!title.includes(q) && !transferId.includes(q)) return false;
      }

      return true;
    });
  }, [payouts, productFilter, timeFilter, searchQuery]);

  const sortedPayouts = useMemo(() => {
    const sorted = [...filteredPayouts];
    sorted.sort((a, b) => {
      const tA = new Date(a.createdAt).getTime();
      const tB = new Date(b.createdAt).getTime();
      return sortAsc ? tA - tB : tB - tA;
    });
    return sorted;
  }, [filteredPayouts, sortAsc]);

  const paginatedPayouts = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return sortedPayouts.slice(start, start + PAGE_SIZE);
  }, [sortedPayouts, page]);

  const totalPayoutPages = Math.ceil(sortedPayouts.length / PAGE_SIZE);

  // Earnings card: only product + time filters — search query must not affect the total or chart
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

  const totalEarningsVal = useMemo(() => {
    return earningsPayouts
      .filter(p => p.status === "completed")
      .reduce((sum, p) => sum + p.netAmount, 0);
  }, [earningsPayouts]);

  // Chart uses the same search-excluded list so it always matches the displayed total
  const chartCoordinates = useMemo(() => {
    const completedPayouts = earningsPayouts
      .filter(p => p.status === "completed" && p.settledAt)
      .sort((a, b) => new Date(a.settledAt!).getTime() - new Date(b.settledAt!).getTime());

    let runningSum = 0;
    const points = completedPayouts.map(p => {
      runningSum += p.netAmount;
      const d = new Date(p.settledAt!);
      const formattedTooltipDate = d.toLocaleDateString("en-IN", {
        weekday: "long",
        day: "numeric",
        month: "short"
      }) + ", " + d.toLocaleTimeString("en-IN", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false
      });

      return {
        tooltipLabel: formattedTooltipDate,
        year: d.getFullYear(),
        amount: runningSum / 100,
      };
    });

    if (points.length === 0) {
      return [
        { tooltipLabel: "2024", year: 2024, amount: 0 },
        { tooltipLabel: "2025", year: 2025, amount: 0 },
        { tooltipLabel: "2026", year: 2026, amount: 0 },
      ];
    }
    return points;
  }, [earningsPayouts]);

  function handleExport() {
    const list = activeTab === "transactions" ? sortedTransactions : sortedPayouts;
    const headers = activeTab === "transactions"
      ? ["Date", "Customer", "Email", "Product", "Amount"]
      : ["Date", "Payout ID", "Gross", "Commission", "TDS", "Net", "Status"];

    const rows = list.map(item => {
      if (activeTab === "transactions") {
        const tx = item as TransactionRow;
        return [tx.createdAt, tx.clientName, tx.clientEmail, tx.packageTitle, tx.totalAmount / 100].map(escapeCsvField).join(",");
      } else {
        const po = item as PayoutRow;
        return [po.createdAt, po.razorpayTransferId, po.grossAmount / 100, po.commissionAmount / 100, po.tdsAmount / 100, po.netAmount / 100, po.status].map(escapeCsvField).join(",");
      }
    });

    const csvContent = "data:text/csv;charset=utf-8," + encodeURIComponent([headers.join(","), ...rows].join("\n"));
    const link = document.createElement("a");
    link.setAttribute("href", csvContent);
    link.setAttribute("download", `editor_${activeTab}_report.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  return (
    <div className="min-h-screen bg-gray-50/50 dark:bg-gray-950">
      {/* Top Banner */}
      <div className="bg-white dark:bg-gray-900 px-8 py-6 border-b border-gray-200 dark:border-gray-800">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight">Payments</h1>
          </div>
          <div className="flex items-center gap-3">
            {(() => {
              let label: string;
              let bg: string;
              let text: string;
              let dot: string;
              let pulse = false;

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
            <button
              onClick={() => setShowBankSettings(!showBankSettings)}
              className={`p-2 rounded-xl border border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800 transition-all ${
                showBankSettings ? "bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white" : "bg-white dark:bg-gray-900 text-gray-400"
              }`}
            >
              <Settings className="w-4 h-4" />
            </button>
          </div>
        </div>

        {showBankSettings && (
          <div className="mt-5 border-t border-gray-100 dark:border-gray-800 pt-5">
            <BankAccountSection
              bankAccountName={bankAccountName}
              bankAccountLastFour={bankAccountLastFour}
              bankIfsc={bankIfsc}
            />
          </div>
        )}
      </div>

      <div className="px-8 py-7 space-y-7">
        {/* Earnings Card & Area Chart */}
        <div className="rounded-3xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-6 shadow-sm">
          <div className="flex items-start justify-between mb-6">
            <div>
              <div className="flex items-center gap-1 text-xs font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500">
                TOTAL EARNINGS
                <HelpCircle className="w-3.5 h-3.5 text-gray-300 dark:text-gray-600 cursor-pointer" />
              </div>
              <p className="text-4xl font-black text-gray-900 dark:text-white tracking-tight mt-1">
                {new Intl.NumberFormat("en-IN", {
                  style: "currency",
                  currency: "INR",
                  minimumFractionDigits: 1,
                  maximumFractionDigits: 2,
                }).format(totalEarningsVal / 100)}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <select
                value={productFilter}
                onChange={e => { setProductFilter(e.target.value); setPage(1); }}
                className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 px-3 py-1.5 text-xs font-bold text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              >
                <option value="all">All Products</option>
                {uniquePackages.map(p => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>

              <select
                value={timeFilter}
                onChange={e => { setTimeFilter(e.target.value); setPage(1); }}
                className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 px-3 py-1.5 text-xs font-bold text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              >
                <option value="lifetime">Lifetime</option>
                <option value="year">This Year</option>
                <option value="month">This Month</option>
              </select>
            </div>
          </div>

          <div className="h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartCoordinates} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="payoutAreaGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#38bdf8" stopOpacity={0.25}/>
                    <stop offset="95%" stopColor="#38bdf8" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" className="stroke-gray-100 dark:stroke-gray-800" />
                <XAxis
                  dataKey="year"
                  tick={{ fontSize: 10, fill: "#9ca3af" }}
                  tickLine={false}
                  axisLine={false}
                  type="number"
                  domain={["dataMin", "dataMax"]}
                  tickCount={3}
                  tickFormatter={(val) => val.toString()}
                />
                <YAxis
                  tick={{ fontSize: 10, fill: "#9ca3af" }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(val) => `₹${val.toLocaleString("en-IN")}`}
                />
                <Tooltip content={<CustomTooltip />} />
                <Area
                  type="monotone"
                  dataKey="amount"
                  name="Earnings"
                  stroke="#38bdf8"
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#payoutAreaGrad)"
                  activeDot={{ r: 5, fill: "#38bdf8", strokeWidth: 0 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Tabs Control Row */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center bg-gray-100 dark:bg-gray-900 p-1.5 rounded-2xl w-fit">
            <button
              onClick={() => { setActiveTab("transactions"); setPage(1); }}
              className={`px-5 py-2 rounded-xl text-xs font-bold transition-all ${
                activeTab === "transactions"
                  ? "bg-neutral-950 dark:bg-white text-white dark:text-neutral-950 shadow-sm"
                  : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
              }`}
            >
              Transactions
            </button>
            <button
              onClick={() => { setActiveTab("payouts"); setPage(1); }}
              className={`px-5 py-2 rounded-xl text-xs font-bold transition-all ${
                activeTab === "payouts"
                  ? "bg-neutral-950 dark:bg-white text-white dark:text-neutral-950 shadow-sm"
                  : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
              }`}
            >
              Payouts
            </button>
          </div>

          {/* Search, Filter, Sort Actions */}
          <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
            <div className="relative flex-1 min-w-[200px] sm:flex-initial">
              <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search..."
                value={searchQuery}
                onChange={e => { setSearchQuery(e.target.value); setPage(1); }}
                className="w-full rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 pl-10 pr-4 py-2 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-gray-900 dark:text-white"
              />
            </div>
            <button
              onClick={() => {
                setQuickFilter("all");
                setProductFilter("all");
                setTimeFilter("lifetime");
                setSearchQuery("");
                setPage(1);
              }}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 text-xs font-bold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
            >
              <SlidersHorizontal className="w-3.5 h-3.5" /> Clear Filters
            </button>
            <button
              onClick={() => { setSortAsc(!sortAsc); setPage(1); }}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 text-xs font-bold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
            >
              <ArrowUpDown className="w-3.5 h-3.5" /> Sort
            </button>
            <button
              onClick={handleExport}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 text-xs font-bold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
            >
              <Download className="w-3.5 h-3.5" /> Export
            </button>
          </div>
        </div>

        {/* Quick Filters row & count */}
        {activeTab === "transactions" && (
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-1.5">
              <p className="text-xs text-gray-400 font-bold mr-1 uppercase tracking-wider">Quick filters:</p>
              <button
                onClick={() => { setQuickFilter("successful"); setPage(1); }}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  quickFilter === "successful"
                    ? "bg-gray-200 dark:bg-gray-800 text-neutral-800 dark:text-neutral-200"
                    : "text-gray-400 hover:text-gray-600"
                }`}
              >
                Successful
              </button>
              <button
                onClick={() => { setQuickFilter("abandoned"); setPage(1); }}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  quickFilter === "abandoned"
                    ? "bg-gray-200 dark:bg-gray-800 text-neutral-800 dark:text-neutral-200"
                    : "text-gray-400 hover:text-gray-600"
                }`}
              >
                Abandoned
              </button>
            </div>
            <p className="text-xs text-gray-400 dark:text-gray-500 font-bold tabular-nums">
              {sortedTransactions.length} transaction{sortedTransactions.length !== 1 ? "s" : ""}
            </p>
          </div>
        )}

        {/* Table view */}
        <div className="rounded-3xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 overflow-hidden shadow-sm">
          {activeTab === "transactions" ? (
            sortedTransactions.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <p className="text-sm font-semibold text-gray-400">No transactions match your filters.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead>
                    <tr className="border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/50 text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                      <th className="px-6 py-4 font-extrabold">Date</th>
                      <th className="px-6 py-4 font-extrabold">Customer Details</th>
                      <th className="px-6 py-4 font-extrabold">Product</th>
                      <th className="px-6 py-4 font-extrabold">Amount</th>
                      <th className="w-16"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedTransactions.map(tx => (
                      <tr key={tx.id} className="border-b border-gray-50 dark:border-gray-800/50 last:border-0 hover:bg-gray-50/40 dark:hover:bg-gray-800/15 transition-colors">
                        <td className="px-6 py-4.5 text-xs text-gray-700 dark:text-gray-300 font-medium tabular-nums">
                          {formatTxDate(tx.createdAt)}
                        </td>
                        <td className="px-6 py-4.5">
                          <p className="font-bold text-gray-900 dark:text-white">{tx.clientName || "Client"}</p>
                          <p className="text-xs text-gray-400 mt-0.5">{tx.clientEmail}</p>
                        </td>
                        <td className="px-6 py-4.5">
                          <div className="flex items-center">
                            <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10.5px] font-bold bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-400 mr-2 shrink-0">
                              Payment Pages
                            </span>
                            <span className="font-semibold text-gray-800 dark:text-gray-200 truncate max-w-[240px]">
                              {tx.packageTitle || "Custom Quote Service"}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4.5">
                          <span className={`text-sm font-extrabold tabular-nums ${tx.status === "cancelled" ? "text-red-500" : "text-emerald-600"}`}>
                            {tx.status === "cancelled" ? "−" : "+"}
                            {formatCurrency(tx.totalAmount)}
                          </span>
                        </td>
                        <td className="pr-6 py-4.5 text-right">
                          <Link
                            href={`/editor/orders/${tx.id}`}
                            className="w-8 h-8 rounded-full border border-gray-200 dark:border-gray-800 flex items-center justify-center hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-400 dark:text-gray-500 transition-colors"
                          >
                            <ArrowRight className="w-3.5 h-3.5 -rotate-45" />
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          ) : (
            sortedPayouts.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <p className="text-sm font-semibold text-gray-400">No payouts match your filters.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead>
                    <tr className="border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/50 text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                      <th className="px-6 py-4 font-extrabold">Payout ID</th>
                      <th className="px-6 py-4 font-extrabold">Gross</th>
                      <th className="px-6 py-4 font-extrabold text-right">Commission</th>
                      <th className="px-6 py-4 font-extrabold text-right">TDS</th>
                      <th className="px-6 py-4 font-extrabold text-right">You Receive</th>
                      <th className="px-6 py-4 font-extrabold text-center">Status</th>
                      <th className="px-6 py-4 font-extrabold text-right">Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedPayouts.map(po => (
                      <tr key={po.id} className="border-b border-gray-50 dark:border-gray-800/50 last:border-0 hover:bg-gray-50/40 dark:hover:bg-gray-800/15 transition-colors">
                        <td className="px-6 py-4.5 font-semibold text-gray-900 dark:text-white">
                          <p className="text-xs truncate max-w-[150px] font-mono text-gray-500">{po.razorpayTransferId || po.id}</p>
                          <p className="text-[10px] text-gray-400 mt-0.5">{po.packageTitle || "Editor Project"}</p>
                        </td>
                        <td className="px-6 py-4.5 tabular-nums font-semibold text-gray-700 dark:text-gray-300">
                          {formatCurrency(po.grossAmount)}
                        </td>
                        <td className="px-6 py-4.5 tabular-nums text-right text-red-500 font-semibold">
                          −{formatCurrency(po.commissionAmount)}
                        </td>
                        <td className="px-6 py-4.5 tabular-nums text-right font-medium">
                          {po.tdsAmount > 0 ? (
                            <span className="text-amber-600 dark:text-amber-500">
                              −{formatCurrency(po.tdsAmount)}
                              <span className="block text-[9.5px] text-amber-500">@ {po.tdsRatePct}%</span>
                            </span>
                          ) : (
                            <span className="text-gray-300 dark:text-gray-700">—</span>
                          )}
                        </td>
                        <td className="px-6 py-4.5 tabular-nums text-right font-black text-emerald-600 dark:text-emerald-500">
                          {formatCurrency(po.netAmount)}
                        </td>
                        <td className="px-6 py-4.5 text-center">
                          <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold ${
                            po.status === "completed"
                              ? "bg-green-50 dark:bg-green-950/40 text-green-700 dark:text-green-400"
                              : po.status === "processing"
                                ? "bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-400"
                                : "bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400"
                          }`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${po.status === "completed" ? "bg-green-500" : po.status === "processing" ? "bg-blue-500" : "bg-amber-500"}`} />
                            {po.status === "completed" ? "Settled" : po.status === "processing" ? "Processing" : "Pending"}
                          </span>
                        </td>
                        <td className="px-6 py-4.5 text-right text-xs text-gray-400 dark:text-gray-500 font-medium tabular-nums">
                          {po.settledAt
                            ? formatDate(po.settledAt)
                            : po.scheduledPayoutAt
                              ? `Scheduled ${formatDate(po.scheduledPayoutAt)}`
                              : formatDate(po.createdAt)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          )}

          {/* Pagination Controls Footer */}
          {((activeTab === "transactions" ? totalTxPages : totalPayoutPages) > 1) && (
            <div className="px-6 py-4 border-t border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/50 flex items-center justify-between gap-4">
              <p className="text-xs text-gray-500 dark:text-gray-400 font-bold">
                Page <span className="font-extrabold text-gray-700 dark:text-white">{page}</span> of{" "}
                <span className="font-extrabold text-gray-700 dark:text-white">
                  {activeTab === "transactions" ? totalTxPages : totalPayoutPages}
                </span>
              </p>
              <div className="flex items-center gap-2">
                <button
                  disabled={page <= 1}
                  onClick={() => setPage(page - 1)}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 text-xs font-bold text-gray-700 dark:text-gray-300 disabled:opacity-40 transition-colors hover:bg-gray-50"
                >
                  <ChevronLeft className="w-3.5 h-3.5" /> Previous
                </button>
                <button
                  disabled={page >= (activeTab === "transactions" ? totalTxPages : totalPayoutPages)}
                  onClick={() => setPage(page + 1)}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 text-xs font-bold text-gray-700 dark:text-gray-300 disabled:opacity-40 transition-colors hover:bg-gray-50"
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
