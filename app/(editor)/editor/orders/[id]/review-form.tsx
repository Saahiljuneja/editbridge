"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { Star, Loader2 } from "lucide-react";

interface EditorReviewFormProps {
  orderId: string;
  clientName: string;
}

const RATING_LABELS = ["", "Poor", "Fair", "Good", "Great", "Excellent"];

export function EditorReviewForm({ orderId, clientName }: EditorReviewFormProps) {
  const router = useRouter();
  const [rating, setRating] = useState(0);
  const [hovered, setHovered] = useState(0);
  const [text, setText] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (rating === 0) { toast.error("Please select a star rating."); return; }

    setSubmitting(true);
    try {
      const res = await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId, rating, text: text.trim() || undefined }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        toast.error(err.error ?? "Failed to submit review.");
        return;
      }
      toast.success("Review submitted!");
      router.refresh();
    } catch {
      toast.error("Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="rounded-xl border border-gray-100 bg-white shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-50 flex items-center gap-2">
        <div className="w-7 h-7 rounded-lg bg-amber-50 flex items-center justify-center shrink-0">
          <Star className="w-4 h-4 text-amber-500" />
        </div>
        <div>
          <h2 className="font-semibold text-gray-900">Review client</h2>
          <p className="text-xs text-gray-400">How was it working with {clientName}?</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="px-5 py-4 space-y-4">
        {/* Star rating */}
        <div className="flex items-center gap-0.5">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              type="button"
              onClick={() => setRating(star)}
              onMouseEnter={() => setHovered(star)}
              onMouseLeave={() => setHovered(0)}
              aria-label={`${star} star`}
              className="p-1 transition-transform hover:scale-110"
            >
              <Star
                className={cn(
                  "w-7 h-7 transition-colors",
                  (hovered || rating) >= star
                    ? "fill-amber-400 text-amber-400"
                    : "fill-none text-gray-200"
                )}
              />
            </button>
          ))}
          {rating > 0 && (
            <span className="text-sm font-medium text-amber-600 ml-2">
              {RATING_LABELS[rating]}
            </span>
          )}
        </div>

        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={`Notes about working with ${clientName} (optional)…`}
          className="w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm min-h-[90px] resize-none focus:outline-none focus:ring-2 focus:ring-[#1e40af]/20 focus:border-[#1e40af]/50 placeholder:text-gray-400"
          maxLength={1000}
        />

        <button
          type="submit"
          disabled={submitting || rating === 0}
          className="px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-[#1e40af] hover:bg-brand-primary transition-colors disabled:opacity-50 flex items-center gap-2"
        >
          {submitting ? (
            <><Loader2 className="w-4 h-4 animate-spin" /> Submitting…</>
          ) : (
            "Submit review"
          )}
        </button>
      </form>
    </section>
  );
}
