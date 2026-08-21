"use client";

import { useState } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { RefreshCw, ShieldCheck, ShieldAlert, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

interface HealthScoreCardProps {
  editorId: string;
  healthScore: number | null;
  healthStatus: string | null;
  healthComputedAt: Date | null;
}

const STATUS_CFG: Record<string, { label: string; color: string; bar: string }> = {
  excellent:       { label: "Excellent",       color: "text-emerald-700", bar: "bg-emerald-500" },
  good:            { label: "Good",            color: "text-emerald-700", bar: "bg-emerald-500" },
  needs_attention: { label: "Needs Attention", color: "text-amber-700",   bar: "bg-amber-500"   },
  at_risk:         { label: "At Risk",         color: "text-orange-700",  bar: "bg-orange-500"  },
  critical:        { label: "Critical",        color: "text-red-700",     bar: "bg-red-500"     },
};

export function HealthScoreCard({ editorId, healthScore, healthStatus, healthComputedAt }: HealthScoreCardProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function recalculate() {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/editors/${editorId}/health/recalculate`, { method: "POST" });
      if (!res.ok) throw new Error();
      toast.success("Health score recalculated.");
      router.refresh();
    } catch {
      toast.error("Failed to recalculate health.");
    } finally {
      setLoading(false);
    }
  }

  const cfg = healthStatus ? STATUS_CFG[healthStatus] ?? STATUS_CFG.good : null;
  const Icon = healthStatus === "critical" || healthStatus === "at_risk" ? ShieldAlert : ShieldCheck;

  return (
    <div className="rounded-xl border border-border bg-white p-4 space-y-3">
      <div className="flex items-center justify-between">
        <p className="font-semibold text-sm text-gray-900 flex items-center gap-1.5">
          {cfg ? <Icon className={cn("w-4 h-4", cfg.color)} /> : <ShieldCheck className="w-4 h-4 text-gray-400" />}
          Account Health
        </p>
        <button
          onClick={recalculate}
          disabled={loading}
          className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 hover:text-gray-800 disabled:opacity-40 transition-colors"
        >
          <RefreshCw className={cn("w-3.5 h-3.5", loading && "animate-spin")} />
          Recalculate
        </button>
      </div>

      {cfg && healthScore !== null ? (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className={cn("text-2xl font-black tabular-nums", cfg.color)}>{healthScore}</span>
            <span className={cn("text-sm font-bold", cfg.color)}>{cfg.label}</span>
          </div>
          <div className="w-full h-2 rounded-full bg-gray-100 overflow-hidden">
            <div className={cn("h-full rounded-full", cfg.bar)} style={{ width: `${healthScore}%` }} />
          </div>
          {healthComputedAt && (
            <p className="text-[10px] text-gray-400">
              Computed {new Date(healthComputedAt).toLocaleString("en-IN", { dateStyle: "short", timeStyle: "short" })}
            </p>
          )}
        </div>
      ) : (
        <p className="text-sm text-gray-400">Not yet computed. Click recalculate to generate.</p>
      )}
    </div>
  );
}
