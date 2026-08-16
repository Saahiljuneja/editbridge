"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { RefreshCw } from "lucide-react";

export function ResetKycButton({ editorId }: { editorId: string }) {
  const router = useRouter();
  const [confirm, setConfirm] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function handleReset() {
    setSubmitting(true);
    try {
      const res = await fetch(`/api/admin/editors/${editorId}/reset-kyc`, {
        method: "POST",
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        toast.error(d.error ?? "Failed.");
        return;
      }
      toast.success("KYC reset to pending. Editor can re-apply.");
      setConfirm(false);
      router.refresh();
    } catch {
      toast.error("Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  }

  if (!confirm) {
    return (
      <button
        onClick={() => setConfirm(true)}
        className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium border border-gray-200 text-gray-700 hover:bg-gray-50 transition-colors"
      >
        <RefreshCw className="w-4 h-4 text-orange-500" /> Reset KYC
      </button>
    );
  }

  return (
    <div className="rounded-2xl border border-orange-100 bg-orange-50 p-5 space-y-3">
      <p className="font-semibold text-sm text-gray-900">Reset KYC to pending?</p>
      <p className="text-xs text-gray-500">
        This clears the current KYC status and allows the editor to re-submit their documents. Their profile will become unlisted until KYC is re-approved.
      </p>
      <div className="flex gap-2">
        <button
          onClick={handleReset}
          disabled={submitting}
          className="px-4 py-2 rounded-lg bg-orange-500 hover:bg-orange-600 text-white text-sm font-medium disabled:opacity-50 transition-colors"
        >
          {submitting ? "Resetting…" : "Yes, reset KYC"}
        </button>
        <button
          onClick={() => setConfirm(false)}
          className="px-4 py-2 rounded-lg border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
