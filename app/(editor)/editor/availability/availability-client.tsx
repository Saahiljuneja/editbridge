"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { CheckCircle2, XCircle, Zap, Moon, AlertTriangle, CalendarRange, X } from "lucide-react";
import { cn } from "@/lib/utils";

export function AvailabilityClient({
  editorId,
  isAvailable: initial,
  kycStatus,
  vacationUntil: initialVacation,
}: {
  editorId: string;
  isAvailable: boolean;
  kycStatus: string;
  vacationUntil: string | null;
}) {
  const router = useRouter();
  const [isAvailable, setIsAvailable] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [vacationDate, setVacationDate] = useState<string>(
    initialVacation ? initialVacation.slice(0, 10) : ""
  );
  const [savingVacation, setSavingVacation] = useState(false);

  const activeVacation = initialVacation && new Date(initialVacation) > new Date()
    ? initialVacation.slice(0, 10)
    : null;

  async function toggle(newValue: boolean) {
    setSaving(true);
    try {
      const res = await fetch("/api/editor/availability", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isAvailable: newValue }),
      });
      if (res.ok) {
        setIsAvailable(newValue);
        toast.success(newValue ? "You're now available for new orders." : "You've paused new orders.");
        router.refresh();
      } else {
        toast.error("Failed to update availability.");
      }
    } catch { toast.error("Something went wrong."); }
    finally { setSaving(false); }
  }

  async function setVacation() {
    if (!vacationDate) return;
    setSavingVacation(true);
    try {
      const res = await fetch("/api/editor/availability", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ vacationUntil: new Date(vacationDate).toISOString() }),
      });
      if (res.ok) {
        toast.success("Vacation mode set — you'll auto-return on " + vacationDate);
        router.refresh();
      } else {
        toast.error("Failed to set vacation.");
      }
    } catch { toast.error("Something went wrong."); }
    finally { setSavingVacation(false); }
  }

  async function clearVacation() {
    setSavingVacation(true);
    try {
      const res = await fetch("/api/editor/availability", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ vacationUntil: null }),
      });
      if (res.ok) {
        setVacationDate("");
        toast.success("Vacation cleared — you're available again.");
        router.refresh();
      } else {
        toast.error("Failed to clear vacation.");
      }
    } catch { toast.error("Something went wrong."); }
    finally { setSavingVacation(false); }
  }

  const kycNotApproved = kycStatus !== "approved";

  return (
    <div className="space-y-5">
      {kycNotApproved && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 flex items-start gap-3">
          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <p className="text-sm text-amber-800">Your KYC is not yet approved. You won't receive orders until it's complete.</p>
        </div>
      )}

      {/* Status card */}
      <div className={cn(
        "rounded-2xl border-2 p-6 transition-colors",
        isAvailable ? "border-[#0EA5E9]/30 bg-[#0EA5E9]/5" : "border-gray-200 bg-gray-50"
      )}>
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className={cn(
              "w-12 h-12 rounded-2xl flex items-center justify-center shrink-0",
              isAvailable ? "bg-[#0EA5E9]" : "bg-gray-200"
            )}>
              {isAvailable
                ? <Zap className="w-6 h-6 text-white" />
                : <Moon className="w-6 h-6 text-gray-500" />
              }
            </div>
            <div>
              <p className="font-bold text-gray-900 text-lg">
                {isAvailable ? "Available for orders" : "Paused"}
              </p>
              <p className="text-sm text-gray-500 mt-0.5">
                {isAvailable
                  ? "Clients can discover your profile and place new orders."
                  : "Your profile is hidden from browse. Existing orders are unaffected."}
              </p>
            </div>
          </div>

          {/* Big toggle */}
          <button
            onClick={() => toggle(!isAvailable)}
            disabled={saving}
            className={cn(
              "relative w-14 h-7 rounded-full transition-colors duration-200 shrink-0 disabled:opacity-50 flex-none",
              isAvailable ? "bg-[#0EA5E9]" : "bg-gray-300"
            )}
          >
            <span className={cn(
              "absolute top-1 left-1 w-5 h-5 rounded-full bg-white shadow-sm transition-transform duration-200",
              isAvailable ? "translate-x-7" : "translate-x-0"
            )} />
          </button>
        </div>
      </div>

      {/* Two option cards */}
      <div className="grid grid-cols-2 gap-4">
        <button
          onClick={() => !isAvailable && !saving && toggle(true)}
          className={cn(
            "rounded-2xl border p-5 text-left transition-all",
            isAvailable
              ? "border-[#0EA5E9]/30 bg-[#0EA5E9]/5 ring-2 ring-[#0EA5E9]/20"
              : "border-gray-200 bg-white hover:border-[#0EA5E9]/20 hover:bg-[#0EA5E9]/5"
          )}
        >
          <CheckCircle2 className={cn("w-6 h-6 mb-3", isAvailable ? "text-[#0EA5E9]" : "text-gray-400")} />
          <p className="font-semibold text-gray-900 text-sm">Available</p>
          <p className="text-xs text-gray-500 mt-1 leading-relaxed">
            Profile visible in browse. Clients can place orders.
          </p>
        </button>
        <button
          onClick={() => isAvailable && !saving && toggle(false)}
          className={cn(
            "rounded-2xl border p-5 text-left transition-all",
            !isAvailable
              ? "border-gray-400 bg-gray-100 ring-2 ring-gray-300"
              : "border-gray-200 bg-white hover:border-gray-400 hover:bg-gray-50"
          )}
        >
          <Moon className={cn("w-6 h-6 mb-3", !isAvailable ? "text-gray-600" : "text-gray-400")} />
          <p className="font-semibold text-gray-900 text-sm">Paused</p>
          <p className="text-xs text-gray-500 mt-1 leading-relaxed">
            Hidden from browse. Good for holidays or overload.
          </p>
        </button>
      </div>

      {/* Vacation mode */}
      <div className="rounded-2xl border border-gray-100 bg-white shadow-sm p-5 space-y-3">
        <div className="flex items-center gap-2 mb-1">
          <CalendarRange className="w-4 h-4 text-amber-500" />
          <p className="font-semibold text-gray-900 text-sm">Vacation mode</p>
        </div>
        <p className="text-xs text-gray-500 leading-relaxed">
          Set a return date — you'll be marked away and automatically made available again when it arrives.
        </p>

        {activeVacation && (
          <div className="flex items-center gap-2 rounded-xl bg-amber-50 border border-amber-100 px-3 py-2">
            <CalendarRange className="w-3.5 h-3.5 text-amber-500 shrink-0" />
            <p className="text-xs text-amber-700 font-medium flex-1">Away until {activeVacation}</p>
            <button
              onClick={clearVacation}
              disabled={savingVacation}
              className="text-amber-500 hover:text-amber-700 disabled:opacity-40 transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        <div className="flex items-center gap-2">
          <input
            type="date"
            value={vacationDate}
            min={new Date().toISOString().slice(0, 10)}
            onChange={(e) => setVacationDate(e.target.value)}
            className="flex-1 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#0EA5E9]/30"
          />
          <button
            onClick={setVacation}
            disabled={!vacationDate || savingVacation}
            className="shrink-0 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-semibold px-4 py-2 disabled:opacity-40 transition-colors"
          >
            {savingVacation ? "Saving…" : "Set"}
          </button>
        </div>
      </div>

      {/* What's affected */}
      <div className="rounded-2xl border border-gray-100 bg-white shadow-sm p-5 space-y-3">
        <p className="font-semibold text-gray-900 text-sm">What pausing affects</p>
        {[
          { label: "New orders from clients", paused: true },
          { label: "Your profile in browse / search", paused: true },
          { label: "Existing active orders", paused: false },
          { label: "Messages with current clients", paused: false },
          { label: "Payouts and reviews", paused: false },
        ].map(({ label, paused }) => (
          <div key={label} className="flex items-center gap-3">
            <div className={cn("w-5 h-5 rounded-full flex items-center justify-center shrink-0", paused ? "bg-red-50" : "bg-green-50")}>
              {paused
                ? <XCircle className="w-3.5 h-3.5 text-red-500" />
                : <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
              }
            </div>
            <p className="text-sm text-gray-700">{label}</p>
            <span className={cn("text-xs font-medium ml-auto", paused ? "text-red-500" : "text-green-600")}>
              {paused ? "Paused" : "Unaffected"}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
