"use client";

import { useEffect, useState } from "react";
import { Clock, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

function compute(deadline: string) {
  const diff = new Date(deadline).getTime() - Date.now();
  if (diff <= 0) return { label: "Overdue", urgent: true, overdue: true };
  const totalMins = Math.floor(diff / 60000);
  const days = Math.floor(totalMins / 1440);
  const hrs = Math.floor((totalMins % 1440) / 60);
  const mins = totalMins % 60;
  const urgent = diff < 24 * 60 * 60 * 1000; // under 24h
  if (days > 0) return { label: `${days}d ${hrs}h left`, urgent: days === 0 && hrs < 6, overdue: false };
  if (hrs > 0) return { label: `${hrs}h ${mins}m left`, urgent: true, overdue: false };
  return { label: `${mins}m left`, urgent: true, overdue: false };
}

export function DeadlineCountdown({ deadline }: { deadline: string }) {
  const [state, setState] = useState(() => compute(deadline));

  useEffect(() => {
    const id = setInterval(() => setState(compute(deadline)), 60000);
    return () => clearInterval(id);
  }, [deadline]);

  return (
    <span className={cn(
      "inline-flex items-center gap-1 text-xs font-medium",
      state.overdue ? "text-red-600" : state.urgent ? "text-amber-600" : "text-gray-400"
    )}>
      {state.overdue
        ? <AlertTriangle className="w-3 h-3" />
        : <Clock className="w-3 h-3" />}
      {state.label}
    </span>
  );
}
