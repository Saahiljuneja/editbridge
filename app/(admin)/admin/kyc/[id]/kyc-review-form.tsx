"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Textarea } from "@/components/ui/textarea";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const REJECTION_REASONS = [
  "Image is blurry or unreadable — please upload a clearer photo.",
  "Document corners are cropped — all four corners must be fully visible.",
  "Name on document doesn't match your profile name.",
  "PAN number on the card doesn't match the number you entered.",
  "Aadhaar number on the card doesn't match the number you entered.",
  "Document appears to be expired.",
  "Selfie is missing or doesn't clearly show the document alongside your face.",
  "Wrong document type submitted — please upload the correct document.",
  "Other",
] as const;

export function KycReviewForm({
  applicationId,
  editorId,
}: {
  applicationId: string;
  editorId: string;
}) {
  const router = useRouter();
  const [action, setAction] = useState<"approve" | "reject" | null>(null);
  const [selectedReason, setSelectedReason] = useState("");
  const [extraNotes, setExtraNotes] = useState("");
  const [adminNotes, setAdminNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const rejectionReason =
    selectedReason === "Other"
      ? extraNotes.trim()
      : selectedReason
      ? selectedReason + (extraNotes.trim() ? ` ${extraNotes.trim()}` : "")
      : "";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!action) return;
    if (action === "reject" && rejectionReason.length < 10) {
      toast.error("Please select a rejection reason.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(`/api/admin/kyc/${applicationId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, rejectionReason: rejectionReason || undefined, adminNotes: adminNotes.trim() || undefined }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        toast.error(err.error ?? "Failed to update KYC.");
        return;
      }
      toast.success(action === "approve" ? "KYC approved!" : "KYC rejected.");
      router.push("/admin/kyc");
      router.refresh();
    } catch {
      toast.error("Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-xl border border-border bg-white p-5 space-y-4">
      <p className="font-semibold text-sm">Review decision</p>

      <div className="flex gap-3">
        <button
          type="button"
          onClick={() => setAction("approve")}
          className={cn(
            "flex-1 py-2 rounded-lg text-sm font-medium border transition-colors",
            action === "approve"
              ? "bg-green-600 text-white border-green-600"
              : "border-green-300 text-green-700 hover:bg-green-50"
          )}
        >
          Approve
        </button>
        <button
          type="button"
          onClick={() => setAction("reject")}
          className={cn(
            "flex-1 py-2 rounded-lg text-sm font-medium border transition-colors",
            action === "reject"
              ? "bg-red-600 text-white border-red-600"
              : "border-red-300 text-red-700 hover:bg-red-50"
          )}
        >
          Reject
        </button>
      </div>

      {action === "reject" && (
        <div className="space-y-3">
          <div>
            <label className="text-xs font-medium text-muted-foreground block mb-1.5">
              Rejection reason <span className="text-red-500">*</span>
            </label>
            <div className="space-y-1.5">
              {REJECTION_REASONS.map((reason) => (
                <label
                  key={reason}
                  className={cn(
                    "flex items-start gap-2.5 rounded-lg border px-3 py-2.5 cursor-pointer transition-colors text-sm",
                    selectedReason === reason
                      ? "border-red-300 bg-red-50 text-red-800"
                      : "border-gray-200 hover:bg-gray-50 text-gray-700"
                  )}
                >
                  <input
                    type="radio"
                    name="rejectionReason"
                    value={reason}
                    checked={selectedReason === reason}
                    onChange={() => setSelectedReason(reason)}
                    className="mt-0.5 shrink-0 accent-red-600"
                  />
                  <span>{reason}</span>
                </label>
              ))}
            </div>
          </div>

          {selectedReason && (
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1">
                {selectedReason === "Other" ? "Describe the issue" : "Additional notes (optional)"}
                {selectedReason === "Other" && <span className="text-red-500"> *</span>}
              </label>
              <Textarea
                value={extraNotes}
                onChange={(e) => setExtraNotes(e.target.value)}
                placeholder={
                  selectedReason === "Other"
                    ? "Describe why the KYC was rejected…"
                    : "Add any extra context for the editor (optional)…"
                }
                className="resize-none"
                rows={2}
                maxLength={400}
              />
            </div>
          )}
        </div>
      )}

      {action && (
        <div>
          <label className="text-xs font-medium text-muted-foreground block mb-1">
            Internal notes <span className="text-gray-400">(private — not shown to editor)</span>
          </label>
          <Textarea
            value={adminNotes}
            onChange={(e) => setAdminNotes(e.target.value)}
            placeholder="Add any internal notes, flags, or observations for the team…"
            className="resize-none text-sm"
            rows={2}
            maxLength={1000}
          />
        </div>
      )}

      {action && (
        <button
          type="submit"
          disabled={submitting || (action === "reject" && !selectedReason)}
          className={cn(
            buttonVariants({ size: "sm" }),
            action === "approve" ? "bg-green-600 hover:bg-green-700" : "bg-red-600 hover:bg-red-700",
            (submitting || (action === "reject" && !selectedReason)) && "opacity-50 cursor-not-allowed"
          )}
        >
          {submitting ? "Saving…" : `Confirm ${action}`}
        </button>
      )}
    </form>
  );
}
