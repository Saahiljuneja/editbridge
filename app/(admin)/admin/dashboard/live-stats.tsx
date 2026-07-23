"use client";

import { useEffect, useState } from "react";
import { Activity, Users, ShoppingBag } from "lucide-react";

interface LiveData {
  activeOrders: number;
  todaySignups: number;
  pendingKyc: number;
  openDisputes: number;
}

export function LiveStats({ initial }: { initial: LiveData }) {
  const [data, setData] = useState(initial);
  const [lastUpdated, setLastUpdated] = useState(new Date());
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
          const now = new Date();
          setLastUpdated(now);
          setLastUpdatedStr(now.toLocaleTimeString());
          setPulse(true);
          setTimeout(() => setPulse(false), 600);
        }
      } catch {}
    }, 30_000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="rounded-2xl border border-gray-100 bg-white shadow-sm p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full bg-emerald-400 ${pulse ? "animate-ping" : "animate-pulse"}`} />
          <p className="text-sm font-semibold text-gray-900">Live Platform Stats</p>
        </div>
        <p className="text-xs text-gray-400">Updates every 30s{lastUpdatedStr ? ` · Last: ${lastUpdatedStr}` : ""}</p>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: "Active orders", value: data.activeOrders, icon: ShoppingBag, color: "text-blue-600" },
          { label: "Today's signups", value: data.todaySignups, icon: Users, color: "text-violet-600" },
          { label: "Pending KYC", value: data.pendingKyc, icon: Activity, color: "text-amber-600" },
          { label: "Open disputes", value: data.openDisputes, icon: Activity, color: "text-red-600" },
        ].map(item => (
          <div key={item.label} className="text-center">
            <p className={`text-3xl font-bold tabular-nums ${item.color} transition-all duration-300`}>{item.value}</p>
            <p className="text-xs text-gray-400 mt-1">{item.label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
