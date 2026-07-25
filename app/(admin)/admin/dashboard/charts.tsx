"use client";

import {
  ResponsiveContainer, LineChart, Line, BarChart, Bar,
  XAxis, YAxis, Tooltip, CartesianGrid, PieChart, Pie, Cell,
} from "recharts";
import { useAdminTheme } from "@/components/admin/admin-theme-provider";

type DayPoint = { date: string; value: number };

const TOOLTIP_LIGHT = {
  fontSize: 12, borderRadius: 10, border: "1px solid #e5e7eb",
  boxShadow: "0 4px 16px rgba(0,0,0,0.08)", background: "#fff", color: "#111827",
};
const TOOLTIP_DARK = {
  fontSize: 12, borderRadius: 10, border: "1px solid rgba(255,255,255,0.08)",
  boxShadow: "0 4px 24px rgba(0,0,0,0.5)", background: "#111827", color: "#f9fafb",
};

export function OrdersLineChart({ data }: { data: DayPoint[] }) {
  const { theme } = useAdminTheme();
  const dark = theme === "dark";
  const grid = dark ? "#1f2937" : "#f3f4f6";
  const tick = dark ? "#4b5563" : "#9ca3af";
  return (
    <ResponsiveContainer width="100%" height={180}>
      <LineChart data={data} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={grid} />
        <XAxis dataKey="date" tick={{ fontSize: 10, fill: tick }} tickLine={false} axisLine={false} />
        <YAxis tick={{ fontSize: 10, fill: tick }} tickLine={false} axisLine={false} allowDecimals={false} />
        <Tooltip contentStyle={dark ? TOOLTIP_DARK : TOOLTIP_LIGHT} labelStyle={{ fontWeight: 600 }} />
        <Line type="monotone" dataKey="value" name="Orders" stroke="#0EA5E9" strokeWidth={2.5} dot={false} activeDot={{ r: 5, fill: "#0EA5E9", strokeWidth: 0 }} />
      </LineChart>
    </ResponsiveContainer>
  );
}

export function SignupsBarChart({ data }: { data: DayPoint[] }) {
  const { theme } = useAdminTheme();
  const dark = theme === "dark";
  const grid = dark ? "#1f2937" : "#f3f4f6";
  const tick = dark ? "#4b5563" : "#9ca3af";
  return (
    <ResponsiveContainer width="100%" height={180}>
      <BarChart data={data} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={grid} />
        <XAxis dataKey="date" tick={{ fontSize: 10, fill: tick }} tickLine={false} axisLine={false} />
        <YAxis tick={{ fontSize: 10, fill: tick }} tickLine={false} axisLine={false} allowDecimals={false} />
        <Tooltip contentStyle={dark ? TOOLTIP_DARK : TOOLTIP_LIGHT} labelStyle={{ fontWeight: 600 }} />
        <Bar dataKey="value" name="Signups" fill="#10b981" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

type PieSlice = { name: string; value: number; color: string };

export function UserPieChart({ data }: { data: PieSlice[] }) {
  const { theme } = useAdminTheme();
  const dark = theme === "dark";
  return (
    <ResponsiveContainer width="100%" height={160}>
      <PieChart>
        <Pie data={data} cx="50%" cy="50%" innerRadius={45} outerRadius={70} paddingAngle={3} dataKey="value">
          {data.map((entry, i) => (
            <Cell key={i} fill={entry.color} />
          ))}
        </Pie>
        <Tooltip contentStyle={dark ? TOOLTIP_DARK : TOOLTIP_LIGHT} />
      </PieChart>
    </ResponsiveContainer>
  );
}
