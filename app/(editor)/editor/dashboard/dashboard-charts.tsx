"use client";

import {
  ResponsiveContainer, LineChart, Line, BarChart, Bar,
  XAxis, YAxis, Tooltip, CartesianGrid, PieChart, Pie, Cell,
} from "recharts";
import { formatCurrency } from "@/lib/utils";
import { TrendingUp, ShoppingBag, Clock, Users } from "lucide-react";
import nextDynamic from "next/dynamic";

type DayPoint    = { month: string; earnings: number };
type ActivePoint = { status: string; count: number };
type ResponsePoint = { name: string; value: number };
type RepeatPoint = { client_type: string; client_count: number };

const TOOLTIP_STYLE = {
  fontSize: 12,
  borderRadius: 12,
  border: "1px solid #e5e7eb",
  boxShadow: "0 4px 16px rgba(0,0,0,0.08)",
  background: "#ffffff",
  color: "#111827",
};

const STATUS_COLORS: Record<string, string> = {
  completed:          "#10B981",
  in_progress:        "#1e40af",
  pending:            "#9CA3AF",
  delivered:          "#1e40af",
  revision_requested: "#F59E0B",
  cancelled:          "#EF4444",
  disputed:           "#F97316",
};

const STATUS_LABELS: Record<string, string> = {
  completed: "Completed", in_progress: "In Progress", pending: "Pending",
  delivered: "Delivered", revision_requested: "Revision", cancelled: "Cancelled", disputed: "Disputed",
};

const REPEAT_COLORS = ["#1e40af", "#8B5CF6", "#F59E0B"];

function EditorDashboardChartsInner({
  earningsData,
  activeOrderData,
  responseTimeData,
  clientRepeatData,
}: {
  earningsData: DayPoint[];
  activeOrderData: ActivePoint[];
  responseTimeData: ResponsePoint[];
  clientRepeatData: RepeatPoint[];
}) {
  const hasEarnings     = earningsData.length > 0;
  const hasActiveOrders = activeOrderData.length > 0;
  const hasRepeat       = clientRepeatData.some(d => d.client_count > 0);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-2">
      {/* Earnings Growth */}
      <div className="bg-white border border-neutral-200/60 rounded-3xl p-5 shadow-[0_8px_30px_rgba(0,0,0,0.015)] transition-all duration-300 hover:shadow-[0_12px_30px_rgba(0,0,0,0.025)] hover:border-neutral-300">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-7 h-7 rounded-lg bg-emerald-50 flex items-center justify-center shadow-sm">
            <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
          </div>
          <p className="font-bold text-xs uppercase tracking-wider text-neutral-800">Earnings Growth</p>
        </div>
        {!hasEarnings ? (
          <div className="h-[180px] flex items-center justify-center text-xs text-neutral-400">
            No completed earnings yet.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={earningsData} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
              <XAxis dataKey="month" tick={{ fontSize: 10, fill: "#9ca3af" }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 10, fill: "#9ca3af" }} tickLine={false} axisLine={false}
                tickFormatter={(v) => `₹${(v / 100).toFixed(0)}`} />
              <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v) => [formatCurrency(Number(v)), "Earnings"]} />
              <Line type="monotone" dataKey="earnings" stroke="#10B981" strokeWidth={3}
                dot={{ r: 4, fill: "#10B981", strokeWidth: 0 }}
                activeDot={{ r: 6, fill: "#10B981", strokeWidth: 0 }} />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Active Workload */}
      <div className="bg-white border border-neutral-200/60 rounded-3xl p-5 shadow-[0_8px_30px_rgba(0,0,0,0.015)] transition-all duration-300 hover:shadow-[0_12px_30px_rgba(0,0,0,0.025)] hover:border-neutral-300">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-7 h-7 rounded-lg bg-blue-50 flex items-center justify-center shadow-sm">
            <ShoppingBag className="w-3.5 h-3.5 text-brand-primary" />
          </div>
          <p className="font-bold text-xs uppercase tracking-wider text-neutral-800">Active Workload</p>
        </div>
        {!hasActiveOrders ? (
          <div className="h-[180px] flex items-center justify-center text-xs text-neutral-400">
            No active orders right now.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={activeOrderData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
              <XAxis dataKey="status" tick={{ fontSize: 10, fill: "#9ca3af" }} tickLine={false} axisLine={false}
                tickFormatter={(v) => STATUS_LABELS[v] ?? v} />
              <YAxis tick={{ fontSize: 10, fill: "#9ca3af" }} tickLine={false} axisLine={false} allowDecimals={false} />
              <Tooltip contentStyle={TOOLTIP_STYLE}
                formatter={(v, name, props) => [v, STATUS_LABELS[props.payload.status] ?? name]} />
              <Bar dataKey="count" fill="#1e40af" radius={[6, 6, 0, 0]}>
                {activeOrderData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={STATUS_COLORS[entry.status] ?? "#1e40af"} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Response Time */}
      <div className="bg-white border border-neutral-200/60 rounded-3xl p-5 shadow-[0_8px_30px_rgba(0,0,0,0.015)] transition-all duration-300 hover:shadow-[0_12px_30px_rgba(0,0,0,0.025)] hover:border-neutral-300">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-7 h-7 rounded-lg bg-blue-50 flex items-center justify-center shadow-sm">
            <Clock className="w-3.5 h-3.5 text-brand-primary" />
          </div>
          <p className="font-bold text-xs uppercase tracking-wider text-neutral-800">Response Time (Minutes)</p>
        </div>
        <ResponsiveContainer width="100%" height={180}>
          <BarChart data={responseTimeData} layout="vertical" margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
            <XAxis type="number" tick={{ fontSize: 10, fill: "#9ca3af" }} tickLine={false} axisLine={false} />
            <YAxis dataKey="name" type="category" tick={{ fontSize: 10, fill: "#9ca3af" }} tickLine={false} axisLine={false} />
            <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v) => [`${v}m`, "Response Time"]} />
            <Bar dataKey="value" fill="#8B5CF6" radius={[0, 6, 6, 0]} barSize={24}>
              <Cell fill="#8B5CF6" />
              <Cell fill="#C084FC" />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Client Retention */}
      <div className="bg-white border border-neutral-200/60 rounded-3xl p-5 shadow-[0_8px_30px_rgba(0,0,0,0.015)] transition-all duration-300 hover:shadow-[0_12px_30px_rgba(0,0,0,0.025)] hover:border-neutral-300">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-7 h-7 rounded-lg bg-blue-50 flex items-center justify-center shadow-sm">
            <Users className="w-3.5 h-3.5 text-brand-primary" />
          </div>
          <p className="font-bold text-xs uppercase tracking-wider text-neutral-800">Client Retention</p>
        </div>
        {!hasRepeat ? (
          <div className="h-[180px] flex items-center justify-center text-xs text-gray-400">
            No client retention history.
          </div>
        ) : (
          <div className="flex items-center justify-between h-[180px]">
            <ResponsiveContainer width="60%" height="100%">
              <PieChart>
                <Pie data={clientRepeatData} cx="50%" cy="50%"
                  innerRadius={38} outerRadius={58} paddingAngle={4}
                  dataKey="client_count" nameKey="client_type">
                  {clientRepeatData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={REPEAT_COLORS[index % REPEAT_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v) => [v, "Clients"]} />
              </PieChart>
            </ResponsiveContainer>
            <div className="w-[40%] flex flex-col gap-3">
              {clientRepeatData.map((item, idx) => (
                <div key={item.client_type} className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full shrink-0 shadow-sm"
                    style={{ background: REPEAT_COLORS[idx % REPEAT_COLORS.length] }} />
                  <div className="min-w-0">
                    <p className="text-[11px] font-black text-neutral-800 truncate leading-none mb-0.5">{item.client_type}</p>
                    <p className="text-[10px] text-neutral-450 font-bold">{item.client_count} client{item.client_count !== 1 ? "s" : ""}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export const EditorDashboardCharts = nextDynamic(
  async () => EditorDashboardChartsInner,
  {
    ssr: false,
    loading: () => (
      <div className="h-[300px] w-full bg-white border border-gray-100 rounded-2xl animate-pulse flex items-center justify-center">
        <span className="text-xs text-gray-400">Loading metrics...</span>
      </div>
    )
  }
);
