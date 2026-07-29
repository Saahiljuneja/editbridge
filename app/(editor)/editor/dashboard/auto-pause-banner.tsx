"use client";

import { useState } from "react";
import { PauseCircle, X, Loader2 } from "lucide-react";
import { toast } from "sonner";

export function AutoPauseBanner({ activeCount }: { activeCount: number }) {
  const [visible, setVisible] = useState(true);
  const [pausing, setPausing] = useState(false);
  const [paused, setPaused] = useState(false);

  if (!visible || paused) return null;

  async function handlePause() {
    setPausing(true);
    try {
      const res = await fetch("/api/users/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isAvailable: false }),
      });
      if (!res.ok) { toast.error("Failed to pause availability."); return; }
      setPaused(true);
      toast.success("Availability paused — you won't receive new orders until you turn it back on.");
    } catch {
      toast.error("Something went wrong.");
    } finally {
      setPausing(false);
    }
  }

  return (
    <div className="bg-amber-50 border border-amber-200 rounded-2xl px-5 py-4 flex items-start gap-4">
      <div className="w-9 h-9 rounded-xl bg-amber-100 flex items-center justify-center shrink-0">
        <PauseCircle className="w-4 h-4 text-amber-600" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-amber-900">
          You have {activeCount} active orders
        </p>
        <p className="text-xs text-amber-700 mt-0.5 leading-relaxed">
          Taking on more work could affect your delivery quality and response time.
          Consider pausing your availability until you have capacity.
        </p>
        <button
          onClick={handlePause}
          disabled={pausing}
          className="mt-3 inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold transition-colors disabled:opacity-60"
        >
          {pausing ? (
            <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Pausing…</>
          ) : (
            <><PauseCircle className="w-3.5 h-3.5" /> Pause availability</>
          )}
        </button>
      </div>
      <button
        onClick={() => setVisible(false)}
        className="w-7 h-7 rounded-lg hover:bg-amber-100 flex items-center justify-center text-amber-400 hover:text-amber-600 shrink-0 transition-colors"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}
