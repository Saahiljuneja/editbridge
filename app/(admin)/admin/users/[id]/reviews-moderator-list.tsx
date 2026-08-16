"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Star, Trash2 } from "lucide-react";
import { formatDate } from "@/lib/utils";

type ReviewItem = {
  id: string;
  orderId: string;
  rating: number;
  text: string | null;
  createdAt: Date;
  reviewerName: string | null;
  reviewerEmail: string | null;
  role: "client" | "editor";
};

export function ReviewsModeratorList({
  reviews: initialReviews,
}: {
  reviews: ReviewItem[];
}) {
  const [reviews, setReviews] = useState<ReviewItem[]>(initialReviews);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function handleDelete(id: string) {
    if (!confirm("Are you sure you want to permanently delete this review? This action cannot be undone.")) return;
    setDeletingId(id);
    try {
      const res = await fetch(`/api/admin/reviews/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        toast.error("Failed to delete review");
        return;
      }
      setReviews((prev) => prev.filter((r) => r.id !== id));
      toast.success("Review deleted successfully.");
    } catch {
      toast.error("Something went wrong");
    } finally {
      setDeletingId(null);
    }
  }

  if (reviews.length === 0) {
    return null;
  }

  return (
    <div className="rounded-xl border border-border bg-white p-5 mb-6">
      <p className="font-semibold text-sm mb-3">Review & Rating Moderation ({reviews.length})</p>
      <div className="space-y-3">
        {reviews.map((rev) => (
          <div key={rev.id} className="p-3 border border-neutral-100 rounded-xl bg-neutral-50/10 hover:bg-neutral-50/30 transition-colors flex items-start justify-between gap-4">
            <div className="space-y-1.5 flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                <span className="text-xs font-bold text-gray-900">{rev.reviewerName || rev.reviewerEmail}</span>
                <span className="text-[10px] text-gray-400">({rev.role === "client" ? "Reviewing Editor" : "Reviewing Client"})</span>
                <span className="text-[10px] text-gray-450">{formatDate(rev.createdAt)}</span>
              </div>
              <div className="flex items-center gap-0.5">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star key={i} className={`w-3.5 h-3.5 ${i < rev.rating ? "text-amber-500 fill-amber-500" : "text-gray-200"}`} />
                ))}
              </div>
              <p className="text-xs text-gray-700 leading-normal italic">
                "{rev.text || "No comments written."}"
              </p>
              <p className="text-[9px] text-gray-400 font-mono">Linked Order: #{rev.orderId.slice(0, 8)}</p>
            </div>
            <button
              disabled={deletingId === rev.id}
              onClick={() => handleDelete(rev.id)}
              title="Delete Review"
              className="p-1.5 rounded-lg border border-red-200 bg-red-50 text-red-650 hover:bg-red-105 transition-colors disabled:opacity-50 flex items-center justify-center shrink-0 cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
