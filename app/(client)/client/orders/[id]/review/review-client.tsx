"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Star, CheckCircle } from "lucide-react";
import { cn } from "@/lib/utils";

const LABELS = ["", "Poor", "Fair", "Good", "Great", "Excellent"];

interface Props {
  orderId: string;
  editorName: string;
  editorInitials: string;
  editorImage: string | null;
  packageTitle: string;
  alreadyReviewed: boolean;
}

export function ReviewClient({
  orderId,
  editorName,
  editorInitials,
  editorImage,
  packageTitle,
  alreadyReviewed,
}: Props) {
  const router = useRouter();
  const [rating, setRating]       = useState(0);
  const [hovered, setHovered]     = useState(0);
  const [text, setText]           = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(alreadyReviewed);

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
      setSubmitted(true);
      toast.success("Review submitted — thank you!");
    } catch {
      toast.error("Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  }

  if (submitted && !alreadyReviewed) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center px-6">
        <div className="w-16 h-16 rounded-2xl bg-emerald-100 flex items-center justify-center mb-5">
          <CheckCircle className="w-8 h-8 text-emerald-600" />
        </div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">Review submitted!</h2>
        <p className="text-sm text-gray-500 mb-8 max-w-xs">
          Thank you for reviewing your experience with {editorName}. Your feedback helps other clients.
        </p>
        <button
          onClick={() => router.push(`/orders/${orderId}`)}
          className="px-6 py-2.5 rounded-xl text-sm font-semibold text-white bg-[var(--brand-client)] hover:bg-[var(--brand-client-hover)] transition-colors"
        >
          Back to order
        </button>
      </div>
    );
  }

  if (submitted && alreadyReviewed) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center px-6">
        <div className="w-16 h-16 rounded-2xl bg-sky-100 flex items-center justify-center mb-5">
          <CheckCircle className="w-8 h-8 text-[var(--brand-client)]" />
        </div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">Already reviewed</h2>
        <p className="text-sm text-gray-500 mb-8 max-w-xs">
          You have already submitted a review for this order.
        </p>
        <button
          onClick={() => router.push(`/orders/${orderId}`)}
          className="px-6 py-2.5 rounded-xl text-sm font-semibold text-white bg-[var(--brand-client)] hover:bg-[var(--brand-client-hover)] transition-colors"
        >
          Back to order
        </button>
      </div>
    );
  }

  const active = hovered || rating;

  return (
    <div className="max-w-lg mx-auto px-6 py-10 space-y-6">

      {/* Editor card */}
      <div className="rounded-2xl border border-gray-100 bg-white shadow-sm p-6 flex items-center gap-4">
        <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-[var(--brand-client)] to-[#6366F1] flex items-center justify-center shrink-0 overflow-hidden">
          {editorImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={editorImage} alt={editorName} className="w-full h-full object-cover" />
          ) : (
            <span className="text-white font-bold text-lg">{editorInitials}</span>
          )}
        </div>
        <div>
          <p className="font-semibold text-gray-900">{editorName}</p>
          <p className="text-xs text-gray-400 mt-0.5 truncate max-w-[260px]">{packageTitle}</p>
        </div>
      </div>

      {/* Form */}
      <div className="rounded-2xl border border-gray-100 bg-white shadow-sm p-6">
        <h2 className="font-semibold text-gray-900 mb-1">How was your experience?</h2>
        <p className="text-sm text-gray-400 mb-6">
          Your review helps other clients choose the right editor.
        </p>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Stars */}
          <div className="space-y-2">
            <p className="text-xs font-medium text-gray-600">Rating</p>
            <div className="flex items-center gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(star)}
                  onMouseEnter={() => setHovered(star)}
                  onMouseLeave={() => setHovered(0)}
                  aria-label={`${star} star${star !== 1 ? "s" : ""}`}
                  className="transition-transform hover:scale-110 active:scale-95"
                >
                  <Star
                    className={cn(
                      "w-9 h-9 transition-colors",
                      active >= star ? "fill-amber-400 text-amber-400" : "fill-none text-gray-200"
                    )}
                  />
                </button>
              ))}
              {active > 0 && (
                <span className="text-sm font-medium text-amber-600 ml-1">
                  {LABELS[active]}
                </span>
              )}
            </div>
          </div>

          {/* Text */}
          <div className="space-y-2">
            <label className="text-xs font-medium text-gray-600">
              Your review <span className="text-gray-400 font-normal">(optional)</span>
            </label>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="What did you love? What could be better?"
              maxLength={1000}
              rows={4}
              className="w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[var(--brand-client)]/20 focus:border-[var(--brand-client)]/50 placeholder:text-gray-400"
            />
            <p className="text-[11px] text-gray-400 text-right">{text.length}/1000</p>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="submit"
              disabled={submitting || rating === 0}
              className="flex-1 py-3 rounded-xl text-sm font-semibold text-white bg-[var(--brand-client)] hover:bg-[var(--brand-client-hover)] disabled:opacity-50 transition-colors"
            >
              {submitting ? "Submitting…" : "Submit review"}
            </button>
            <button
              type="button"
              onClick={() => router.push(`/orders/${orderId}`)}
              className="px-5 py-3 rounded-xl text-sm font-medium text-gray-500 hover:text-gray-700 hover:bg-gray-50 transition-colors border border-gray-200"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
