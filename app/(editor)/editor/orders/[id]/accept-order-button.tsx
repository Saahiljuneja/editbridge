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
import { CheckCircle2, Loader2, Check, Calendar, ShieldAlert } from "lucide-react";
import Link from "next/link";

interface AcceptOrderButtonProps {
  orderId: string;
  deliveryDays?: number | null;
  revisionCount?: number | null;
  packageTitle?: string | null;
  canAccept?: boolean;
  blockReason?: string;
}

function computeDeadline(deliveryDays: number): string {
  const d = new Date(Date.now() + deliveryDays * 24 * 60 * 60 * 1000);
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" });
}

export function AcceptOrderButton({
  orderId,
  deliveryDays,
  revisionCount,
  packageTitle,
  canAccept = true,
  blockReason,
}: AcceptOrderButtonProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const deadlineStr = deliveryDays != null ? computeDeadline(deliveryDays) : null;
  const revisionLabel =
    revisionCount === -1 ? "unlimited revisions" :
    revisionCount === 1 ? "1 revision" :
    revisionCount != null ? `${revisionCount} revisions` : null;

  async function handleAccept() {
    setSubmitting(true);
    try {
      const res = await fetch(`/api/orders/${orderId}/accept`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ note: note.trim() || undefined }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        toast.error(typeof err.error === "string" ? err.error : "Failed to accept order.");
        return;
      }
      toast.success("Order accepted — you're now in progress!");
      setOpen(false);
      router.refresh();
    } catch {
      toast.error("Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  }

  // Blocked state — health is Critical or account suspended
  if (!canAccept) {
    return (
      <div className="space-y-2">
        <button
          disabled
          className="w-full py-3 rounded-xl text-sm font-semibold text-gray-400 bg-gray-100 border border-gray-200 flex items-center justify-center gap-2 cursor-not-allowed"
        >
          <ShieldAlert className="w-4 h-4" />
          Accept Order
        </button>
        {blockReason && (
          <div className="rounded-xl border border-red-100 bg-red-50 px-3 py-2.5 text-xs text-red-700 space-y-1.5">
            <p>{blockReason}</p>
            <Link
              href="/editor/account-health"
              className="inline-flex items-center gap-1 font-bold underline underline-offset-2 hover:text-red-900"
            >
              View Account Health →
            </Link>
          </div>
        )}
      </div>
    );
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="w-full py-3 rounded-xl text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 transition-colors flex items-center justify-center gap-2"
      >
        <CheckCircle2 className="w-4 h-4" />
        Accept Order
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Accept this order?</DialogTitle>
            <DialogDescription>
              {packageTitle
                ? `You are agreeing to complete "${packageTitle}" for this client.`
                : "You are agreeing to complete this order for the client."}
            </DialogDescription>
          </DialogHeader>

          {/* Commitments checklist */}
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 space-y-2">
            <p className="text-xs font-semibold text-emerald-800 uppercase tracking-wider">You are committing to:</p>
            <ul className="space-y-1.5">
              <li className="flex items-start gap-2 text-sm text-emerald-900">
                <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                Complete all requested deliverables
              </li>
              {revisionLabel && (
                <li className="flex items-start gap-2 text-sm text-emerald-900">
                  <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  Provide {revisionLabel} as specified
                </li>
              )}
              <li className="flex items-start gap-2 text-sm text-emerald-900">
                <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                Follow the client&apos;s project brief
              </li>
              {deadlineStr && (
                <li className="flex items-start gap-2 text-sm text-emerald-900">
                  <Calendar className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  Deliver by <strong className="ml-1">{deadlineStr}</strong>
                </li>
              )}
            </ul>
          </div>

          <div>
            <label className="text-xs font-semibold text-gray-600 block mb-1.5">
              Message to client <span className="font-normal text-gray-400">(optional)</span>
            </label>
            <Textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="e.g. I'll start working on this today and have a first draft ready within 48 hours…"
              className="resize-none"
              rows={3}
              maxLength={500}
            />
            <p className="text-xs text-gray-400 mt-1 text-right tabular-nums">{note.length}/500</p>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={submitting}>
              Cancel
            </Button>
            <Button
              className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2"
              onClick={handleAccept}
              disabled={submitting}
            >
              {submitting ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Accepting…</>
              ) : (
                "Confirm & Accept"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
