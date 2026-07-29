"use client";

import {
  ResponsiveContainer, LineChart, Line, BarChart, Bar,
  XAxis, YAxis, Tooltip, CartesianGrid, PieChart, Pie, Cell, Legend,
} from "recharts";
import { formatCurrency } from "@/lib/utils";
import { DollarSign, ShoppingBag, Clock, Users } from "lucide-react";

type DayPoint = { date: string; value: number };
type PieSlice = { name: string; value: number; color: string };

const TOOLTIP_STYLE = {
  fontSize: 12,
  borderRadius: 12,
  border: "1px solid #e5e7eb",
  boxShadow: "0 4px 16px rgba(0,0,0,0.08)",
  background: "#ffffff",
  color: "#111827",
};

export function OrdersLineChart({ data }: { data: DayPoint[] }) {
  return (
    <ResponsiveContainer width="100%" height={180}>
      <LineChart data={data} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" className="dark:stroke-gray-800" />
        <XAxis dataKey="date" tick={{ fontSize: 10, fill: "#9ca3af" }} tickLine={false} axisLine={false} />
        <YAxis tick={{ fontSize: 10, fill: "#9ca3af" }} tickLine={false} axisLine={false} allowDecimals={false} />
        <Tooltip contentStyle={TOOLTIP_STYLE} labelStyle={{ fontWeight: 600 }} />
        <Line type="monotone" dataKey="value" name="Orders" stroke="var(--brand-client)" strokeWidth={2.5} dot={false} activeDot={{ r: 5, fill: "var(--brand-client)", strokeWidth: 0 }} />
      </LineChart>
    </ResponsiveContainer>
  );
}

export function SignupsBarChart({ data }: { data: DayPoint[] }) {
  return (
    <ResponsiveContainer width="100%" height={180}>
      <BarChart data={data} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" className="dark:stroke-gray-800" />
        <XAxis dataKey="date" tick={{ fontSize: 10, fill: "#9ca3af" }} tickLine={false} axisLine={false} />
        <YAxis tick={{ fontSize: 10, fill: "#9ca3af" }} tickLine={false} axisLine={false} allowDecimals={false} />
        <Tooltip contentStyle={TOOLTIP_STYLE} labelStyle={{ fontWeight: 600 }} />
        <Bar dataKey="value" name="Signups" fill="#10b981" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function UserPieChart({ data }: { data: PieSlice[] }) {
  return (
    <ResponsiveContainer width="100%" height={160}>
      <PieChart>
        <Pie data={data} cx="50%" cy="50%" innerRadius={45} outerRadius={70} paddingAngle={3} dataKey="value">
          {data.map((entry, i) => (
            <Cell key={i} fill={entry.color} />
          ))}
        </Pie>
        <Tooltip contentStyle={TOOLTIP_STYLE} />
      </PieChart>
    </ResponsiveContainer>
  );
}

// ── Platform Monthly GTV & Commission Growth Chart ──
type PlatformRevenuePoint = { month: string; gtv: number; commission: number };
export function PlatformRevenueChart({ data }: { data: PlatformRevenuePoint[] }) {
  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={data} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" className="dark:stroke-gray-800" />
        <XAxis dataKey="month" tick={{ fontSize: 10, fill: "#9ca3af" }} tickLine={false} axisLine={false} />
        <YAxis
          tick={{ fontSize: 10, fill: "#9ca3af" }}
          tickLine={false}
          axisLine={false}
          tickFormatter={(v) => `₹${(v / 100).toFixed(0)}`}
        />
        <Tooltip
          contentStyle={TOOLTIP_STYLE}
          formatter={(v, name) => [
            formatCurrency(Number(v)),
            name === "gtv" ? "GTV" : "Net Commission",
          ]}
        />
        <Legend verticalAlign="top" height={36} iconType="circle" wrapperStyle={{ fontSize: 11 }} />
        <Bar dataKey="gtv" name="gtv" fill="var(--brand-client)" radius={[4, 4, 0, 0]} />
        <Bar dataKey="commission" name="commission" fill="#10B981" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

// ── Platform Active Workload Breakdown Chart ──
type ActiveWorkloadPoint = { status: string; count: number };
const STATUS_COLORS: Record<string, string> = {
  completed:          "#10B981",
  in_progress:        "#3B82F6",
  pending:            "#9CA3AF",
  delivered:          "var(--brand-client)",
  revision_requested: "#F59E0B",
  cancelled:          "#EF4444",
  disputed:           "#F97316",
};
const STATUS_LABELS: Record<string, string> = {
  completed: "Completed", in_progress: "In Progress", pending: "Pending",
  delivered: "Delivered", revision_requested: "Revision", cancelled: "Cancelled", disputed: "Disputed",
};
export function PlatformActiveOrdersChart({ data }: { data: ActiveWorkloadPoint[] }) {
  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={data} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" className="dark:stroke-gray-800" />
        <XAxis
          dataKey="status"
          tick={{ fontSize: 10, fill: "#9ca3af" }}
          tickLine={false}
          axisLine={false}
          tickFormatter={(v) => STATUS_LABELS[v] ?? v}
        />
        <YAxis tick={{ fontSize: 10, fill: "#9ca3af" }} tickLine={false} axisLine={false} allowDecimals={false} />
        <Tooltip
          contentStyle={TOOLTIP_STYLE}
          formatter={(v, name, props) => [v, STATUS_LABELS[props.payload.status] ?? name]}
        />
        <Bar dataKey="count" fill="#3B82F6" radius={[6, 6, 0, 0]}>
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={STATUS_COLORS[entry.status] ?? "#3B82F6"} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

// ── Platform Niche Response Times Comparison ──
type NicheResponsePoint = { niche: string; avg_response: number };
export function PlatformNicheResponseChart({ data }: { data: NicheResponsePoint[] }) {
  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={data} layout="vertical" margin={{ top: 10, right: 20, left: 10, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" className="dark:stroke-gray-800" />
        <XAxis type="number" tick={{ fontSize: 10, fill: "#9ca3af" }} tickLine={false} axisLine={false} />
        <YAxis dataKey="niche" type="category" tick={{ fontSize: 10, fill: "#9ca3af" }} tickLine={false} axisLine={false} width={80} />
        <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v) => [`${v}m`, "Avg Response Time"]} />
        <Bar dataKey="avg_response" name="avg_response" fill="#8B5CF6" radius={[0, 4, 4, 0]} barSize={16}>
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={index % 2 === 0 ? "#8B5CF6" : "#A78BFA"} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

// ── Platform Client Repeat Rates ──
type RepeatRatePoint = { client_type: string; client_count: number };
const REPEAT_COLORS = ["var(--brand-client)", "#F59E0B"];
export function PlatformClientRepeatChart({ data }: { data: RepeatRatePoint[] }) {
  const hasRepeat = data.some(d => d.client_count > 0);
  if (!hasRepeat) {
    return <div className="h-[200px] flex items-center justify-center text-xs text-gray-400">No repeat data.</div>;
  }
  return (
    <div className="flex items-center justify-between h-[200px]">
      <ResponsiveContainer width="50%" height="100%">
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={40}
            outerRadius={60}
            paddingAngle={3}
            dataKey="client_count"
            nameKey="client_type"
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={REPEAT_COLORS[index % REPEAT_COLORS.length]} />
            ))}
          </Pie>
          <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v) => [v, "Clients"]} />
        </PieChart>
      </ResponsiveContainer>
      <div className="w-[45%] flex flex-col gap-3">
        {data.map((item, idx) => (
          <div key={item.client_type} className="flex items-center gap-2">
            <span
              className="w-2.5 h-2.5 rounded-full shrink-0"
              style={{ background: REPEAT_COLORS[idx % REPEAT_COLORS.length] }}
            />
            <div className="min-w-0">
              <p className="text-[11px] font-bold text-gray-900 dark:text-white truncate">
                {item.client_type}
              </p>
              <p className="text-[10px] text-gray-400">
                {item.client_count} client{item.client_count !== 1 ? "s" : ""}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
