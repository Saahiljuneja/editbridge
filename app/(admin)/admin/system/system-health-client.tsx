"use client";

import { useEffect, useState } from "react";
import { Activity, RefreshCw } from "lucide-react";

export function SystemHealthClient({ totalUsers, activeOrders }: { totalUsers: number; activeOrders: number }) {
  const [lastRefresh, setLastRefresh] = useState(new Date());
  const [ticking, setTicking] = useState(false);

  useEffect(() => {
    const t = setInterval(() => setLastRefresh(new Date()), 30_000);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="rounded-2xl border border-gray-100 bg-white shadow-sm p-5 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center">
          <Activity className="w-4 h-4 text-gray-500" />
        </div>
        <div>
          <p className="text-sm font-semibold text-gray-900">Live counters</p>
          <p className="text-xs text-gray-400">
            {totalUsers.toLocaleString()} total users · {activeOrders} active orders ·
            Last refreshed {lastRefresh.toLocaleTimeString()}
          </p>
        </div>
      </div>
      <button
        onClick={() => { setTicking(true); window.location.reload(); }}
        disabled={ticking}
        className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 border border-gray-200 px-3 py-1.5 rounded-lg hover:border-gray-300 transition-colors disabled:opacity-40"
      >
        <RefreshCw className={`w-3.5 h-3.5 ${ticking ? "animate-spin" : ""}`} />
        Refresh
      </button>
    </div>
  );
}
