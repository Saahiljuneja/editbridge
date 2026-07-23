"use client";

import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from "recharts";
import { formatCurrency } from "@/lib/utils";


const STATUS_COLORS: Record<string, string> = {
  completed:          "#0EA5E9",
  in_progress:        "#3B82F6",
  pending:            "#9CA3AF",
  delivered:          "#0EA5E9",
  revision_requested: "#F59E0B",
  cancelled:          "#EF4444",
  disputed:           "#F97316",
};

const STATUS_LABELS: Record<string, string> = {
  completed: "Completed", in_progress: "In Progress", pending: "Pending",
  delivered: "Delivered", revision_requested: "Revision", cancelled: "Cancelled", disputed: "Disputed",
};

interface Props {
  chartData: { month: string; earnings: number; orders: number }[];
  pkgData: { title: string; orderCount: number; earnings: number; completionRate: number }[];
  statusData: { status: string; count: number }[];
}

export function AnalyticsCharts({ chartData, pkgData, statusData }: Props) {
  const hasChartData = chartData.length > 0;
  const hasPkgData = pkgData.length > 0;

  return (
    <div className="space-y-6">
      {/* Earnings + orders line chart */}
      <div className="rounded-2xl border border-gray-100 bg-white shadow-sm p-6">
        <p className="font-semibold text-gray-900 text-sm mb-5">Earnings — last 6 months</p>
        {!hasChartData ? (
          <div className="h-48 flex items-center justify-center text-sm text-gray-400">No completed orders yet.</div>
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={chartData} barSize={32}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#9CA3AF" }} axisLine={false} tickLine={false} />
              <YAxis
                tick={{ fontSize: 11, fill: "#9CA3AF" }}
                axisLine={false} tickLine={false}
                tickFormatter={v => `₹${(v / 100).toFixed(0)}`}
              />
              <Tooltip
                formatter={(v) => [formatCurrency(Number(v ?? 0)), "Earnings"]}
                contentStyle={{ borderRadius: 12, border: "1px solid #E5E7EB", fontSize: 12 }}
              />
              <Bar dataKey="earnings" fill="#0EA5E9" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Package performance */}
        <div className="rounded-2xl border border-gray-100 bg-white shadow-sm p-6">
          <p className="font-semibold text-gray-900 text-sm mb-5">Package performance</p>
          {!hasPkgData ? (
            <div className="h-40 flex items-center justify-center text-sm text-gray-400">No packages yet.</div>
          ) : (
            <div className="space-y-4">
              {pkgData.map(pkg => (
                <div key={pkg.title}>
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <span
                        className="inline-block w-2 h-2 rounded-full shrink-0"
                        style={{ background: "#0EA5E9" }}
                      />
                      <span className="text-sm font-medium text-gray-800 truncate max-w-[160px]">{pkg.title}</span>
                    </div>
                    <span className="text-xs text-gray-400">{pkg.orderCount} orders</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full"
                        style={{ width: `${pkg.completionRate}%`, background: "#0EA5E9" }}
                      />
                    </div>
                    <span className="text-xs font-medium text-gray-500 w-12 text-right">{formatCurrency(pkg.earnings)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Order status donut */}
        <div className="rounded-2xl border border-gray-100 bg-white shadow-sm p-6">
          <p className="font-semibold text-gray-900 text-sm mb-5">Order breakdown</p>
          {statusData.length === 0 ? (
            <div className="h-40 flex items-center justify-center text-sm text-gray-400">No orders yet.</div>
          ) : (
            <div className="flex items-center gap-6">
              <ResponsiveContainer width={140} height={140}>
                <PieChart>
                  <Pie data={statusData} dataKey="count" nameKey="status" cx="50%" cy="50%" innerRadius={40} outerRadius={65} paddingAngle={2}>
                    {statusData.map(s => (
                      <Cell key={s.status} fill={STATUS_COLORS[s.status] ?? "#9CA3AF"} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(v, n) => [v, STATUS_LABELS[String(n)] ?? n]}
                    contentStyle={{ borderRadius: 12, border: "1px solid #E5E7EB", fontSize: 12 }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex-1 space-y-2">
                {statusData.map(s => (
                  <div key={s.status} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full shrink-0" style={{ background: STATUS_COLORS[s.status] ?? "#9CA3AF" }} />
                      <span className="text-xs text-gray-600">{STATUS_LABELS[s.status] ?? s.status}</span>
                    </div>
                    <span className="text-xs font-semibold text-gray-900">{s.count}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
