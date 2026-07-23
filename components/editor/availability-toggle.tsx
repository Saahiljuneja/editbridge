"use client";

import { useState } from "react";
import { Zap, Moon, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface AvailabilityToggleProps {
  initial: boolean;
  kycApproved: boolean;
}

export function AvailabilityToggle({ initial, kycApproved }: AvailabilityToggleProps) {
  const [isAvailable, setIsAvailable] = useState(initial);
  const [saving, setSaving] = useState(false);

  async function toggle() {
    if (!kycApproved || saving) return;
    const next = !isAvailable;
    setSaving(true);
    try {
      const res = await fetch("/api/editor/availability", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isAvailable: next }),
      });
      if (res.ok) {
        setIsAvailable(next);
        toast.success(next ? "You're now available for new orders." : "New orders paused.");
      } else {
        toast.error("Failed to update availability.");
      }
    } catch {
      toast.error("Something went wrong.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-50 flex items-center gap-2">
        {isAvailable
          ? <Zap className="w-4 h-4 text-[#0EA5E9]" />
          : <Moon className="w-4 h-4 text-gray-400" />}
        <span className="font-semibold text-gray-900 text-sm">Availability</span>
      </div>

      <div className="p-5">
        <div className={cn(
          "flex items-center justify-between rounded-xl border px-4 py-3 transition-colors",
          isAvailable ? "border-[#0EA5E9]/20 bg-[#0EA5E9]/5" : "border-gray-200 bg-gray-50"
        )}>
          <div>
            <p className={cn("text-sm font-semibold", isAvailable ? "text-[#0EA5E9]" : "text-gray-500")}>
              {isAvailable ? "Available for orders" : "Paused"}
            </p>
            <p className="text-xs text-gray-400 mt-0.5">
              {isAvailable ? "Clients can place new orders" : "Hidden from browse"}
            </p>
          </div>

          <button
            onClick={toggle}
            disabled={saving || !kycApproved}
            title={!kycApproved ? "Complete KYC first" : undefined}
            className={cn(
              "relative w-11 h-6 rounded-full transition-colors duration-200 shrink-0 disabled:opacity-40",
              isAvailable ? "bg-[#0EA5E9]" : "bg-gray-300"
            )}
          >
            {saving
              ? <Loader2 className="absolute inset-0 m-auto w-3.5 h-3.5 text-white animate-spin" />
              : <span className={cn(
                "absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-transform duration-200",
                isAvailable ? "translate-x-5" : "translate-x-0"
              )} />
            }
          </button>
        </div>

        {!kycApproved && (
          <p className="text-xs text-amber-600 mt-2">Complete KYC to toggle availability.</p>
        )}
      </div>
    </div>
  );
}
