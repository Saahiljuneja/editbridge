"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";

export function DeleteCommentButton({ commentId }: { commentId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function del() {
    if (!confirm("Permanently delete this comment?")) return;
    setLoading(true);
    const res = await fetch("/api/portfolio/comment", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ commentId }),
    });
    if (res.ok) {
      toast.success("Comment deleted");
      router.refresh();
    } else {
      toast.error("Failed to delete comment");
      setLoading(false);
    }
  }

  return (
    <button
      onClick={del}
      disabled={loading}
      className="text-xs text-red-400 hover:text-red-600 disabled:opacity-40 transition-colors flex items-center gap-1"
    >
      <Trash2 className="w-3 h-3" />
      {loading ? "…" : "Delete"}
    </button>
  );
}
