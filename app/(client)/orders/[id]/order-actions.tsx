"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { buttonVariants } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { CheckCircle, RotateCcw, XCircle, AlertTriangle } from "lucide-react";
import { ConfirmDialog } from "@/components/common/confirm-dialog";

const CANCEL_REASONS = [
  "Changed my mind",
  "Found a better editor",
  "Editor hasn't accepted yet — taking too long",
  "Brief was wrong — need to start fresh",
  "Budget constraints",
  "Other",
];

interface OrderActionsProps {
  orderId: string;
  status: string;
  latestDeliveryId?: string;
  revisionsUsed: number;
  revisionLimit: number; // -1 = unlimited
  revisionExtensionDays?: number;
}

export function OrderActions({
  orderId,
  status,
  latestDeliveryId,
  revisionsUsed,
  revisionLimit,
  revisionExtensionDays = 2,
}: OrderActionsProps) {
  const router = useRouter();
  const [showRevisionForm, setShowRevisionForm] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [loading, setLoading] = useState<string | null>(null);
  const [confirmApproveOpen, setConfirmApproveOpen] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [cancelNote, setCancelNote] = useState("");

  const revisionsLeft = revisionLimit === -1 ? Infinity : revisionLimit - revisionsUsed;
  const canRevise = status === "delivered" && revisionsLeft > 0;

  async function handleApprove() {
    setLoading("approve");
    try {
      const res = await fetch(`/api/orders/${orderId}/approve`, { method: "POST" });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        toast.error(err.error ?? "Failed to approve delivery.");
        return;
      }
      toast.success("Delivery approved! Payment will be released to the editor.");
      router.refresh();
    } catch {
      toast.error("Something went wrong.");
    } finally {
      setLoading(null);
    }
  }

  async function handleRevision() {
    if (feedback.trim().length < 10) {
      toast.error("Please provide at least 10 characters of feedback.");
      return;
    }
    setLoading("revision");
    try {
      const res = await fetch(`/api/orders/${orderId}/revision`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ feedbackText: feedback.trim(), deliveryId: latestDeliveryId }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        toast.error(err.error ?? "Failed to request revision.");
        return;
      }
      toast.success("Revision requested. The editor will be notified.");
      setShowRevisionForm(false);
      setFeedback("");
      router.refresh();
    } catch {
      toast.error("Something went wrong.");
    } finally {
      setLoading(null);
    }
  }

  async function handleCancel() {
    if (!cancelReason) { toast.error("Please select a reason."); return; }
    setLoading("cancel");
    try {
      const res = await fetch(`/api/orders/${orderId}/cancel`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: cancelReason, note: cancelNote.trim() }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        toast.error(err.error ?? "Failed to cancel order.");
        return;
      }
      toast.success("Order cancelled. A full refund will be processed within 5–7 days.");
      setShowCancelModal(false);
      router.refresh();
    } catch {
      toast.error("Something went wrong.");
    } finally {
      setLoading(null);
    }
  }

  if (status === "completed" || status === "cancelled" || status === "disputed") {
    return null;
  }

  return (
    <div className="space-y-4">
      {status === "delivered" && (
        <div className="rounded-xl border border-border p-5 space-y-4">
          <h2 className="font-semibold">Review delivery</h2>

          {!showRevisionForm ? (
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={() => setConfirmApproveOpen(true)}
                disabled={loading === "approve"}
                className={cn(
                  buttonVariants({ size: "sm" }),
                  "bg-green-600 hover:bg-green-700 gap-2",
                  loading === "approve" && "opacity-50 cursor-not-allowed"
                )}
              >
                <CheckCircle className="w-4 h-4" />
                {loading === "approve" ? "Approving…" : "Approve & release payment"}
              </button>
              <ConfirmDialog
                open={confirmApproveOpen}
                onOpenChange={setConfirmApproveOpen}
                title="Approve this delivery?"
                description="Payment will be released to the editor immediately. This cannot be undone — only approve if you're happy with the work."
                confirmLabel="Yes, approve & release"
                onConfirm={() => { setConfirmApproveOpen(false); handleApprove(); }}
                isLoading={loading === "approve"}
              />

              {canRevise && (
                <button
                  onClick={() => setShowRevisionForm(true)}
                  className={cn(buttonVariants({ variant: "outline", size: "sm" }), "gap-2")}
                >
                  <RotateCcw className="w-4 h-4" />
                  Request revision
                  {revisionLimit !== -1 && (
                    <span className="text-xs text-muted-foreground ml-1">
                      ({revisionsLeft} left)
                    </span>
                  )}
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {revisionExtensionDays > 0 && (
                <p className="text-xs text-muted-foreground">
                  Requesting a revision will automatically extend the deadline by {revisionExtensionDays} day{revisionExtensionDays !== 1 ? "s" : ""}.
                </p>
              )}
              <div className="space-y-1.5">
                <Label htmlFor="feedback">What needs to be changed?</Label>
                <Textarea
                  id="feedback"
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  placeholder="Please describe the changes needed in detail…"
                  className="min-h-[100px]"
                  maxLength={2000}
                />
                <p className="text-xs text-muted-foreground">{feedback.length}/2000</p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleRevision}
                  disabled={loading === "revision"}
                  className={cn(
                    buttonVariants({ size: "sm" }),
                    "bg-amber-600 hover:bg-amber-700",
                    loading === "revision" && "opacity-50 cursor-not-allowed"
                  )}
                >
                  {loading === "revision" ? "Submitting…" : "Submit revision request"}
                </button>
                <button
                  onClick={() => { setShowRevisionForm(false); setFeedback(""); }}
                  className={cn(buttonVariants({ variant: "ghost", size: "sm" }))}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {status === "pending" && (
        <div className="flex justify-end">
          <button
            onClick={() => setShowCancelModal(true)}
            className={cn(
              buttonVariants({ variant: "outline", size: "sm" }),
              "text-red-600 border-red-200 hover:bg-red-50 gap-2"
            )}
          >
            <XCircle className="w-4 h-4" />
            Cancel order
          </button>
        </div>
      )}

      {/* Cancel modal */}
      {showCancelModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
          onClick={(e) => { if (e.target === e.currentTarget) setShowCancelModal(false); }}>
          <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden">
            <div className="flex items-center gap-3 px-6 py-5 border-b border-gray-100">
              <div className="w-8 h-8 rounded-lg bg-red-100 flex items-center justify-center">
                <AlertTriangle className="w-4 h-4 text-red-600" />
              </div>
              <div>
                <p className="font-bold text-gray-900">Cancel this order?</p>
                <p className="text-xs text-gray-400 mt-0.5">This action cannot be undone</p>
              </div>
            </div>

            <div className="px-6 py-5 space-y-4">
              <div className="rounded-lg bg-emerald-50 border border-emerald-100 px-4 py-3 text-xs text-emerald-800">
                Since this order is pending (not yet accepted), you&apos;ll receive a <strong>full refund</strong> processed within 5–7 business days.
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-2">Reason for cancelling</label>
                <div className="space-y-1.5">
                  {CANCEL_REASONS.map((r) => (
                    <label key={r} className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 hover:bg-gray-50 cursor-pointer transition-colors has-[:checked]:border-[#0EA5E9]/40 has-[:checked]:bg-sky-50/50">
                      <input type="radio" name="cancel_reason" value={r}
                        checked={cancelReason === r}
                        onChange={() => setCancelReason(r)}
                        className="accent-[#0EA5E9]" />
                      <span className="text-sm text-gray-700">{r}</span>
                    </label>
                  ))}
                </div>
              </div>

              {cancelReason && (
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">Additional notes (optional)</label>
                  <textarea
                    value={cancelNote}
                    onChange={(e) => setCancelNote(e.target.value)}
                    maxLength={500}
                    rows={3}
                    placeholder="Any further details…"
                    className="w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#0EA5E9]/20 resize-none"
                  />
                </div>
              )}
            </div>

            <div className="flex gap-3 px-6 py-4 border-t border-gray-100">
              <button onClick={handleCancel} disabled={!cancelReason || loading === "cancel"}
                className={cn(
                  "flex-1 py-2.5 rounded-xl text-sm font-semibold text-white bg-red-600 hover:bg-red-700 transition-colors disabled:opacity-40",
                )}>
                {loading === "cancel" ? "Cancelling…" : "Yes, cancel order"}
              </button>
              <button onClick={() => { setShowCancelModal(false); setCancelReason(""); setCancelNote(""); }}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 transition-colors">
                Keep order
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
