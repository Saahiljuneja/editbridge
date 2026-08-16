"use client";

import { useState, useEffect } from "react";
import { Clock } from "lucide-react";
import { usePathname } from "next/navigation";

export function QuoteCountdown({ expiresAt }: { expiresAt: Date | string }) {
  const pathname = usePathname();
  const isClient = pathname?.startsWith("/client");
  const [remaining, setRemaining] = useState<string | null>(null);
  const [isUrgent, setIsUrgent] = useState(false);

  useEffect(() => {
    function compute() {
      const ms = new Date(expiresAt).getTime() - Date.now();
      if (ms <= 0) {
        setRemaining("Expired");
        return;
      }
      const totalMins = Math.floor(ms / 60_000);
      const days = Math.floor(totalMins / 1440);
      const hrs = Math.floor((totalMins % 1440) / 60);
      const mins = totalMins % 60;

      setIsUrgent(totalMins < 60);

      if (days > 0) setRemaining(`${days}d ${hrs}h left`);
      else if (hrs > 0) setRemaining(`${hrs}h ${mins}m left`);
      else setRemaining(`${mins}m left`);
    }

    compute();
    const id = setInterval(compute, 60_000);
    return () => clearInterval(id);
  }, [expiresAt]);

  if (!remaining) return null;

  return (
    <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${
      remaining === "Expired"
        ? "bg-gray-100 text-gray-400"
        : isUrgent
          ? "bg-red-50 text-red-600 animate-pulse"
          : isClient
            ? "bg-blue-50 text-brand-primary"
            : "bg-violet-50 text-violet-600"
    }`}>
      <Clock className="w-3 h-3" />
      {remaining}
    </span>
  );
}
