"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Percent } from "lucide-react";

export function CustomRatesForm({
  userId,
  isEditor,
  isClient,
  initialCommission,
  initialProcessingFee,
}: {
  userId: string;
  isEditor: boolean;
  isClient: boolean;
  initialCommission: number | null;
  initialProcessingFee: number | null;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [commission, setCommission] = useState(initialCommission?.toString() ?? "");
  const [processingFee, setProcessingFee] = useState(initialProcessingFee?.toString() ?? "");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch(`/api/admin/users/${userId}/custom-rates`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customCommissionRate: isEditor ? (commission.trim() === "" ? null : Number(commission)) : undefined,
          customProcessingFeeRate: isClient ? (processingFee.trim() === "" ? null : Number(processingFee)) : undefined,
        }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        toast.error(d.error ?? "Failed to save overrides.");
        return;
      }
      toast.success("Custom rate overrides updated successfully.");
      setOpen(false);
      router.refresh();
    } catch {
      toast.error("Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium border border-gray-200 text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer"
      >
        <Percent className="w-4 h-4 text-violet-500" /> Custom Rates Override
      </button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-2xl border border-violet-100 bg-violet-50 p-5 space-y-4 w-full">
      <p className="font-semibold text-sm text-gray-900">Override Commission & Processing Fees</p>
      <p className="text-xs text-gray-500">Leave field empty to clear the custom override and fallback to platform defaults.</p>
      
      <div className="grid sm:grid-cols-2 gap-4">
        {isEditor && (
          <div>
            <label className="block text-xs font-semibold text-gray-705 mb-1">Editor Commission Rate (%)</label>
            <input
              type="number"
              min={0}
              max={100}
              value={commission}
              onChange={(e) => setCommission(e.target.value)}
              placeholder="Default is membership tier"
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-violet-300"
            />
          </div>
        )}
        
        {isClient && (
          <div>
            <label className="block text-xs font-semibold text-gray-705 mb-1">Client Processing Fee (%)</label>
            <input
              type="number"
              min={0}
              max={100}
              value={processingFee}
              onChange={(e) => setProcessingFee(e.target.value)}
              placeholder="Default is 10%"
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-violet-300"
            />
          </div>
        )}
      </div>

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={submitting}
          className="px-4 py-2 rounded-lg bg-violet-600 hover:bg-violet-700 text-white text-sm font-medium disabled:opacity-50 transition-colors cursor-pointer"
        >
          {submitting ? "Saving…" : "Apply Overrides"}
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="px-4 py-2 rounded-lg border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 transition-colors cursor-pointer"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
