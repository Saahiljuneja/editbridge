"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { RotateCcw } from "lucide-react";

export function DisputeReopenForm({ disputeId }: { disputeId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleReopen() {
    setSubmitting(true);
    try {
      const res = await fetch(`/api/admin/disputes/${disputeId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "reopen", reason: reason.trim() || undefined }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        toast.error(err.error ?? "Failed to reopen dispute.");
        return;
      }
      toast.success("Dispute reopened.");
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
        className="flex items-center gap-2 px-4 py-2 rounded-xl border border-amber-200 bg-amber-50 text-amber-700 text-sm font-medium hover:bg-amber-100 transition-colors"
      >
        <RotateCcw className="w-4 h-4" />
        Reopen dispute
      </button>
    );
  }

  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50 p-5 space-y-3">
      <p className="font-semibold text-sm text-amber-900">Reopen this dispute</p>
      <p className="text-xs text-amber-700">
        This will set the dispute back to open and mark the order as disputed. Existing payments are not reversed — you will need to resolve again with the correct outcome.
      </p>
      <textarea
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        placeholder="Reason for reopening (optional)…"
        rows={2}
        maxLength={500}
        className="w-full rounded-lg border border-amber-200 bg-white px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-amber-300"
      />
      <div className="flex gap-2">
        <button
          onClick={handleReopen}
          disabled={submitting}
          className="px-4 py-2 rounded-lg bg-amber-600 text-white text-sm font-medium hover:bg-amber-700 disabled:opacity-50 transition-colors"
        >
          {submitting ? "Reopening…" : "Confirm reopen"}
        </button>
        <button
          onClick={() => { setOpen(false); setReason(""); }}
          className="px-4 py-2 rounded-lg border border-amber-200 bg-white text-sm text-amber-700 hover:bg-amber-50 transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
