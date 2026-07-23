"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Textarea } from "@/components/ui/textarea";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { Star } from "lucide-react";

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
    <section className="rounded-xl border border-[#0EA5E9]/30 bg-[#0EA5E9]/5 p-5">
      <h2 className="font-semibold mb-1">Leave a review</h2>
      <p className="text-sm text-muted-foreground mb-4">
        How was your experience working with {editorName}?
      </p>
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Star picker */}
        <div className="flex items-center gap-1">
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
                    : "fill-none text-muted-foreground"
                )}
              />
            </button>
          ))}
          {rating > 0 && (
            <span className="text-sm text-muted-foreground ml-2">
              {["", "Poor", "Fair", "Good", "Great", "Excellent"][rating]}
            </span>
          )}
        </div>

        <Textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Share your experience (optional)…"
          className="resize-none"
          rows={3}
          maxLength={1000}
        />

        <button
          type="submit"
          disabled={submitting || rating === 0}
          className={cn(
            buttonVariants({ size: "sm" }),
            "bg-[#0EA5E9] hover:bg-[#3d34a0]",
            (submitting || rating === 0) && "opacity-50 cursor-not-allowed"
          )}
        >
          {submitting ? "Submitting…" : "Submit review"}
        </button>
      </form>
    </section>
  );
}
