"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { RotateCcw, ArrowRight } from "lucide-react";

export function ReorderForm({
  packageId,
  orderId,
  previousBrief,
}: {
  packageId: string;
  orderId: string;
  previousBrief: string;
}) {
  const [brief, setBrief] = useState(previousBrief);
  const router = useRouter();

  function handleContinue() {
    // Store the modified brief in sessionStorage for checkout to pick up
    if (typeof window !== "undefined") {
      sessionStorage.setItem(`reorder_brief_${packageId}`, brief);
    }
    router.push(`/checkout/${packageId}?reorder=true&orderId=${orderId}`);
  }

  const changed = brief.trim() !== previousBrief.trim();

  return (
    <div className="rounded-2xl border border-gray-100 bg-white shadow-sm p-6 space-y-5">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <RotateCcw className="w-4 h-4 text-[#0EA5E9]" />
          <h2 className="font-semibold text-gray-900">Update your brief</h2>
        </div>
        <p className="text-sm text-gray-400">
          Your previous brief is pre-filled below. Edit anything that changed for this new order.
        </p>
      </div>

      <div>
        <label className="block text-xs font-semibold text-gray-700 mb-2">Project brief</label>
        <textarea
          value={brief}
          onChange={(e) => setBrief(e.target.value)}
          rows={10}
          maxLength={5000}
          placeholder="Describe your project…"
          className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm leading-relaxed focus:outline-none focus:ring-2 focus:ring-[#0EA5E9]/20 focus:border-[#0EA5E9]/50 resize-none"
        />
        <div className="flex justify-between mt-1.5">
          <p className="text-xs text-gray-400">{brief.length}/5000</p>
          {changed && (
            <p className="text-xs font-semibold text-amber-600">Brief modified</p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-3 pt-1">
        <button
          onClick={handleContinue}
          disabled={brief.trim().length < 10}
          className="flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold text-white disabled:opacity-40 transition-opacity hover:opacity-85"
          style={{ background: "#0EA5E9" }}
        >
          Continue to checkout <ArrowRight className="w-4 h-4" />
        </button>
        <button
          onClick={() => setBrief(previousBrief)}
          disabled={!changed}
          className="px-4 py-3 rounded-xl text-sm font-medium text-gray-500 hover:text-gray-800 disabled:opacity-30 transition-colors"
        >
          Reset to original
        </button>
      </div>
    </div>
  );
}
