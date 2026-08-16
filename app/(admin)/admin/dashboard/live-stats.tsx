"use client";

import { useEffect, useRef, useState } from "react";
import { Activity, Users, ShoppingBag, FileCheck, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

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
    <div className="rounded-3xl bg-white border border-gray-150 p-5 shadow-xl shadow-gray-100/5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            <span className={`absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-75 ${pulse ? "animate-ping" : "animate-pulse"}`} />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
          </span>
          <p className="text-xs font-extrabold text-neutral-900 uppercase tracking-wider">Live Platform Stats</p>
        </div>
        <p className="text-[10px] text-neutral-455 font-bold uppercase tracking-wider">
          Refreshes every 30s{lastUpdatedStr ? ` · ${lastUpdatedStr}` : ""}
        </p>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {STATS_CONFIG.map(({ key, label, sub, icon: Icon, bg, ring, urgent }) => {
          const val = data[key];
          const isAlert = urgent && val > 0;
          
          const textValCls = isAlert 
            ? "text-neutral-950 font-black" 
            : "text-neutral-900 font-black";

          const subtextCls = isAlert 
            ? "text-neutral-600 font-medium" 
            : "text-neutral-400 font-semibold";

          const detailCls = isAlert 
            ? "text-neutral-500" 
            : "text-neutral-450";

          const alertColorMap: Record<string, string> = {
            "bg-amber-500": "border-amber-200/60 bg-amber-50/60 text-amber-850",
            "bg-red-600": "border-red-200/60 bg-red-50/60 text-red-850",
          };
          
          const computedCardStyle = isAlert
            ? alertColorMap[bg] ?? "border-gray-200 bg-gray-50"
            : "border-gray-150 bg-gray-50/50 text-neutral-800";

          return (
            <div
              key={key}
              className={cn(
                "rounded-2xl p-4 transition-all duration-300 border shadow-[inset_0_1px_2px_rgba(0,0,0,0.015)]",
                computedCardStyle
              )}
            >
              <div className={cn(
                "w-8 h-8 rounded-lg flex items-center justify-center mb-3 shadow-inner",
                isAlert ? "bg-white/80 border border-white" : `${bg} bg-opacity-10`
              )}>
                <Icon className={cn("w-4 h-4", isAlert ? "text-neutral-900" : "text-neutral-600")} strokeWidth={1.8} />
              </div>
              <p className={cn("text-3xl font-black tabular-nums tracking-tight", textValCls)}>
                {val}
              </p>
              <p className={cn("text-xs font-bold mt-1", subtextCls)}>{label}</p>
              <p className={cn("text-[10px] mt-0.5", detailCls)}>{sub}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
