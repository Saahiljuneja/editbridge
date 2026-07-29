"use client";

import { useEffect, useState, useCallback } from "react";
import { Eye, MousePointerClick, TrendingUp, ShoppingBag, Image as ImageIcon, Video } from "lucide-react";
import { cn } from "@/lib/utils";

interface PackageStat {
  id: string;
  title: string;
  clicks: number;
  orders: number;
}

interface PortfolioStat {
  id: string;
  title: string | null;
  type: string;
  views: number;
}

interface AnalyticsData {
  days: number;
  profileViews: number;
  packageClicks: number;
  clickToOrderRate: number;
  ordersThisMonth: number;
  mostClickedPackage: PackageStat | null;
  packages: PackageStat[];
  portfolio: PortfolioStat[];
}

const RANGE_OPTIONS = [
  { label: "7 days", value: 7 },
  { label: "30 days", value: 30 },
  { label: "90 days", value: 90 },
];

export function ProfileAnalyticsSection() {
  const [days, setDays] = useState(7);
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback((d: number) => {
    setLoading(true);
    fetch(`/api/editor/analytics?days=${d}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((res) => { if (res) setData(res); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(days); }, [days, load]);

  const maxClicks = data?.packages.reduce((m, p) => Math.max(m, p.clicks), 0) ?? 0;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-semibold text-gray-900 text-sm">Profile Performance</h2>
          <p className="text-xs text-gray-400 mt-0.5">Views, clicks, and what converts</p>
        </div>
        <div className="flex gap-1 bg-gray-100 rounded-xl p-1">
          {RANGE_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setDays(opt.value)}
              className={cn(
                "px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors",
                days === opt.value ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: `Profile views (${days}d)`, value: data?.profileViews ?? "—", icon: Eye, bg: "bg-blue-50", color: "text-blue-600" },
          { label: "Package clicks", value: data?.packageClicks ?? "—", icon: MousePointerClick, bg: "bg-blue-50", color: "text-blue-600" },
          { label: "Click-to-order rate", value: data ? `${data.clickToOrderRate}%` : "—", icon: TrendingUp, bg: "bg-emerald-50", color: "text-emerald-600" },
          { label: "Orders this month", value: data?.ordersThisMonth ?? "—", icon: ShoppingBag, bg: "bg-amber-50", color: "text-amber-600" },
        ].map(({ label, value, icon: Icon, bg, color }) => (
          <div key={label} className="rounded-2xl border border-gray-100 bg-white shadow-sm p-5">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-medium text-gray-500">{label}</p>
              <div className={cn("w-8 h-8 rounded-xl flex items-center justify-center", bg)}>
                <Icon className={cn("w-4 h-4", color)} />
              </div>
            </div>
            <p className="text-2xl font-bold text-gray-900">{loading ? "…" : value}</p>
          </div>
        ))}
      </div>

      {/* Most-clicked package bar */}
      {data?.mostClickedPackage && (
        <div className="rounded-2xl border border-gray-100 bg-white shadow-sm p-5">
          <p className="text-xs font-medium text-gray-500 mb-3">Most-clicked package</p>
          <div className="relative h-8 rounded-lg bg-gray-100 overflow-hidden">
            <div
              className="absolute inset-y-0 left-0 rounded-lg bg-gradient-to-r from-[var(--brand-client)] to-[#0284C7] transition-all"
              style={{ width: `${maxClicks > 0 ? (data.mostClickedPackage.clicks / maxClicks) * 100 : 0}%` }}
            />
            <div className="absolute inset-0 flex items-center justify-end px-3">
              <span className="text-xs font-bold text-gray-800">
                {data.mostClickedPackage.title} — {data.mostClickedPackage.clicks} click{data.mostClickedPackage.clicks !== 1 ? "s" : ""}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Package performance table */}
      {data && data.packages.length > 0 && (
        <div className="rounded-2xl border border-gray-100 bg-white shadow-sm overflow-hidden">
          <div className="px-5 py-3.5 border-b border-gray-100">
            <p className="text-sm font-semibold text-gray-900">Package performance</p>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left px-5 py-2.5 font-medium text-gray-500 text-xs">Package</th>
                <th className="text-right px-4 py-2.5 font-medium text-gray-500 text-xs">Clicks</th>
                <th className="text-right px-4 py-2.5 font-medium text-gray-500 text-xs">Orders</th>
                <th className="text-right px-4 py-2.5 font-medium text-gray-500 text-xs">Conversion</th>
              </tr>
            </thead>
            <tbody>
              {data.packages.map((pkg) => (
                <tr key={pkg.id} className="border-b border-gray-50 last:border-0">
                  <td className="px-5 py-3 font-medium text-gray-800 truncate max-w-[200px]">{pkg.title}</td>
                  <td className="px-4 py-3 text-right tabular-nums text-gray-600">{pkg.clicks}</td>
                  <td className="px-4 py-3 text-right tabular-nums text-gray-600">{pkg.orders}</td>
                  <td className="px-4 py-3 text-right tabular-nums text-gray-600">
                    {pkg.clicks > 0 ? `${Math.round((pkg.orders / pkg.clicks) * 100)}%` : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Portfolio performance grid */}
      {data && data.portfolio.length > 0 && (
        <div className="rounded-2xl border border-gray-100 bg-white shadow-sm p-5">
          <p className="text-sm font-semibold text-gray-900 mb-3">Portfolio performance</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {data.portfolio.map((item) => (
              <div key={item.id} className="rounded-xl border border-gray-100 bg-gray-50 p-3 flex items-center gap-2.5">
                {item.type === "video" ? <Video className="w-4 h-4 text-gray-400 shrink-0" /> : <ImageIcon className="w-4 h-4 text-gray-400 shrink-0" />}
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium text-gray-700 truncate">{item.title ?? "Untitled"}</p>
                  <p className="text-[11px] text-gray-400">{item.views} view{item.views !== 1 ? "s" : ""}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
