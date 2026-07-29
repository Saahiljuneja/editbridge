"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { Gavel, AlertTriangle } from "lucide-react";

type ResolutionType = "refund" | "release" | "split";

const OPTIONS: {
  value: ResolutionType;
  label: string;
  description: string;
  bg: string;
  activeBg: string;
  icon: string;
}[] = [
  {
    value: "refund",
    label: "Full Refund",
    description: "Return full amount to client. Editor receives nothing.",
    bg: "border-red-200 bg-red-50 hover:bg-red-100",
    activeBg: "border-red-500 bg-red-500 text-white",
    icon: "↩",
  },
  {
    value: "release",
    label: "Release to Editor",
    description: "Release escrow to editor after commission deduction.",
    bg: "border-green-200 bg-green-50 hover:bg-green-100",
    activeBg: "border-green-600 bg-green-600 text-white",
    icon: "✓",
  },
  {
    value: "split",
    label: "Split Payment",
    description: "Split escrow 50/50. Manual Razorpay action required.",
    bg: "border-amber-200 bg-amber-50 hover:bg-amber-100",
    activeBg: "border-amber-600 bg-amber-600 text-white",
    icon: "⇄",
  },
];

export function DisputeResolveForm({ disputeId }: { disputeId: string }) {
  const router = useRouter();
  const [resolution, setResolution] = useState<ResolutionType | null>(null);
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!resolution) { toast.error("Select a resolution type."); return; }
    if (!showConfirm) { setShowConfirm(true); return; }

    setSubmitting(true);
    try {
      const res = await fetch(`/api/admin/disputes/${disputeId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resolutionType: resolution, resolutionNote: note.trim() || undefined }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        toast.error(err.error ?? "Failed to resolve dispute.");
        return;
      }
      toast.success("Dispute resolved and payment action triggered.");
      router.push("/admin/disputes");
      router.refresh();
    } catch {
      toast.error("Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2.5">
        {OPTIONS.map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => { setResolution(opt.value); setShowConfirm(false); }}
            className={cn(
              "w-full text-left py-3 px-4 rounded-xl border-2 transition-all duration-150",
              resolution === opt.value ? opt.activeBg : opt.bg
            )}
          >
            <div className="flex items-center gap-2">
              <span className="text-base font-bold">{opt.icon}</span>
              <div>
                <p className={cn("text-sm font-bold", resolution === opt.value ? "text-white" : "text-gray-800")}>
                  {opt.label}
                </p>
                <p className={cn("text-xs mt-0.5", resolution === opt.value ? "text-white/80" : "text-gray-500")}>
                  {opt.description}
                </p>
              </div>
            </div>
          </button>
        ))}
      </div>

      <div>
        <label className="text-xs font-semibold text-gray-500 block mb-1.5">
          Resolution note <span className="font-normal text-gray-400">(optional)</span>
        </label>
        <Textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Explain the arbitration decision for the record…"
          className="resize-none text-sm"
          rows={3}
          maxLength={1000}
        />
      </div>

      {showConfirm && resolution && (
        <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-xl p-3">
          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <p className="text-xs text-amber-800">
            <span className="font-bold">Confirm:</span> This will trigger automatic payment processing (
            {resolution === "refund" ? "Razorpay refund initiated" :
             resolution === "release" ? "payout scheduled for editor" :
             "manual Razorpay split required"}). This cannot be undone by staff.
          </p>
        </div>
      )}

      <button
        type="submit"
        disabled={submitting || !resolution}
        className={cn(
          "w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl font-bold text-sm transition-all",
          resolution && !submitting
            ? "bg-gray-900 text-white hover:bg-gray-800 active:scale-[0.98]"
            : "bg-gray-100 text-gray-400 cursor-not-allowed"
        )}
      >
        <Gavel className="w-4 h-4" />
        {submitting ? "Processing ruling…" : showConfirm ? "Confirm & Execute Ruling" : "Review Ruling"}
      </button>
    </form>
  );
}
