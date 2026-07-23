"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";

export function RemoveReviewButton({ reviewId }: { reviewId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleClick() {
    if (!confirm("Remove this review? This cannot be undone.")) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/reviews/${reviewId}`, { method: "DELETE" });
      if (res.ok) { toast.success("Review removed."); router.refresh(); }
      else toast.error("Failed to remove review.");
    } catch { toast.error("Something went wrong."); }
    finally { setLoading(false); }
  }

  return (
    <button onClick={handleClick} disabled={loading}
      className="flex items-center gap-1 text-xs font-semibold text-red-500 hover:text-red-700 disabled:opacity-50 transition-colors">
      <Trash2 className="w-3.5 h-3.5" />
      {loading ? "…" : "Remove"}
    </button>
  );
}
