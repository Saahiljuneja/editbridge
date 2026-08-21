"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Star, Loader2, SendHorizonal } from "lucide-react";
import { cn } from "@/lib/utils";

const RATING_LABELS = ["", "Poor", "Fair", "Good", "Great", "Excellent"];

interface ReviewFormProps {
  orderId: string;
  editorName: string;
}

export function ReviewForm({ orderId, editorName }: ReviewFormProps) {
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
      toast.success("Review submitted — thank you!");
      router.refresh();
    } catch {
      toast.error("Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="rounded-xl border border-blue-200 bg-blue-50 p-5">
      <div className="flex items-center gap-2 mb-1">
        <div className="w-7 h-7 rounded-lg bg-[#1e40af]/10 flex items-center justify-center shrink-0">
          <Star className="w-3.5 h-3.5 text-[#1e40af]" />
        </div>
        <h2 className="font-semibold text-gray-900">Leave a review</h2>
      </div>
      <p className="text-sm text-gray-500 mb-4 ml-9">
        How was your experience working with {editorName}?
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Star picker */}
        <div className="flex items-center gap-1.5">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              type="button"
              onClick={() => setRating(star)}
              onMouseEnter={() => setHovered(star)}
              onMouseLeave={() => setHovered(0)}
              aria-label={`${star} star`}
              className="p-0.5 transition-transform hover:scale-110"
            >
              <Star
                className={cn(
                  "w-7 h-7 transition-colors",
                  (hovered || rating) >= star
                    ? "fill-amber-400 text-amber-400"
                    : "fill-none text-gray-300"
                )}
              />
            </button>
          ))}
          {rating > 0 && (
            <span className="text-sm font-medium text-amber-700 ml-1">
              {RATING_LABELS[rating]}
            </span>
          )}
        </div>

        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Share your experience (optional)…"
          className="w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[#1e40af]/20 focus:border-[#1e40af]/50 placeholder:text-gray-400"
          rows={3}
          maxLength={1000}
        />

        <button
          type="submit"
          disabled={submitting || rating === 0}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-[#0EA5E9] hover:bg-sky-600 transition-colors disabled:opacity-50"
        >
          {submitting ? (
            <><Loader2 className="w-4 h-4 animate-spin" /> Submitting…</>
          ) : (
            <><SendHorizonal className="w-4 h-4" /> Submit review</>
          )}
        </button>
      </form>
    </section>
  );
}
