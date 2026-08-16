"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Clock, CheckCircle, Pause } from "lucide-react";
import { useRouter } from "next/navigation";

export function PayoutOverrideButton({
  payoutId,
  currentStatus,
  currentScheduledAt,
}: {
  payoutId: string;
  currentStatus: string;
  currentScheduledAt: Date | null;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState(currentStatus);
  const [scheduledAt, setScheduledAt] = useState(
    currentScheduledAt ? new Date(currentScheduledAt).toISOString().split("T")[0] : ""
  );

  async function handleSave() {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/payouts/${payoutId}/override`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status,
          scheduledPayoutAt: scheduledAt || null,
        }),
      });
      if (res.ok) {
        toast.success("Payout details updated successfully.");
        setOpen(false);
        router.refresh();
      } else {
        toast.error("Failed to update payout details.");
      }
    } catch {
      toast.error("Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="text-[10px] font-bold text-violet-650 bg-violet-50 px-2 py-1 rounded hover:bg-violet-100 transition-colors cursor-pointer"
      >
        Reschedule
      </button>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-[9999] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl border border-gray-100 p-5 w-full max-w-sm space-y-4 shadow-xl">
        <p className="font-bold text-sm text-gray-900">Manage Payout P-#{payoutId.slice(0, 8)}</p>

        <div>
          <label className="block text-[10px] font-semibold text-gray-500 mb-1">Payout Status</label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="w-full rounded-lg border border-gray-200 px-3 py-1.5 text-xs bg-white focus:outline-none"
          >
            <option value="pending">Pending</option>
            <option value="processing">Processing</option>
            <option value="completed">Completed / Settled</option>
          </select>
        </div>

        <div>
          <label className="block text-[10px] font-semibold text-gray-500 mb-1">Scheduled Release Date</label>
          <input
            type="date"
            value={scheduledAt}
            onChange={(e) => setScheduledAt(e.target.value)}
            className="w-full rounded-lg border border-gray-200 px-3 py-1.5 text-xs bg-white focus:outline-none"
          />
        </div>

        <div className="flex gap-2">
          <button
            disabled={loading}
            onClick={handleSave}
            className="px-3 py-1.5 rounded-lg bg-violet-600 hover:bg-violet-750 text-white text-xs font-bold disabled:opacity-50 cursor-pointer"
          >
            Save Payout Overrides
          </button>
          <button
            onClick={() => setOpen(false)}
            className="px-3 py-1.5 rounded-lg border border-gray-200 bg-white text-xs text-gray-650 cursor-pointer"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
