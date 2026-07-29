"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { cn, formatDate } from "@/lib/utils";
import { Clock, Check, X, Hourglass } from "lucide-react";

type ExtensionStatus = "pending" | "approved" | "rejected" | null;

interface ExtensionPanelProps {
  orderId: string;
  viewerRole: "editor" | "client";
  extensionRequestedAt: Date | string | null;
  extensionReason: string | null;
  extensionDays: number | null;
  extensionStatus: ExtensionStatus;
}

const DAY_OPTIONS = [1, 2, 3, 4, 5, 6, 7];

export function ExtensionPanel({
  orderId,
  viewerRole,
  extensionRequestedAt,
  extensionReason,
  extensionDays,
  extensionStatus,
}: ExtensionPanelProps) {
  const router = useRouter();
  const [showForm, setShowForm] = useState(false);
  const [days, setDays] = useState(2);
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const hasRequest = !!extensionRequestedAt;

  async function submitRequest() {
    if (reason.trim().length < 10) {
      toast.error("Please explain why you need more time (at least 10 characters).");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(`/api/orders/${orderId}/extension`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ extensionDays: days, reason: reason.trim() }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? "Failed to request extension");
      }
      toast.success("Extension requested — the client has been notified.");
      setShowForm(false);
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to request extension");
    } finally {
      setSubmitting(false);
    }
  }

  async function decide(decision: "approved" | "rejected") {
    setSubmitting(true);
    try {
      const res = await fetch(`/api/orders/${orderId}/extension`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ decision }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? "Failed to record decision");
      }
      toast.success(decision === "approved" ? "Extension approved." : "Extension rejected.");
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to record decision");
    } finally {
      setSubmitting(false);
    }
  }

  // ── Editor view ──────────────────────────────────────────────────────────
  if (viewerRole === "editor") {
    if (!hasRequest) {
      return (
        <section className="rounded-xl border border-border p-5">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="font-semibold flex items-center gap-2">
                <Clock className="w-4 h-4 text-muted-foreground" /> Need more time?
              </h2>
              <p className="text-sm text-muted-foreground mt-1">
                Request a one-time deadline extension (up to 7 days). The client must approve it.
              </p>
            </div>
            {!showForm && (
              <button
                onClick={() => setShowForm(true)}
                className="shrink-0 px-4 py-2 rounded-xl border border-border text-sm font-medium hover:bg-muted/50 transition-colors"
              >
                Request extension
              </button>
            )}
          </div>

          {showForm && (
            <div className="mt-4 space-y-3 border-t border-border pt-4">
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  Extra days needed
                </label>
                <div className="flex gap-1.5 mt-1.5">
                  {DAY_OPTIONS.map((d) => (
                    <button
                      key={d}
                      onClick={() => setDays(d)}
                      className={cn(
                        "w-9 h-9 rounded-lg text-sm font-semibold border transition-colors",
                        days === d
                          ? "bg-[var(--brand-editor)] border-[var(--brand-editor)] text-white"
                          : "border-border text-muted-foreground hover:border-[var(--brand-editor)]/40"
                      )}
                    >
                      {d}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  Reason for the client
                </label>
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  rows={3}
                  maxLength={500}
                  placeholder="e.g. The project scope grew after your last revision request, and I want to make sure the final cut is polished."
                  className="mt-1.5 w-full text-sm px-3 py-2.5 rounded-xl border border-border outline-none focus:ring-2 focus:ring-[var(--brand-editor)]/20 resize-none"
                />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={submitRequest}
                  disabled={submitting}
                  className="px-4 py-2 rounded-xl bg-[var(--brand-editor)] text-white text-sm font-semibold hover:bg-[var(--brand-editor-hover)] transition-colors disabled:opacity-50"
                >
                  {submitting ? "Sending…" : "Send request"}
                </button>
                <button
                  onClick={() => setShowForm(false)}
                  className="px-4 py-2 rounded-xl border border-border text-sm font-medium hover:bg-muted/50 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </section>
      );
    }

    // Already requested — show status, no button (one per order)
    return (
      <section className={cn(
        "rounded-xl border p-5",
        extensionStatus === "approved" ? "border-green-200 bg-green-50" :
        extensionStatus === "rejected" ? "border-red-200 bg-red-50" :
        "border-amber-200 bg-amber-50"
      )}>
        <div className="flex items-start gap-3">
          {extensionStatus === "approved" ? <Check className="w-4 h-4 text-green-600 shrink-0 mt-0.5" /> :
           extensionStatus === "rejected" ? <X className="w-4 h-4 text-red-600 shrink-0 mt-0.5" /> :
           <Hourglass className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />}
          <div>
            <p className={cn(
              "text-sm font-semibold",
              extensionStatus === "approved" ? "text-green-800" :
              extensionStatus === "rejected" ? "text-red-800" : "text-amber-800"
            )}>
              {extensionStatus === "approved" && `Extension approved — deadline extended by ${extensionDays} day${extensionDays !== 1 ? "s" : ""}`}
              {extensionStatus === "rejected" && "Extension request rejected — original deadline stands"}
              {extensionStatus === "pending" && `Extension requested — awaiting client response (${extensionDays} day${extensionDays !== 1 ? "s" : ""})`}
            </p>
            {extensionReason && (
              <p className="text-xs text-muted-foreground mt-1 italic">&quot;{extensionReason}&quot;</p>
            )}
            {extensionRequestedAt && (
              <p className="text-xs text-muted-foreground mt-1">Requested {formatDate(extensionRequestedAt)}</p>
            )}
          </div>
        </div>
      </section>
    );
  }

  // ── Client view — only rendered by the page when extensionStatus === "pending" ──
  return (
    <section className="rounded-xl border border-amber-200 bg-amber-50 p-5">
      <div className="flex items-start gap-3">
        <Hourglass className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
        <div className="flex-1">
          <p className="text-sm font-semibold text-amber-900">
            Editor requested {extensionDays} extra day{extensionDays !== 1 ? "s" : ""}
          </p>
          {extensionReason && (
            <p className="text-sm text-amber-800 mt-1.5 leading-relaxed">&quot;{extensionReason}&quot;</p>
          )}
          <div className="flex gap-2 mt-3">
            <button
              onClick={() => decide("approved")}
              disabled={submitting}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-green-600 text-white text-sm font-semibold hover:bg-green-700 transition-colors disabled:opacity-50"
            >
              <Check className="w-3.5 h-3.5" /> Approve
            </button>
            <button
              onClick={() => decide("rejected")}
              disabled={submitting}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-amber-300 text-amber-800 text-sm font-semibold hover:bg-amber-100 transition-colors disabled:opacity-50"
            >
              <X className="w-3.5 h-3.5" /> Reject
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
