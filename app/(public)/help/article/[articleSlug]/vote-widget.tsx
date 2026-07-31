"use client";

import { useState } from "react";
import { ThumbsUp, ThumbsDown, CheckCircle } from "lucide-react";

export function VoteWidget({ articleId }: { articleId: string }) {
  const [voted, setVoted] = useState<"helpful" | "unhelpful" | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleVote(vote: "helpful" | "unhelpful") {
    if (voted || submitting) return;
    setSubmitting(true);
    try {
      await fetch("/api/help/vote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ articleId, vote }),
      });
      setVoted(vote);
    } catch (err) {
      console.error("Vote failed:", err);
    } finally {
      setSubmitting(false);
    }
  }

  if (voted) {
    return (
      <div className="flex items-center gap-2 text-emerald-600 text-sm font-semibold">
        <CheckCircle className="w-4 h-4" />
        Thanks for your feedback!
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3">
      <span className="text-sm text-gray-500 font-medium">Was this article helpful?</span>
      <button
        onClick={() => handleVote("helpful")}
        disabled={submitting}
        className="inline-flex items-center gap-1.5 text-sm font-semibold text-emerald-600 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-2 hover:bg-emerald-100 transition-colors disabled:opacity-50"
      >
        <ThumbsUp className="w-3.5 h-3.5" /> Yes
      </button>
      <button
        onClick={() => handleVote("unhelpful")}
        disabled={submitting}
        className="inline-flex items-center gap-1.5 text-sm font-semibold text-gray-500 bg-gray-50 border border-gray-200 rounded-xl px-4 py-2 hover:bg-gray-100 transition-colors disabled:opacity-50"
      >
        <ThumbsDown className="w-3.5 h-3.5" /> No
      </button>
    </div>
  );
}
