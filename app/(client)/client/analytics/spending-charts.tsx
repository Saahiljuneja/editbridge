"use client";

import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
} from "recharts";
import { cn } from "@/lib/utils";

const STATUS_COLORS: Record<string, string> = {
  completed:          "var(--brand-client)",
  in_progress:        "var(--brand-client)",
  pending:            "#9CA3AF",
  delivered:          "var(--brand-editor)",
  revision_requested: "#D97706",
  disputed:           "#EF4444",
  cancelled:          "#D1D5DB",
};
const STATUS_LABELS: Record<string, string> = {
  completed: "Completed", in_progress: "In Progress", pending: "Pending",
  delivered: "Delivered", revision_requested: "Revision", disputed: "Disputed", cancelled: "Cancelled",
};

function formatRupees(v: number) {
  return `₹${(v / 100).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
}

export function SpendingCharts({
  monthlyData,
  editorData,
  statusData,
}: {
  monthlyData: { month: string; spent: number }[];
  editorData: { editor_name: string; order_count: number; total_spent: number }[];
  statusData: { status: string; count: number }[];
}) {
  const hasMonthly = monthlyData.length > 0;
  const hasEditors = editorData.length > 0;
  const hasStatus  = statusData.length > 0;
  const maxSpend = editorData[0]?.total_spent ?? 1;

  return (
    <div className="space-y-6">
      {/* Monthly spend bar chart */}
      <div className="rounded-2xl border border-gray-100 bg-white shadow-sm p-6">
        <p className="font-semibold text-gray-900 text-sm mb-5">Monthly Spend (last 6 months)</p>
        {!hasMonthly ? (
          <div className="h-40 flex items-center justify-center text-sm text-gray-400">No completed orders yet.</div>
        ) : (
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={monthlyData} barSize={32}>
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#9CA3AF" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: "#9CA3AF" }} axisLine={false} tickLine={false} tickFormatter={v => `₹${(v / 100).toFixed(0)}`} />
              <Tooltip
                formatter={(v) => [formatRupees(Number(v ?? 0)), "Spent"]}
                contentStyle={{ borderRadius: 12, border: "1px solid #E5E7EB", fontSize: 12 }}
              />
              <Bar dataKey="spent" fill="var(--brand-client)" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Top editors */}
        <div className="rounded-2xl border border-gray-100 bg-white shadow-sm p-6">
          <p className="font-semibold text-gray-900 text-sm mb-5">Top Editors by Spend</p>
          {!hasEditors ? (
            <div className="h-40 flex items-center justify-center text-sm text-gray-400">No completed orders yet.</div>
          ) : (
            <div className="space-y-4">
              {editorData.map((e) => (
                <div key={e.editor_name}>
                  <div className="flex items-center justify-between mb-1.5">
                    <p className="text-sm font-medium text-gray-800 truncate max-w-[160px]">{e.editor_name ?? "Unknown"}</p>
                    <span className="text-xs text-gray-400">{e.order_count} order{e.order_count !== 1 ? "s" : ""}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full rounded-full bg-[var(--brand-client)]" style={{ width: `${Math.round((e.total_spent / maxSpend) * 100)}%` }} />
                    </div>
                    <span className="text-xs font-medium text-gray-500 w-16 text-right">{formatRupees(e.total_spent)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Orders by status donut */}
        <div className="rounded-2xl border border-gray-100 bg-white shadow-sm p-6">
          <p className="font-semibold text-gray-900 text-sm mb-5">Orders by Status</p>
          {!hasStatus ? (
            <div className="h-40 flex items-center justify-center text-sm text-gray-400">No orders yet.</div>
          ) : (
            <div className="flex items-center gap-6">
              <ResponsiveContainer width={140} height={140}>
                <PieChart>
                  <Pie data={statusData} dataKey="count" nameKey="status" cx="50%" cy="50%" innerRadius={40} outerRadius={65} paddingAngle={2}>
                    {statusData.map(s => <Cell key={s.status} fill={STATUS_COLORS[s.status] ?? "#9CA3AF"} />)}
                  </Pie>
                  <Tooltip formatter={(v, n) => [v, STATUS_LABELS[String(n)] ?? n]} contentStyle={{ borderRadius: 12, border: "1px solid #E5E7EB", fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-2 flex-1">
                {statusData.map(s => (
                  <div key={s.status} className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: STATUS_COLORS[s.status] ?? "#9CA3AF" }} />
                    <span className="text-xs text-gray-600 flex-1">{STATUS_LABELS[s.status] ?? s.status}</span>
                    <span className="text-xs font-semibold text-gray-800">{s.count}</span>
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
