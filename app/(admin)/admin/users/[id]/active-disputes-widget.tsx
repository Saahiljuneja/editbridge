"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Scale, Check, AlertCircle } from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils";

type DisputeItem = {
  id: string;
  orderId: string;
  reason: string;
  evidenceText: string | null;
  status: string;
  createdAt: Date;
  orderAmount: number;
};

export function ActiveDisputesWidget({
  disputes: initialDisputes,
}: {
  disputes: DisputeItem[];
}) {
  const [disputes, setDisputes] = useState<DisputeItem[]>(initialDisputes);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [openResolveId, setOpenResolveId] = useState<string | null>(null);
  const [resolutionType, setResolutionType] = useState<"refund" | "release" | "split">("refund");
  const [resolutionNote, setResolutionNote] = useState("");

  async function handleResolve(disputeId: string) {
    setLoadingId(disputeId);
    try {
      const res = await fetch(`/api/admin/disputes/${disputeId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "resolve",
          resolutionType,
          resolutionNote: resolutionNote || `Resolved by admin override`,
        }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        toast.error(d.error ?? "Failed to resolve dispute");
        return;
      }
      toast.success("Dispute resolved successfully.");
      setDisputes((prev) => prev.filter((d) => d.id !== disputeId));
      setOpenResolveId(null);
      setResolutionNote("");
    } catch {
      toast.error("Something went wrong");
    } finally {
      setLoadingId(null);
    }
  }

  if (disputes.length === 0) {
    return null;
  }

  return (
    <div className="rounded-xl border border-red-200 bg-red-50/10 p-5 mb-6 space-y-4">
      <div className="flex items-center gap-2 border-b border-red-100 pb-2">
        <Scale className="w-5 h-5 text-red-500" />
        <h3 className="font-semibold text-sm text-red-900">Active Disputes Alert ({disputes.length})</h3>
      </div>
      
      <div className="space-y-4">
        {disputes.map((disp) => (
          <div key={disp.id} className="bg-white border border-red-100 rounded-xl p-4 space-y-3 shadow-sm">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-bold text-gray-900">Dispute Reason: {disp.reason}</p>
                <p className="text-[10px] text-gray-400 mt-0.5">Opened {formatDate(disp.createdAt)} · Order Amount: <span className="font-semibold">{formatCurrency(disp.orderAmount)}</span></p>
                {disp.evidenceText && (
                  <p className="text-[11px] text-gray-650 bg-gray-50 p-2.5 rounded-lg border border-gray-100 italic leading-relaxed mt-2">
                    "{disp.evidenceText}"
                  </p>
                )}
              </div>
              <span className="text-[9px] font-bold text-red-700 bg-red-50 px-2 py-0.5 rounded-full uppercase border border-red-200">
                {disp.status}
              </span>
            </div>

            {openResolveId === disp.id ? (
              <div className="rounded-lg p-3 border border-neutral-100 bg-neutral-50/50 space-y-3">
                <p className="text-xs font-bold text-gray-800">Choose Resolution Outcome</p>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { val: "refund", label: "Refund Client" },
                    { val: "release", label: "Release Editor" },
                    { val: "split", label: "50-50 Split" },
                  ].map((opt) => (
                    <button
                      key={opt.val}
                      type="button"
                      onClick={() => setResolutionType(opt.val as typeof resolutionType)}
                      className={`px-2 py-1.5 rounded-lg border text-center text-[10px] font-bold transition-colors cursor-pointer ${
                        resolutionType === opt.val
                          ? "bg-violet-650 text-white border-violet-650"
                          : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50"
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>

                <div>
                  <label className="block text-[9px] font-semibold text-gray-500 mb-1">Resolution Note / Reason</label>
                  <input
                    type="text"
                    value={resolutionNote}
                    onChange={(e) => setResolutionNote(e.target.value)}
                    placeholder="Enter resolution notes here..."
                    className="w-full rounded-lg border border-gray-200 px-3 py-1.5 text-xs bg-white focus:outline-none"
                  />
                </div>

                <div className="flex gap-2">
                  <button
                    disabled={loadingId === disp.id}
                    onClick={() => handleResolve(disp.id)}
                    className="px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-750 text-white text-xs font-bold disabled:opacity-50 transition-colors flex items-center gap-1 cursor-pointer"
                  >
                    <Check className="w-3.5 h-3.5" /> Confirm Resolve
                  </button>
                  <button
                    onClick={() => setOpenResolveId(null)}
                    className="px-3 py-1.5 rounded-lg border border-gray-200 bg-white text-xs text-gray-650 hover:bg-gray-50 transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setOpenResolveId(disp.id)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-red-200 bg-red-50 text-red-700 text-xs font-semibold hover:bg-red-100 transition-colors cursor-pointer"
              >
                <AlertCircle className="w-3.5 h-3.5" /> Resolve Dispute
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
