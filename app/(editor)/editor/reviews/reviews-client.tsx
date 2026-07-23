"use client";

import { useState } from "react";
import { Star, MessageSquare, Send, ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface Review {
  id: string;
  rating: number;
  text: string | null;
  replyText: string | null;
  createdAt: string;
  reviewerName: string;
  reviewerImage: string | null;
  packageTitle: string | null;
  orderId: string;
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 30) return `${days} days ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months} month${months !== 1 ? "s" : ""} ago`;
  return `${Math.floor(months / 12)} year${Math.floor(months / 12) !== 1 ? "s" : ""} ago`;
}

function ReviewCard({ review }: { review: Review }) {
  const [replyText, setReplyText] = useState(review.replyText ?? "");
  const [savedReply, setSavedReply] = useState(review.replyText);
  const [showReplyBox, setShowReplyBox] = useState(false);
  const [saving, setSaving] = useState(false);

  async function submitReply() {
    if (!replyText.trim()) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/reviews/${review.id}/reply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ replyText: replyText.trim() }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        toast.error(err.error ?? "Failed to save reply.");
        return;
      }
      setSavedReply(replyText.trim());
      setShowReplyBox(false);
      toast.success("Reply saved.");
    } catch {
      toast.error("Something went wrong.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
      {/* Reviewer + rating */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-[#0EA5E9]/10 flex items-center justify-center text-sm font-bold text-[#0EA5E9] shrink-0">
            {review.reviewerName.slice(0, 1).toUpperCase()}
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-900">{review.reviewerName}</p>
            <p className="text-xs text-gray-400">{review.packageTitle ?? "Custom order"} · {timeAgo(review.createdAt)}</p>
          </div>
        </div>
        <div className="flex items-center gap-0.5 shrink-0">
          {Array.from({ length: 5 }).map((_, i) => (
            <Star
              key={i}
              className={cn("w-4 h-4", i < review.rating ? "fill-amber-400 text-amber-400" : "text-gray-200")}
            />
          ))}
        </div>
      </div>

      {/* Review text */}
      {review.text && (
        <p className="text-sm text-gray-700 leading-relaxed">{review.text}</p>
      )}

      {/* Existing reply */}
      {savedReply && (
        <div className="bg-gray-50 rounded-xl border border-gray-100 px-4 py-3">
          <p className="text-xs font-semibold text-gray-500 mb-1">Your reply</p>
          <p className="text-sm text-gray-700 leading-relaxed">{savedReply}</p>
          {!showReplyBox && (
            <button
              onClick={() => { setShowReplyBox(true); setReplyText(savedReply); }}
              className="text-xs text-[#0EA5E9] font-medium mt-2 hover:underline"
            >
              Edit reply
            </button>
          )}
        </div>
      )}

      {/* Reply box */}
      {showReplyBox ? (
        <div className="space-y-2">
          <textarea
            value={replyText}
            onChange={(e) => setReplyText(e.target.value)}
            placeholder="Write a professional reply…"
            rows={3}
            maxLength={500}
            className="w-full px-3 py-2.5 text-sm rounded-xl border border-gray-200 focus:outline-none focus:border-[#0EA5E9] focus:ring-2 focus:ring-[#0EA5E9]/10 resize-none"
          />
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-400">{replyText.length}/500</span>
            <div className="flex gap-2">
              <button
                onClick={() => { setShowReplyBox(false); setReplyText(savedReply ?? ""); }}
                className="text-xs text-gray-500 px-3 py-1.5 rounded-lg border border-gray-200 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={submitReply}
                disabled={saving || !replyText.trim()}
                className={cn(
                  "flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg text-white bg-[#0EA5E9] hover:bg-[#0a5a45] transition-colors",
                  (saving || !replyText.trim()) && "opacity-50 cursor-not-allowed"
                )}
              >
                <Send className="w-3 h-3" />
                {saving ? "Saving…" : "Save reply"}
              </button>
            </div>
          </div>
        </div>
      ) : !savedReply && (
        <button
          onClick={() => setShowReplyBox(true)}
          className="flex items-center gap-1.5 text-xs font-medium text-gray-500 hover:text-[#0EA5E9] transition-colors"
        >
          <MessageSquare className="w-3.5 h-3.5" />
          Reply to this review
        </button>
      )}
    </div>
  );
}

export function ReviewsClient({ reviews }: { reviews: Review[] }) {
  return (
    <div className="space-y-4">
      {reviews.map((r) => (
        <ReviewCard key={r.id} review={r} />
      ))}
    </div>
  );
}
