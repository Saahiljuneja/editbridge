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
    <div className="bg-white rounded-3xl border border-gray-150 shadow-xl shadow-gray-100/5 overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
        {isAvailable
          ? <Zap className="w-4 h-4 text-brand-primary" />
          : <Moon className="w-4 h-4 text-neutral-400" />}
        <span className="font-extrabold text-neutral-900 text-xs uppercase tracking-wider">Availability</span>
      </div>

      <div className="p-5">
        <div className={cn(
          "flex items-center justify-between rounded-2xl border px-4 py-3 transition-colors",
          isAvailable ? "border-brand-primary/20 bg-blue-50/30" : "border-gray-200 bg-gray-50/50"
        )}>
          <div>
            <p className={cn("text-xs font-bold uppercase tracking-wider", isAvailable ? "text-brand-primary" : "text-neutral-500")}>
              {isAvailable ? "Active" : "Paused"}
            </p>
            <p className="text-[11px] text-neutral-400 mt-0.5 font-semibold">
              {isAvailable ? "Open for new orders" : "Hidden from browse"}
            </p>
          </div>

          <button
            onClick={toggle}
            disabled={saving || !kycApproved}
            title={!kycApproved ? "Complete KYC first" : undefined}
            className={cn(
              "relative w-11 h-6 rounded-full transition-colors duration-200 shrink-0 disabled:opacity-40",
              isAvailable ? "bg-brand-primary" : "bg-gray-300"
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

        <p className="text-[11px] text-neutral-450 font-medium leading-relaxed mt-3">
          This switch controls your profile status. When **Active**, clients can find you and purchase packages. When **Paused**, you are temporarily hidden.
        </p>

        {!kycApproved && (
          <p className="text-xs text-amber-600 font-bold mt-2.5">Complete KYC to toggle availability.</p>
        )}
      </div>
    </div>
  );
}
