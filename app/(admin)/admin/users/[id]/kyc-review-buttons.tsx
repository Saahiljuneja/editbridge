"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Check, X, AlertCircle } from "lucide-react";
import { useRouter } from "next/navigation";

export function KycReviewButtons({ applicationId }: { applicationId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [rejecting, setRejecting] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");

  async function handleAction(action: "approve" | "reject") {
    if (action === "reject" && rejectionReason.trim().length < 10) {
      toast.error("Rejection reason must be at least 10 characters long.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/kyc/${applicationId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          rejectionReason: action === "reject" ? rejectionReason : undefined,
        }),
      });
      if (res.ok) {
        toast.success(`KYC status marked ${action === "approve" ? "Approved" : "Rejected"} successfully.`);
        setRejecting(false);
        setRejectionReason("");
        router.refresh();
      } else {
        const d = await res.json().catch(() => ({}));
        toast.error(d.error || "Failed to update KYC status.");
      }
    } catch {
      toast.error("Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  if (rejecting) {
    return (
      <div className="rounded-lg p-3 border border-red-100 bg-red-50/50 space-y-3 w-full">
        <p className="text-xs font-bold text-red-900 flex items-center gap-1">
          <AlertCircle className="w-4 h-4" /> Reject KYC Application
        </p>
        <div>
          <label className="block text-[10px] font-semibold text-gray-500 mb-1">Reason for Rejection (min 10 chars)</label>
          <input
            type="text"
            value={rejectionReason}
            onChange={(e) => setRejectionReason(e.target.value)}
            required
            placeholder="e.g. Aadhaar details are blurry"
            className="w-full rounded-lg border border-gray-200 px-3 py-1.5 text-xs bg-white focus:outline-none"
          />
        </div>
        <div className="flex gap-2">
          <button
            disabled={loading}
            onClick={() => handleAction("reject")}
            className="px-3 py-1.5 rounded-lg bg-red-650 hover:bg-red-750 text-white text-xs font-bold disabled:opacity-50 cursor-pointer"
          >
            Confirm Rejection
          </button>
          <button
            onClick={() => setRejecting(false)}
            className="px-3 py-1.5 rounded-lg border border-gray-200 bg-white text-xs text-gray-650 cursor-pointer"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex gap-2">
      <button
        disabled={loading}
        onClick={() => handleAction("approve")}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold disabled:opacity-50 transition-colors cursor-pointer"
      >
        <Check className="w-3.5 h-3.5" /> Approve KYC
      </button>
      <button
        disabled={loading}
        onClick={() => setRejecting(true)}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-red-200 bg-red-50 text-red-700 text-xs font-semibold hover:bg-red-100 transition-colors disabled:opacity-50 cursor-pointer"
      >
        <X className="w-3.5 h-3.5" /> Reject KYC
      </button>
    </div>
  );
}
