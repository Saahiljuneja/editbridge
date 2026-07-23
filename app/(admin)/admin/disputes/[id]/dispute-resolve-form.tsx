"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Textarea } from "@/components/ui/textarea";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

type ResolutionType = "refund" | "release" | "split";

const OPTIONS: { value: ResolutionType; label: string; description: string }[] = [
  { value: "refund", label: "Refund", description: "Full refund to client" },
  { value: "release", label: "Release", description: "Payment released to editor" },
  { value: "split", label: "Split", description: "Payment split between parties" },
];

export function DisputeResolveForm({ disputeId }: { disputeId: string }) {
  const router = useRouter();
  const [resolution, setResolution] = useState<ResolutionType | null>(null);
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!resolution) { toast.error("Select a resolution type."); return; }

    setSubmitting(true);
    try {
      const res = await fetch(`/api/admin/disputes/${disputeId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resolutionType: resolution, resolutionNote: note.trim() || undefined }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        toast.error(err.error ?? "Failed to resolve dispute.");
        return;
      }
      toast.success("Dispute resolved.");
      router.push("/admin/disputes");
      router.refresh();
    } catch {
      toast.error("Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-xl border border-border bg-white p-5 space-y-4">
      <p className="font-semibold text-sm">Resolve dispute</p>

      <div className="grid grid-cols-3 gap-2">
        {OPTIONS.map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => setResolution(opt.value)}
            className={cn(
              "py-2 px-3 rounded-lg text-sm font-medium border transition-colors text-left",
              resolution === opt.value
                ? "bg-[#0EA5E9] text-white border-[#0EA5E9]"
                : "border-border text-foreground hover:bg-muted"
            )}
          >
            <p className="font-semibold">{opt.label}</p>
            <p className={cn("text-xs mt-0.5", resolution === opt.value ? "text-white/80" : "text-muted-foreground")}>
              {opt.description}
            </p>
          </button>
        ))}
      </div>

      <div>
        <label className="text-xs font-medium text-muted-foreground block mb-1">
          Resolution note (optional)
        </label>
        <Textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Explain the resolution decision…"
          className="resize-none"
          rows={3}
          maxLength={1000}
        />
      </div>

      <button
        type="submit"
        disabled={submitting || !resolution}
        className={cn(
          buttonVariants({ size: "sm" }),
          "bg-[#0EA5E9] hover:bg-[#3d34a0]",
          (submitting || !resolution) && "opacity-50 cursor-not-allowed"
        )}
      >
        {submitting ? "Saving…" : "Confirm resolution"}
      </button>
    </form>
  );
}
