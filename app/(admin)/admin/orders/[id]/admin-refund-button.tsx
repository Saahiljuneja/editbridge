"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { AlertTriangle, RefreshCcw, X } from "lucide-react";

export function AdminRefundButton({ orderId, status }: { orderId: string; status: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (status === "cancelled") return null;

  async function handleRefund() {
    setSubmitting(true);
    try {
      const res = await fetch(`/api/admin/orders/${orderId}/refund`, { method: "POST" });
      if (res.ok) {
        toast.success("Order refunded and cancelled.");
        setOpen(false);
        router.refresh();
      } else {
        const d = await res.json().catch(() => ({}));
        toast.error(d.error ?? "Refund failed.");
      }
    } catch {
      toast.error("Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 text-xs font-semibold text-red-600 border border-red-200 bg-red-50 hover:bg-red-100 px-3 py-2 rounded-lg transition-colors mt-2"
      >
        <RefreshCcw className="w-3.5 h-3.5" /> Issue Refund
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl border border-red-100 w-full max-w-md p-6 space-y-5">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center">
                  <AlertTriangle className="w-5 h-5 text-red-600" />
                </div>
                <div>
                  <p className="font-bold text-gray-900">Issue full refund?</p>
                  <p className="text-xs text-gray-400 mt-0.5">This will cancel the order and refund the client in store credit.</p>
                </div>
              </div>
              <button onClick={() => setOpen(false)} className="p-1 rounded-lg hover:bg-gray-100 text-gray-400">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="rounded-xl bg-amber-50 border border-amber-100 px-4 py-3 text-xs text-amber-800 space-y-1">
              <p className="font-semibold">What will happen:</p>
              <ul className="list-disc list-inside space-y-0.5 text-amber-700">
                <li>Order status set to <strong>cancelled</strong></li>
                <li>Full payment refunded to client&apos;s wallet as store credits</li>
                <li>Any pending editor payouts for this order will be deleted</li>
                <li>Action logged to audit trail</li>
              </ul>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-gray-700">Internal note (optional)</label>
              <input
                value={note}
                onChange={e => setNote(e.target.value)}
                placeholder="Reason for manual refund…"
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-red-200"
              />
            </div>

            <div className="flex gap-2 pt-1">
              <button
                onClick={handleRefund}
                disabled={submitting}
                className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-sm font-bold transition-colors disabled:opacity-50"
              >
                {submitting ? "Processing…" : "Confirm Refund"}
              </button>
              <button
                onClick={() => setOpen(false)}
                className="px-5 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
