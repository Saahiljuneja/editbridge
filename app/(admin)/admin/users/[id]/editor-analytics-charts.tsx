"use client";

import { Star, TrendingUp, CheckCircle, XCircle, RotateCcw, Clock } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

type AnalyticsProps = {
  totalOrders: number;
  totalEarnings: number;
  avgRating: number;
  completionRate: number;
  revisionRate: number;
  avgResponseTimeMin: number;
};

export function EditorAnalyticsCharts({ stats }: { stats: AnalyticsProps }) {
  const cancellationRate = 100 - stats.completionRate;

  return (
    <div className="rounded-xl border border-border bg-white p-5 mb-6 space-y-5">
      <p className="font-semibold text-sm text-gray-900 flex items-center gap-1.5">
        <TrendingUp className="w-4 h-4 text-violet-500" /> Editor Analytics & Performance
      </p>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="border border-neutral-100 bg-neutral-50/20 p-3 rounded-xl">
          <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider block mb-1">Total Payouts</span>
          <span className="text-lg font-bold text-gray-900 tabular-nums">{formatCurrency(stats.totalEarnings)}</span>
        </div>

        <div className="border border-neutral-100 bg-neutral-50/20 p-3 rounded-xl">
          <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider block mb-1">Order Completion</span>
          <span className="text-lg font-bold text-gray-900 tabular-nums flex items-center gap-1">
            <CheckCircle className="w-4 h-4 text-emerald-500" /> {stats.completionRate}%
          </span>
        </div>

        <div className="border border-neutral-100 bg-neutral-50/20 p-3 rounded-xl">
          <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider block mb-1">Revision Rate</span>
          <span className="text-lg font-bold text-gray-900 tabular-nums flex items-center gap-1">
            <RotateCcw className="w-4 h-4 text-orange-500" /> {stats.revisionRate}%
          </span>
        </div>

        <div className="border border-neutral-100 bg-neutral-50/20 p-3 rounded-xl">
          <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider block mb-1">Avg Response</span>
          <span className="text-lg font-bold text-gray-900 tabular-nums flex items-center gap-1">
            <Clock className="w-4 h-4 text-brand-primary" /> {stats.avgResponseTimeMin}m
          </span>
        </div>
      </div>

      {/* CSS Visual Charts */}
      <div className="space-y-4 pt-3 border-t border-border">
        {/* Completion vs Cancellation Bar */}
        <div className="space-y-1.5">
          <div className="flex justify-between text-xs font-semibold text-gray-700">
            <span>Order Outcomes</span>
            <span>{stats.completionRate}% Complete / {cancellationRate}% Cancelled</span>
          </div>
          <div className="w-full h-3 rounded-full bg-red-100 overflow-hidden flex">
            <div className="h-full bg-emerald-500" style={{ width: `${stats.completionRate}%` }} />
            <div className="h-full bg-red-500" style={{ width: `${cancellationRate}%` }} />
          </div>
        </div>

        {/* Revision Impact Bar */}
        <div className="space-y-1.5">
          <div className="flex justify-between text-xs font-semibold text-gray-700">
            <span>Revision Overhead</span>
            <span>{stats.revisionRate}% Orders Require Revisions</span>
          </div>
          <div className="w-full h-3 rounded-full bg-neutral-100 overflow-hidden flex">
            <div className="h-full bg-orange-400" style={{ width: `${stats.revisionRate}%` }} />
            <div className="h-full bg-gray-300" style={{ width: `${100 - stats.revisionRate}%` }} />
          </div>
        </div>
      </div>
    </div>
  );
}
