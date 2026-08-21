"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { XCircle, Loader2 } from "lucide-react";

const DECLINE_REASONS = [
  "I'm unavailable",
  "Deadline doesn't work",
  "Project isn't a good fit",
  "Price doesn't work for me",
  "Client requirements are unclear",
  "Other",
] as const;

type DeclineReason = (typeof DECLINE_REASONS)[number];

export function DeclineOrderButton({ orderId }: { orderId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<DeclineReason | null>(null);
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleDecline() {
    if (!reason) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/orders/${orderId}/decline`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason, note: note.trim() || undefined }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        toast.error(typeof err.error === "string" ? err.error : "Failed to decline order.");
        return;
      }
      toast.success("Order declined. The client's refund has been initiated.");
      setOpen(false);
      router.refresh();
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
        className="w-full py-2.5 rounded-xl text-sm font-semibold text-red-600 border border-red-200 bg-red-50 hover:bg-red-100 transition-colors flex items-center justify-center gap-2"
      >
        <XCircle className="w-4 h-4" />
        Decline Order
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Why are you declining this order?</DialogTitle>
            <DialogDescription>
              The client won&apos;t see your specific reason — they&apos;ll simply be told the order was cancelled and their refund initiated.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2">
            {DECLINE_REASONS.map((r) => (
              <label
                key={r}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl border cursor-pointer transition-colors select-none"
                style={{
                  borderColor: reason === r ? "#dc2626" : "#e5e7eb",
                  backgroundColor: reason === r ? "#fef2f2" : "transparent",
                }}
              >
                <input
                  type="radio"
                  name="decline-reason"
                  value={r}
                  checked={reason === r}
                  onChange={() => setReason(r)}
                  className="accent-red-600"
                />
                <span className="text-sm text-gray-700">{r}</span>
              </label>
            ))}
          </div>

          <div>
            <label className="text-xs font-semibold text-gray-600 block mb-1.5">
              Additional note <span className="font-normal text-gray-400">(optional, for our records)</span>
            </label>
            <Textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Anything you'd like to add…"
              className="resize-none"
              rows={2}
              maxLength={500}
            />
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={submitting}>
              Go back
            </Button>
            <Button
              variant="destructive"
              onClick={handleDecline}
              disabled={!reason || submitting}
              className="gap-2"
            >
              {submitting ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Declining…</>
              ) : (
                "Decline Order"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
