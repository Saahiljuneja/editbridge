"use client";

import {
  ResponsiveContainer, AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, Tooltip, CartesianGrid, PieChart, Pie, Cell, Legend,
} from "recharts";
import { formatCurrency } from "@/lib/utils";

type DayPoint = { date: string; value: number };
type PieSlice = { name: string; value: number; color: string };

function CustomTooltip({ active, payload, label, formatter }: any) {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white dark:bg-gray-900 border border-gray-150 dark:border-gray-800 rounded-2xl px-4 py-3 shadow-[0_8px_30px_rgba(0,0,0,0.04)] text-xs text-gray-900 dark:text-gray-100">
        {label && <p className="font-extrabold mb-1.5 uppercase tracking-wider text-[10px] text-gray-400 dark:text-gray-500">{label}</p>}
        <div className="space-y-1 font-bold">
          {payload.map((item: any, i: number) => {
            const val = formatter ? formatter(item.value, item.name, item) : item.value;
            const displayVal = Array.isArray(val) ? val[0] : val;
            const displayName = Array.isArray(val) ? val[1] : item.name;
            return (
              <div key={i} className="flex items-center gap-4 justify-between">
                <span className="flex items-center gap-1.5 text-gray-500 dark:text-gray-400">
                  <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: item.color || item.fill }} />
                  {displayName}
                </span>
                <span className="tabular-nums text-gray-950 dark:text-white">{displayVal}</span>
              </div>
            );
          })}
        </div>
      </div>
    );
  }
  return null;
}

export function OrdersLineChart({ data }: { data: DayPoint[] }) {
  return (
    <ResponsiveContainer width="100%" height={180}>
      <AreaChart data={data} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
        <defs>
          <linearGradient id="orderGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="var(--brand-client)" stopOpacity={0.2}/>
            <stop offset="95%" stopColor="var(--brand-client)" stopOpacity={0}/>
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" className="stroke-gray-100 dark:stroke-gray-800" />
        <XAxis dataKey="date" tick={{ fontSize: 10, fill: "#9ca3af" }} tickLine={false} axisLine={false} />
        <YAxis tick={{ fontSize: 10, fill: "#9ca3af" }} tickLine={false} axisLine={false} allowDecimals={false} />
        <Tooltip content={<CustomTooltip />} />
        <Area type="monotone" dataKey="value" name="Orders" stroke="var(--brand-client)" strokeWidth={2.5} fillOpacity={1} fill="url(#orderGrad)" activeDot={{ r: 5, fill: "var(--brand-client)", strokeWidth: 0 }} />
      </AreaChart>
    </ResponsiveContainer>
  );
}

export function SignupsBarChart({ data }: { data: DayPoint[] }) {
  return (
    <ResponsiveContainer width="100%" height={180}>
      <BarChart data={data} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
        <defs>
          <linearGradient id="signupGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#10b981" stopOpacity={0.9}/>
            <stop offset="95%" stopColor="#10b981" stopOpacity={0.3}/>
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" className="stroke-gray-100 dark:stroke-gray-800" />
        <XAxis dataKey="date" tick={{ fontSize: 10, fill: "#9ca3af" }} tickLine={false} axisLine={false} />
        <YAxis tick={{ fontSize: 10, fill: "#9ca3af" }} tickLine={false} axisLine={false} allowDecimals={false} />
        <Tooltip content={<CustomTooltip />} />
        <Bar dataKey="value" name="Signups" fill="url(#signupGrad)" radius={[4, 4, 0, 0]} />
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
        <Tooltip content={<CustomTooltip />} />
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
        <defs>
          <linearGradient id="gtvGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="var(--brand-client)" stopOpacity={0.9}/>
            <stop offset="95%" stopColor="var(--brand-client)" stopOpacity={0.3}/>
          </linearGradient>
          <linearGradient id="commGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#10B981" stopOpacity={0.9}/>
            <stop offset="95%" stopColor="#10B981" stopOpacity={0.3}/>
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" className="stroke-gray-100 dark:stroke-gray-800" />
        <XAxis dataKey="month" tick={{ fontSize: 10, fill: "#9ca3af" }} tickLine={false} axisLine={false} />
        <YAxis
          tick={{ fontSize: 10, fill: "#9ca3af" }}
          tickLine={false}
          axisLine={false}
          tickFormatter={(v) => `₹${(v / 100).toFixed(0)}`}
        />
        <Tooltip
          content={
            <CustomTooltip
              formatter={(v: any, name: any) => [
                formatCurrency(Number(v)),
                name === "gtv" ? "GTV" : "Net Commission",
              ]}
            />
          }
        />
        <Legend verticalAlign="top" height={36} iconType="circle" wrapperStyle={{ fontSize: 11 }} />
        <Bar dataKey="gtv" name="gtv" fill="url(#gtvGrad)" radius={[4, 4, 0, 0]} />
        <Bar dataKey="commission" name="commission" fill="url(#commGrad)" radius={[4, 4, 0, 0]} />
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
        <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" className="stroke-gray-100 dark:stroke-gray-800" />
        <XAxis
          dataKey="status"
          tick={{ fontSize: 10, fill: "#9ca3af" }}
          tickLine={false}
          axisLine={false}
          tickFormatter={(v) => STATUS_LABELS[v] ?? v}
        />
        <YAxis tick={{ fontSize: 10, fill: "#9ca3af" }} tickLine={false} axisLine={false} allowDecimals={false} />
        <Tooltip
          content={
            <CustomTooltip
              formatter={(v: any, name: any, props: any) => [v, STATUS_LABELS[props.payload.status] ?? name]}
            />
          }
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
        <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" className="stroke-gray-100 dark:stroke-gray-800" />
        <XAxis type="number" tick={{ fontSize: 10, fill: "#9ca3af" }} tickLine={false} axisLine={false} />
        <YAxis dataKey="niche" type="category" tick={{ fontSize: 10, fill: "#9ca3af" }} tickLine={false} axisLine={false} width={80} />
        <Tooltip content={<CustomTooltip formatter={(v: any) => [`${v}m`, "Avg Response Time"]} />} />
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
          <Tooltip content={<CustomTooltip />} />
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
