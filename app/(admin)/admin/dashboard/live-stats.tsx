"use client";

import { useEffect, useState } from "react";
import { Activity, Users, ShoppingBag, FileCheck, AlertTriangle } from "lucide-react";

interface LiveData {
  activeOrders: number;
  todaySignups: number;
  pendingKyc: number;
  openDisputes: number;
}

const STATS_CONFIG = [
  {
    key: "activeOrders" as const,
    label: "Active Orders",
    sub: "In progress now",
    icon: ShoppingBag,
    bg: "bg-blue-600",
    ring: "ring-blue-500/20",
  },
  {
    key: "todaySignups" as const,
    label: "Today's Signups",
    sub: "New registrations",
    icon: Users,
    bg: "bg-violet-600",
    ring: "ring-violet-500/20",
  },
  {
    key: "pendingKyc" as const,
    label: "Pending KYC",
    sub: "Awaiting review",
    icon: FileCheck,
    bg: "bg-amber-500",
    ring: "ring-amber-500/20",
    urgent: true,
  },
  {
    key: "openDisputes" as const,
    label: "Open Disputes",
    sub: "Needs resolution",
    icon: AlertTriangle,
    bg: "bg-red-600",
    ring: "ring-red-500/20",
    urgent: true,
  },
];

export function LiveStats({ initial }: { initial: LiveData }) {
  const [data, setData] = useState(initial);
  const [lastUpdatedStr, setLastUpdatedStr] = useState("");
  const [pulse, setPulse] = useState(false);

  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const res = await fetch("/api/admin/counts");
        if (res.ok) {
          const d = await res.json();
          setData(prev => ({
            activeOrders: d.activeOrders ?? prev.activeOrders,
            todaySignups: d.todaySignups ?? prev.todaySignups,
            pendingKyc: d.pendingKyc ?? prev.pendingKyc,
            openDisputes: d.openDisputes ?? prev.openDisputes,
          }));
          setLastUpdatedStr(new Date().toLocaleTimeString());
          setPulse(true);
          setTimeout(() => setPulse(false), 600);
        }
      } catch {}
    }, 30_000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="rounded-2xl bg-gray-950 p-5 shadow-lg">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            <span className={`absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75 ${pulse ? "animate-ping" : "animate-pulse"}`} />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
          </span>
          <p className="text-sm font-semibold text-white">Live Platform Stats</p>
        </div>
        <p className="text-xs text-gray-500">
          Refreshes every 30s{lastUpdatedStr ? ` · ${lastUpdatedStr}` : ""}
        </p>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {STATS_CONFIG.map(({ key, label, sub, icon: Icon, bg, ring, urgent }) => {
          const val = data[key];
          const isAlert = urgent && val > 0;
          return (
            <div
              key={key}
              className={`rounded-xl p-4 ring-1 transition-all duration-300 ${
                isAlert
                  ? `${bg} ring-white/10`
                  : "bg-gray-900 ring-white/5"
              }`}
            >
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center mb-3 ${
                isAlert ? "bg-white/20" : `${bg} bg-opacity-20`
              }`}>
                <Icon className={`w-4 h-4 ${isAlert ? "text-white" : "text-white/70"}`} strokeWidth={1.8} />
              </div>
              <p className={`text-3xl font-black tabular-nums transition-all duration-300 ${isAlert ? "text-white" : "text-white"}`}>
                {val}
              </p>
              <p className={`text-xs font-semibold mt-1 ${isAlert ? "text-white/90" : "text-gray-400"}`}>{label}</p>
              <p className={`text-[11px] mt-0.5 ${isAlert ? "text-white/60" : "text-gray-600"}`}>{sub}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
